/**
 * 약속 카드(Meeting Card) 관련 타입.
 *
 * 계약 원본: dogether/docs/spec/04_M1_OpenAPI.yaml 의 CardDraft / MeetingCard.
 * 필드명·enum 을 임의로 바꾸지 않는다.
 *
 * 핵심 흐름:
 *   POST /chat/rooms/{roomId}/card-drafts  -> AI 초안 (모든 값 null 가능)
 *   사용자가 확인·수정
 *   POST /meeting-cards                    -> 확정 저장
 *
 * AI 결과를 자동 확정하지 않는다. 저장은 사용자가 확정 버튼을 눌렀을 때만 한다.
 */

export const CARD_TYPES = ['WALK', 'PLAY', 'HOSPITAL', 'OTHER'] as const
export type CardType = (typeof CARD_TYPES)[number]

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  WALK: '산책',
  PLAY: '놀이',
  HOSPITAL: '병원',
  OTHER: '기타',
}

export type FallbackReason =
  | 'TIMEOUT'
  | 'MODEL_ERROR'
  | 'INSUFFICIENT_CONTEXT'
  | null

/**
 * POST /chat/rooms/{roomId}/card-drafts 응답. **단건 객체이며 배열이 아니다.**
 *
 * 배열로 열자는 논의가 있었지만, AI 서버가 실제로 최대 1건만 반환하는 것이
 * 확인되어 단건을 유지한다. 원소가 항상 0~1이면 배열은 UI 복잡도만 늘린다.
 * 여러 후보를 보여주려면 AI 쪽부터 바뀌어야 한다.
 *
 * meetAt 은 단일 date-time 이다. AI 가 시각을 못 뽑으면 meetAt 만 null 이 되고
 * placeText·cardType 은 살아서 온다. 그 경우에도 카드는 성립한다.
 */
export type CardDraft = {
  draftId: number
  roomId: number
  cardType: CardType | null
  placeText: string | null
  meetAt: string | null
  /** true 면 AI 가 값을 뽑지 못한 빈 폼이다. 오류가 아니다. */
  fallback: boolean
  fallbackReason: FallbackReason
  createdAt: string
}

export type MeetingCard = {
  cardId: number
  roomId: number
  creatorPetId: number
  participantPetIds: number[]
  cardType: CardType
  placeText: string
  meetAt: string
  status: 'OPEN' | 'CANCELED'
  canceledByPetId: number | null
  canceledAt: string | null
  createdAt: string
}

/** 폼에 바인딩되는 형태. meetAt 을 날짜/시간 입력 두 개로 쪼갠다. */
export type DraftFormValues = {
  cardType: string
  date: string
  time: string
  placeText: string
}

/** 서버 enum 이지만 값이 오염돼 올 수 있으므로 한 번 더 검증한다. */
export function isCardType(v: unknown): v is CardType {
  return typeof v === 'string' && (CARD_TYPES as readonly string[]).includes(v)
}

/** ISO date-time 을 로컬 기준 date/time 입력값으로 쪼갠다. */
export function splitMeetAt(meetAt: string | null): { date: string; time: string } {
  if (!meetAt) return { date: '', time: '' }
  const d = new Date(meetAt)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/** 날짜/시간 입력을 하나의 ISO date-time 으로 합친다. 로컬 시간대로 해석한다. */
export function joinMeetAt(date: string, time: string): string | null {
  if (!date || !time) return null
  const d = new Date(`${date}T${time}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function toFormValues(draft: CardDraft): DraftFormValues {
  const { date, time } = splitMeetAt(draft.meetAt)
  return {
    cardType: isCardType(draft.cardType) ? draft.cardType : '',
    date,
    time,
    placeText: draft.placeText ?? '',
  }
}

/** 어떤 항목을 AI 가 채웠는지. 사용자가 확인해야 할 값임을 표시하는 데 쓴다. */
export function aiFilledMap(draft: CardDraft) {
  const { date, time } = splitMeetAt(draft.meetAt)
  return {
    cardType: isCardType(draft.cardType),
    date: date !== '',
    time: time !== '',
    placeText: (draft.placeText ?? '') !== '',
  }
}

export const FALLBACK_MESSAGE: Record<
  Exclude<FallbackReason, null>,
  { title: string; body: string }
> = {
  INSUFFICIENT_CONTEXT: {
    title: '약속을 뽑을 대화가 부족합니다',
    body: '최근 24시간 안에 나눈 대화가 적어 초안을 만들지 못했습니다. 직접 입력해 주세요.',
  },
  TIMEOUT: {
    title: 'AI 응답이 지연됐습니다',
    body: '약속 내용을 직접 입력해 주세요.',
  },
  MODEL_ERROR: {
    title: 'AI 초안을 만들지 못했습니다',
    body: '약속 내용을 직접 입력해 주세요.',
  },
}
