import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Heart, Smiley, HandWaving, SealCheck } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { ModerationMenu } from '@/components/ModerationMenu'
import { SetlogViewer } from '@/components/SetlogViewer'
import { listSetlogs } from '@/features/setlog/api'
import { useSetlogActions } from '@/features/setlog/useSetlogActions'
import { REACTION_LABEL, type ReactionType, type Setlog } from '@/features/setlog/types'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

export function HomePage() {
  const setlogs = useQuery({
    queryKey: ['setlogs'],
    queryFn: listSetlogs,
    retry: false,
    // Presigned URL 이 만료되므로 오래 캐시하지 않는다.
    staleTime: 60_000,
  })

  /*
    반응·인사로 바뀐 값은 여기 모아 둔다. 피드 카드와 전체화면 뷰어가 같은
    셋로그를 각각 그리므로, 카드에서 누른 하트가 뷰어에서도 눌려 있어야 한다.
  */
  const [overrides, setOverrides] = useState<Record<number, Setlog>>({})
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const items = (setlogs.data ?? []).map((s) => overrides[s.setlogId] ?? s)
  const update = (next: Setlog) =>
    setOverrides((prev) => ({ ...prev, [next.setlogId]: next }))

  return (
    <Page title="우리 동네 셋로그" description="동네 강아지들의 3~5초 영상">
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
      {setlogs.isSuccess && items.length === 0 && (
        <EmptyState
          title="아직 올라온 셋로그가 없습니다"
          description="동네 강아지들의 영상이 올라오면 여기에 보여요."
        />
      )}

      <ul className="flex flex-col gap-4">
        {items.map((s, i) => (
          <li key={s.setlogId}>
            <SetlogCard
              setlog={s}
              onChange={update}
              onOpen={() => setViewerIndex(i)}
            />
          </li>
        ))}
      </ul>

      {viewerIndex !== null && (
        <SetlogViewer
          items={items}
          startIndex={viewerIndex}
          onChangeItem={update}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </Page>
  )
}

function SetlogCard({
  setlog,
  onChange,
  onOpen,
}: {
  setlog: Setlog
  onChange: (next: Setlog) => void
  onOpen: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduced = usePrefersReducedMotion()
  const { interactive, toggle, greet, greetError } = useSetlogActions(
    setlog,
    onChange,
  )

  // 피드에서도 보이는 것만 재생한다. 전부 재생하면 스크롤이 버벅인다.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          v.preload = 'auto'
          if (!reduced) void v.play().catch(() => {})
        } else {
          v.pause()
          // 'none'으로 내리면 이미 읽은 메타데이터(가로세로 비율)도 날아가
          // h-auto 크기가 브라우저 기본값(150px)으로 무너진다. 'metadata'까지만 내린다.
          v.preload = 'metadata'
        }
      },
      /*
        9:16 카드는 뷰포트보다 크다. 720px 화면에서 1305px 카드면 최대
        교차 비율이 0.55 라 threshold 0.5 는 아슬아슬하고, 더 낮은 화면에서는
        아예 발화하지 않는다. 카드가 절반쯤 들어오면 재생하도록 낮춰 잡는다.
      */
      { threshold: 0.25 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [reduced])

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      {/*
        피드 카드는 16:9 가로다.
        aspect-ratio 를 미리 고정해 영상이 늦게 로드돼도 레이아웃이 밀리지 않게 한다.
        mediaUrl 은 Presigned URL 이라 만료되면 목록을 다시 받아야 한다.
      */}
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${setlog.authorPet.nickname} 셋로그 전체화면으로 보기`}
          className="relative block aspect-video w-full overflow-hidden bg-muted"
        >
          {/*
            여백 없이 9:16 박스를 항상 꽉 채운다. 원본 비율이 안 맞으면
            object-cover 가 넘치는 축을 잘라낸다(이 데모 영상은 좌우가 잘림).
          */}
          <video
            ref={videoRef}
            src={setlog.mediaUrl}
            // 자동재생은 muted 가 없으면 브라우저가 막는다.
            muted
            loop
            playsInline
            preload="metadata"
            tabIndex={-1}
            className="size-full object-cover"
          />
        </button>

        {/*
          작성자 칩은 영상 위 오버레이다. 배경 없이 완전히 투명하게 두고
          그림자로만 가독성을 확보해 영상을 가리지 않는다. 버튼(onOpen) 위에
          z-10 로 얹혀 있어서, 이 칩을 누르면 뷰어가 아니라 펫 프로필로 간다.
          공개 펫 조회 API 가 없어서 이미 들고 있는 authorPet 을 state 로 넘긴다.
        */}
        <Link
          to={`/pets/${setlog.authorPet.petId}`}
          state={{ pet: setlog.authorPet }}
          className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5"
        >
          <div
            aria-hidden
            className="size-6 shrink-0 rounded-full bg-muted [box-shadow:0_0_0_1px_rgb(0_0_0_/_0.4)]"
          />
          <div className="min-w-0 leading-tight [text-shadow:0_1px_3px_rgb(0_0_0_/_0.9),0_0_2px_rgb(0_0_0_/_0.9)]">
            <p className="flex items-center gap-1 truncate text-[13px] font-semibold text-white">
              <span className="truncate">{setlog.authorPet.nickname}</span>
              {setlog.authorPet.verified && (
                <SealCheck size={13} weight="fill" className="shrink-0" aria-label="인증된 펫" />
              )}
            </p>
            <p className="truncate text-[11px] text-white">
              {setlog.authorPet.publicTag}
            </p>
          </div>
        </Link>

        {/*
          캡션은 영상 중앙에 흰 글자로만 얹는다. 배경 박스 없이 완전히 투명하게
          두고, 그림자로만 가독성을 확보한다. pointer-events-none 이라 클릭은
          뒤의 onOpen 버튼으로 그대로 전달된다.
        */}
        {setlog.caption && (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 text-center">
            <span className="text-xl font-bold leading-relaxed text-white [text-shadow:0_1px_4px_rgb(0_0_0_/_0.9),0_0_3px_rgb(0_0_0_/_0.9)]">
              {setlog.caption}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-border px-2 py-1">
        {/* CUTE 와 LIKE 는 배타적이지 않다. 각각 독립 토글이다. */}
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

        <button
          type="button"
          onClick={() => greet.mutate()}
          disabled={!interactive || greet.isPending}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-semibold text-primary-strong transition-colors hover:bg-primary-subtle disabled:opacity-50"
        >
          <HandWaving size={20} weight="fill" />
          {greet.isPending ? '보내는 중…' : '인사하기'}
        </button>

        {/* 셋로그 신고는 M1 범위가 아니라 차단만 노출된다(roomId 를 넘기지 않음). */}
        <ModerationMenu
          targetPetId={setlog.authorPet.petId}
          targetName={setlog.authorPet.nickname}
        />
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
  const label = REACTION_LABEL[type]

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
          <div className="aspect-video w-full bg-muted" />
          <div className="h-16" />
        </li>
      ))}
    </ul>
  )
}
