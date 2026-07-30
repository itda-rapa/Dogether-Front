import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Smiley, HandWaving, Play, SealCheck } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { ModerationMenu } from '@/components/ModerationMenu'
import { listSetlogs, addReaction, removeReaction, sendGreeting } from '@/features/setlog/api'
import {
  applyReaction,
  type ReactionType,
  type Setlog,
} from '@/features/setlog/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

export function HomePage() {
  const setlogs = useQuery({
    queryKey: ['setlogs'],
    queryFn: listSetlogs,
    retry: false,
    // Presigned URL 이 만료되므로 오래 캐시하지 않는다.
    staleTime: 60_000,
  })

  return (
    <Page
      title="우리 동네 셋로그"
      description="동네 강아지들의 3~5초 영상"
    >
      {setlogs.isPending && <FeedSkeleton />}

      {setlogs.isError && (
        <div className="mb-6">
          <ApiErrorNotice
            error={setlogs.error}
            title="셋로그를 불러오지 못했습니다"
            onRetry={() => void setlogs.refetch()}
          />
        </div>
      )}

      {/* API 는 성공했지만 데이터가 비어 있는 경우. 에러가 아니므로 별도로 안내한다. */}
      {setlogs.isSuccess && setlogs.data.length === 0 && (
        <EmptyState
          title="아직 올라온 셋로그가 없습니다"
          description="동네 강아지들의 영상이 올라오면 여기에 보여요."
        />
      )}

      <ul className="flex flex-col gap-4">
        {(setlogs.data ?? []).map((s) => (
          <li key={s.setlogId}>
            <SetlogCard setlog={s} live={Boolean(setlogs.data)} />
          </li>
        ))}
      </ul>
    </Page>
  )
}

function SetlogCard({ setlog, live }: { setlog: Setlog; live: boolean }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [local, setLocal] = useState(setlog)
  const [greetError, setGreetError] = useState<string | null>(null)

  // 자기 영상이거나 L1 이면 상호작용 자체가 막힌다.
  const interactive = local.canInteract !== false

  const react = useMutation({
    mutationFn: ({ type, next }: { type: ReactionType; next: boolean }) =>
      next ? addReaction(local.setlogId, type) : removeReaction(local.setlogId, type),
    onSuccess: (res) => {
      // 서버가 준 카운트를 정본으로 삼는다.
      setLocal((prev) => ({
        ...prev,
        cuteCount: res.cuteCount,
        likeCount: res.likeCount,
        myReactions: res.reacted
          ? Array.from(new Set([...prev.myReactions, res.type]))
          : prev.myReactions.filter((r) => r !== res.type),
      }))
    },
    onError: (_e, vars) => {
      // 낙관적 갱신을 되돌린다.
      setLocal((prev) => applyReaction(prev, vars.type, !vars.next))
    },
  })

  const toggle = (type: ReactionType) => {
    if (!interactive || !live) return
    const next = !local.myReactions.includes(type)
    setLocal((prev) => applyReaction(prev, type, next)) // 낙관적 갱신
    react.mutate({ type, next })
  }

  const greet = useMutation({
    mutationFn: () => sendGreeting(local.setlogId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] })
      navigate(`/chat/${res.roomId}`)
    },
    onError: (e) => setGreetError(toGreetMessage(e)),
  })

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      {/*
        aspect-ratio 를 미리 고정해 영상이 늦게 로드돼도 레이아웃이 밀리지 않게 한다.
        mediaUrl 은 Presigned URL 이라 만료되면 목록을 다시 받아야 한다.
      */}
      <div className="relative aspect-[4/5] w-full bg-muted">
        {live && local.mediaUrl ? (
          <video
            src={local.mediaUrl}
            poster={undefined}
            controls
            playsInline
            preload="metadata"
            className="size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <Play size={40} weight="fill" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 p-4">
        <div aria-hidden className="size-9 shrink-0 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{local.authorPet.nickname}</span>
            {local.authorPet.verified && (
              <SealCheck
                size={15}
                weight="fill"
                className="shrink-0 text-primary-strong"
                aria-label="인증된 펫"
              />
            )}
          </p>
          <p className="truncate text-[14px] text-muted-foreground">
            {local.authorPet.publicTag}
          </p>
        </div>

        {/* 셋로그 신고는 M1 범위가 아니라 차단만 노출된다(roomId 를 넘기지 않음). */}
        <ModerationMenu
          targetPetId={local.authorPet.petId}
          targetName={local.authorPet.nickname}
        />
      </div>

      {local.caption && <p className="px-4 pb-3">{local.caption}</p>}

      <div className="flex items-center gap-1 border-t border-border px-2 py-1">
        {/* CUTE 와 LIKE 는 배타적이지 않다. 각각 독립 토글이다. */}
        <ReactionButton
          type="CUTE"
          active={local.myReactions.includes('CUTE')}
          count={local.cuteCount}
          disabled={!interactive || !live}
          onClick={() => toggle('CUTE')}
        />
        <ReactionButton
          type="LIKE"
          active={local.myReactions.includes('LIKE')}
          count={local.likeCount}
          disabled={!interactive || !live}
          onClick={() => toggle('LIKE')}
        />

        <button
          type="button"
          onClick={() => greet.mutate()}
          disabled={!interactive || !live || greet.isPending}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-semibold text-primary-strong transition-colors hover:bg-primary-subtle disabled:opacity-50"
        >
          <HandWaving size={20} weight="fill" />
          {greet.isPending ? '보내는 중…' : '인사하기'}
        </button>
      </div>

      {greetError && (
        <p role="alert" className="px-4 pb-3 text-[14px] text-destructive">
          {greetError}
        </p>
      )}
    </article>
  )
}

function ReactionButton({
  type,
  active,
  count,
  disabled,
  onClick,
}: {
  type: ReactionType
  active: boolean
  count: number
  disabled: boolean
  onClick: () => void
}) {
  const Icon = type === 'CUTE' ? Smiley : Heart
  const label = type === 'CUTE' ? '귀여워요' : '좋아요'

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `${label} 취소` : label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 transition-colors hover:bg-primary-subtle disabled:opacity-50"
    >
      {/* 색만으로 상태를 알리지 않는다. 외곽선↔채움 형태도 함께 바뀐다. */}
      <Icon
        size={20}
        weight={active ? 'fill' : 'regular'}
        className={cn(
          'transition-colors duration-200',
          active ? 'text-like' : 'text-muted-foreground',
        )}
      />
      <span className="text-[14px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </button>
  )
}

function FeedSkeleton() {
  return (
    <ul className="flex flex-col gap-4" aria-busy="true">
      {[0, 1].map((i) => (
        <li
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="aspect-[4/5] w-full bg-muted" />
          <div className="h-16" />
        </li>
      ))}
    </ul>
  )
}

function toGreetMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return '인사를 보내지 못했습니다.'
  if (e.status === 404) return '셋로그를 찾을 수 없거나 인사할 수 없는 상대입니다.'
  if (e.status === 429) return '오늘 인사할 수 있는 인원을 모두 사용했습니다. (하루 10명)'
  if (e.status === 409) return '이미 대화 중인 상대입니다.'
  if (e.status === 403) return '대표 강아지를 지정해야 인사할 수 있습니다.'
  return '인사를 보내지 못했습니다.'
}
