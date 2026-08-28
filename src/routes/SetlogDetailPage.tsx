import { useState } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Heart, Smiley, HandWaving, SealCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { getSetlog } from '@/features/setlog/api'
import { useSetlogActions } from '@/features/setlog/useSetlogActions'
import { REACTION_LABEL, type ReactionType, type Setlog } from '@/features/setlog/types'
import { cn } from '@/lib/cn'

/**
 * 셋로그 단건 상세. 채팅의 SETLOG_SHARE 카드 `detailPath`(`/setlogs/{setlogId}`)가
 * 여기로 연결된다. 카드가 표시된 이후 삭제·비공개·차단이 생겨도 이 화면 진입
 * 시점에 서버가 권한을 다시 검증한다 — 접근 불가면 404 로 온다.
 */
export function SetlogDetailPage() {
  const { setlogId = '' } = useParams()
  const id = Number(setlogId)
  const valid = Number.isSafeInteger(id) && id > 0
  const [setlog, setSetlog] = useState<Setlog | null>(null)

  const query = useQuery({
    queryKey: ['setlog', id],
    queryFn: () => getSetlog(id),
    enabled: valid,
    retry: false,
  })

  const current = setlog ?? query.data ?? null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/" label="홈" />

      {!valid && (
        <div className="mt-6">
          <EmptyState title="존재하지 않는 셋로그입니다" />
        </div>
      )}

      {valid && query.isPending && <p className="mt-6 text-muted-foreground">불러오는 중…</p>}

      {valid && query.isError && (
        <div className="mt-6">
          <ApiErrorNotice
            error={query.error}
            title="셋로그를 찾을 수 없습니다"
            onRetry={() => void query.refetch()}
          />
        </div>
      )}

      {current && <Detail setlog={current} onChange={setSetlog} />}
    </div>
  )
}

function Detail({ setlog, onChange }: { setlog: Setlog; onChange: (next: Setlog) => void }) {
  const { interactive, toggle, greet, greetError } = useSetlogActions(setlog, onChange)

  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-2xl bg-black">
        <video
          src={setlog.mediaUrl}
          controls
          loop
          playsInline
          className="aspect-[9/16] w-full max-h-[70vh] object-contain"
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            {setlog.authorPet.nickname}
            {setlog.authorPet.verified && <SealCheck size={15} weight="fill" aria-label="인증된 펫" />}
          </p>
          {setlog.caption && <p className="mt-1 text-[14px] text-muted-foreground">{setlog.caption}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ReactionButton
            type="CUTE"
            active={setlog.myReactions.includes('CUTE')}
            count={setlog.cuteCount}
            disabled={!interactive}
            onClick={() => toggle('CUTE')}
          />
          <ReactionButton
            type="LIKE"
            active={setlog.myReactions.includes('LIKE')}
            count={setlog.likeCount}
            disabled={!interactive}
            onClick={() => toggle('LIKE')}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => greet.mutate()}
        disabled={!interactive || greet.isPending}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 font-medium transition-colors hover:bg-primary-subtle disabled:opacity-40"
      >
        <HandWaving size={20} weight="fill" />
        {greet.isPending ? '보내는 중…' : '인사하기'}
      </button>

      {greetError && (
        <p role="alert" className="mt-2 text-[14px] text-destructive">
          {greetError}
        </p>
      )}
    </div>
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
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `${REACTION_LABEL[type]} 취소` : REACTION_LABEL[type]}
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 disabled:opacity-40"
    >
      <Icon size={26} weight={active ? 'fill' : 'regular'} className={cn(active && 'text-like')} />
      <span className="text-[12px] tabular-nums text-muted-foreground">{count}</span>
    </button>
  )
}
