import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { X, Sparkle } from '@phosphor-icons/react'
import { createCardDraft } from './api'
import { splitDraftDateTime, type CardDraft } from './types'

/**
 * 채팅 입력창 바로 위에 뜨는 AI 약속 제안.
 *
 * 서버가 여러 후보를 배열로 준다(항상 1건 이상). 가로 스크롤 레이아웃으로
 * 후보를 나란히 보여주고, 사용자가 하나를 고르면 그 draftId 로 확인 화면에 간다.
 *
 * 규칙:
 * - 최근 24시간 내 사용자 TEXT 2건 이상일 때만 호출한다 (enabled)
 * - AI 호출은 비싸고 느리다. 조건이 됐다고 바로 부르지 않고, 먼저
 *   "약속을 잡아볼까요?" 로 물어서 사용자가 동의해야 그때 초안을 만든다
 * - 한 번 동의하면 그 방에서는 다시 묻지 않는다. 이후 새 대화가 생기면 자동 재조회한다
 * - fallback=true(대화 부족·AI 실패)면 아무것도 띄우지 않는다. 상단 버튼이 그 경우를 담당한다
 * - 눌러도 바로 확정하지 않는다. 확인 화면으로 보낸다
 */
export function MeetingSuggestions({
  roomId,
  enabled,
  sourceVersion,
  typing,
}: {
  roomId: number
  enabled: boolean
  /** 최근 24시간 사용자 TEXT 중 가장 최신 messageId. 새 대화가 생기면 재추출한다. */
  sourceVersion: number
  /** 사용자가 입력창에 뭔가 치고 있는지. true가 되면 별도 닫기 없이 스트립을 숨긴다. */
  typing: boolean
}) {
  /** X 버튼으로 영구히 닫았는지. 타이핑 중 숨김과는 별개 — 되돌아올 수 있어야 한다. */
  const [dismissed, setDismissed] = useState(false)
  /** "약속을 잡아볼까요?" 에 동의했는지. 이게 true 여야 AI 를 실제로 부른다. */
  const [confirmed, setConfirmed] = useState(false)
  const lastRequestedSourceVersion = useRef<number | null>(null)

  const draft = useQuery({
    // 확인 화면과 같은 키를 쓴다. 카드를 눌러 이동하면 재호출 없이 즉시 뜬다.
    queryKey: ['card-draft', String(roomId)],
    queryFn: () => createCardDraft(roomId),
    enabled: enabled && confirmed && !dismissed,
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
  })
  const refetchDraft = draft.refetch

  useEffect(() => {
    if (!enabled || !confirmed || dismissed) return

    // enabled가 처음 true가 된 렌더에서는 useQuery가 이미 요청한다.
    if (lastRequestedSourceVersion.current === null) {
      lastRequestedSourceVersion.current = sourceVersion
      return
    }

    if (lastRequestedSourceVersion.current === sourceVersion) return

    lastRequestedSourceVersion.current = sourceVersion
    void refetchDraft()
  }, [confirmed, dismissed, enabled, refetchDraft, sourceVersion])

  // 타이핑 중엔 입력창을 가리지 않게 잠깐 숨긴다 — X 로 닫은 것과 달리, 타이핑을
  // 멈추면 (조건이 여전히 맞으면) 다시 뜬다.
  if (!enabled || dismissed || typing) return null

  // 아직 동의 전이다 — AI 를 부르기 전에 먼저 묻는다.
  // 문구 자체가 버튼이다. 무시하려면 그냥 채팅을 치면 된다(위 useEffect).
  if (!confirmed) {
    return (
      <Strip onDismiss={() => setDismissed(true)}>
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          className="min-h-11 shrink-0 appearance-none border-none bg-transparent p-0 text-left text-[14px] font-medium text-primary-strong underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary-strong"
        >
          약속카드를 만드시겠습니까
        </button>
      </Strip>
    )
  }

  // 호출 실패는 조용히 넘어간다. 상단 "약속 잡기" 버튼이 항상 대안으로 있다.
  if (draft.isError) return null

  if (draft.isPending) {
    return (
      <Strip onDismiss={() => setDismissed(true)}>
        <div className="h-11 w-44 shrink-0 animate-pulse rounded-full bg-muted" />
      </Strip>
    )
  }

  // fallback/비정상 원소만 온 경우에는 제안할 게 없으므로 띄우지 않는다.
  const availableDrafts =
    draft.data?.filter((candidate) => candidate && !candidate.fallback) ?? []
  if (availableDrafts.length === 0) return null

  const suggestions = dedupe(
    availableDrafts.map(toSuggestion).filter((s): s is Suggestion => s !== null),
  )

  if (suggestions.length === 0) return null

  return (
    <Strip onDismiss={() => setDismissed(true)}>
      {suggestions.map((s) => (
        <Link
          key={s.draftId}
          // 어느 초안을 눌렀는지 확인 화면에 넘긴다. URL 에 실어야 새로고침에도 유지된다.
          to={`/chat/${roomId}/meeting/new?draftId=${s.draftId}`}
          title={[s.place, s.when].filter(Boolean).join(' · ')}
          /*
            폭을 150px 로 고정한다.
            375px 화면에서 2.3장이 보여 "옆에 더 있다"가 전달되고,
            5장이어도 스크롤이 2화면 안쪽으로 끝난다.
          */
          className="flex w-[150px] shrink-0 flex-col justify-center gap-0.5 rounded-xl border border-primary bg-primary-subtle px-3 py-2 text-left transition-colors hover:bg-primary hover:text-on-primary"
        >
          <span className="truncate font-semibold text-primary-strong group-hover:text-on-primary">
            {s.place ?? '장소 미정'}
          </span>
          <span className="truncate text-[13px] text-muted-foreground">
            {s.when ?? '시간 미정'}
          </span>
        </Link>
      ))}
    </Strip>
  )
}

function Strip({
  children,
  onDismiss,
}: {
  children: React.ReactNode
  onDismiss: () => void
}) {
  return (
    <div className="border-t border-border px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Sparkle size={13} weight="fill" className="text-primary-strong" aria-hidden />
        <p className="text-[13px] font-medium text-muted-foreground">
          대화에서 약속을 찾았어요
        </p>
        <button
          type="button"
          aria-label="약속 제안 닫기"
          onClick={onDismiss}
          className="ml-auto grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-subtle"
        >
          <X size={16} />
        </button>
      </div>

      {/* 세로로 쌓지 않고 가로로 눕힌다. 입력창 위 공간이 가장 좁다. */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{children}</div>
    </div>
  )
}

type Suggestion = {
  draftId: number
  /** 카드 윗줄. 가장 구별력 있는 정보라 크게 보여준다. */
  place: string | null
  /** 카드 아랫줄. 날짜·시간 중 아는 것만 조합한다. */
  when: string | null
}

/**
 * 초안 하나를 카드 표시용으로 쪼갠다.
 *
 * 유형(산책/놀이/기타)은 카드 얼굴에 넣지 않는다. 대부분 산책이라 구별에
 * 도움이 안 되면서 폭만 먹는다. 확인 화면에서 바꿀 수 있다.
 * 아는 게 하나도 없으면 카드를 만들지 않는다.
 */
function toSuggestion(draft: CardDraft): Suggestion | null {
  const { date, time } = splitDraftDateTime(draft)
  const place = draft.placeText?.trim() || null
  const when = formatWhen(date, time)

  if (!place && !when) return null

  return { draftId: draft.draftId, place, when }
}

/**
 * 라벨이 완전히 같은 제안을 걷어낸다.
 *
 * 같은 장소가 대화에서 여러 번 언급되면 서버가 초안을 여러 개 만들 수 있는데,
 * 사용자에게는 똑같아 보이는 칩이 여러 개 뜨는 셈이라 고를 수가 없다.
 * 서버에서 정규화해 주는 것이 정석이고, 이건 그 앞단의 안전망이다.
 */
function dedupe(items: Suggestion[]): Suggestion[] {
  const seen = new Set<string>()
  return items.filter((s) => {
    const key = `${s.place ?? ''}|${s.when ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 날짜·시간 중 아는 것만으로 짧은 문구를 만든다.
 * 카드 폭이 150px 이라 최대한 짧게 쓴다. "오늘 12:00" 은 되지만 요일까지는 안 넣는다.
 */
function formatWhen(date: string, time: string): string | null {
  if (!date && !time) return null
  if (!date) return time
  if (!time) return formatDay(date)
  return `${formatDay(date)} ${time}`
}

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00`)
  if (Number.isNaN(d.getTime())) return date

  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round(
    (startOfDay(d) - startOfDay(new Date())) / 86_400_000,
  )

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '내일'
  return `${d.getMonth() + 1}/${d.getDate()}`
}
