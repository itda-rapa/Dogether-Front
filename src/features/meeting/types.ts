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

import type { PetSearchItem } from '@/features/chat/types'

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
 * POST /chat/rooms/{roomId}/card-drafts 응답 배열의 원소. 응답은 `CardDraft[]`이며
 * 항상 1건 이상이다(후보가 없으면 fallback=true 인 빈 폼 1건).
 *
 * date/time 은 AI가 추출한 부분값이다. 둘 다 유효할 때만 meetAt도 채워진다.
 * 따라서 날짜 없이 시각만 나온 대화도 time을 잃지 않는다.
 */
export type CardDraft = {
  draftId: number
  roomId: number
  cardType: CardType | null
  placeText: string | null
  date: string | null
  time: string | null
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

/**
 * `GET /meeting-cards/me` (목록) 전용 확장.
 *
 * ⚠️ 아직 BE 계약(04_M1_OpenAPI.yaml)에 없는 제안 단계 엔드포인트다. M2 단톡 도입으로
 * 참가자가 상대 1명으로 안 끝나서, 목록에서만이라도 펫 정보를 인라인으로 받기로 했다
 * (N+1 조회 회피). 단건 조회(getMeetingCard)에는 participants 가 없다.
 * 자세한 내용은 인수인계 문서(docs/handover/meeting-cards-list-be.md) 참고.
 */
export type MeetingCardListItem = MeetingCard & {
  participants: PetSearchItem[]
}

export type MeetingCardListResult = {
  items: MeetingCardListItem[]
  page: { nextCursor: string | null; hasNext: boolean }
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

/** 절대 시각이 없으면 AI가 추출한 날짜·시각 부분값을 그대로 사용한다. */
export function splitDraftDateTime(draft: CardDraft): { date: string; time: string } {
  const combined = splitMeetAt(draft.meetAt)
  return {
    date: combined.date || draft.date || '',
    time: combined.time || draft.time || '',
  }
}

/** 날짜/시간 입력을 하나의 ISO date-time 으로 합친다. 로컬 시간대로 해석한다. */
export function joinMeetAt(date: string, time: string): string | null {
  if (!date || !time) return null
  const d = new Date(`${date}T${time}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function toFormValues(draft: CardDraft): DraftFormValues {
  const { date, time } = splitDraftDateTime(draft)
  return {
    cardType: isCardType(draft.cardType) ? draft.cardType : '',
    date,
    time,
    placeText: draft.placeText ?? '',
  }
}

/** 어떤 항목을 AI 가 채웠는지. 사용자가 확인해야 할 값임을 표시하는 데 쓴다. */
export function aiFilledMap(draft: CardDraft) {
  const { date, time } = splitDraftDateTime(draft)
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

/**
 * 만남 GPS 확인(#148). 계약 원본: dogether(백엔드)/docs/spec/M3/04_M3_API_상세명세.md
 * `POST/GET /meeting-cards/{cardId}/meeting-verification(s)`.
 */
export type MeetingVerificationApiStatus =
  | 'NOT_SUBMITTED'
  | 'WAITING_COUNTERPART'
  | 'GPS_CONFIRMED'
  | 'CODE_REQUIRED'
  | 'CODE_CONFIRMED'
  | 'REJECTED'
  | 'EXPIRED'

export type SubmitMeetingVerificationBody = {
  clientRequestId: string
  latitude: number
  longitude: number
  accuracyMeters: number
  /** ISO date-time. 위치를 실제로 획득한 시각(제출 시각이 아니다). */
  capturedAt: string
}

/** POST 응답. */
export type MeetingVerificationSubmitResult = {
  cardId: number
  submittedPetId: number
  status: MeetingVerificationApiStatus
  counterpartSubmitted: boolean
  meetingId: number | null
  confirmed: boolean
  verificationMethod: 'GPS' | 'CODE' | null
  confirmedAt: string | null
  codeRequired: boolean
  distanceMeters: number | null
}

/** GET 응답. 좌표는 내려오지 않는다 — "현재 사용자에게 필요한 상태"만 온다. */
export type MeetingVerificationStatusResult = {
  cardId: number
  status: MeetingVerificationApiStatus
  mySubmitted: boolean
  counterpartSubmitted: boolean
  meetingId: number | null
  confirmed: boolean
  verificationMethod: 'GPS' | 'CODE' | null
  confirmedAt: string | null
  codeRequired: boolean
  distanceMeters: number | null
}

/**
 * 확인 코드 fallback(#164). CODE_REQUIRED 상태에서만 쓰인다. 계약 원본:
 * dogether(백엔드)/docs/spec/M3/04_M3_API_상세명세.md
 * `POST /meeting-cards/{cardId}/confirmation-codes(/verify|/confirm)`.
 */
export type IssueConfirmationCodeResult = {
  /** 평문 코드. 발급 응답에서만 한 번 내려온다 — 저장하지 말고 화면에만 보여준다. */
  code: string
  expiresAt: string
}

export type ConfirmationCodeStatus = 'WAITING_ISSUER_CONFIRMATION' | 'CONFIRMED'

/** verify/confirm 공통 응답. */
export type ConfirmationCodeResult = {
  cardId: number
  status: ConfirmationCodeStatus
  meetingId: number | null
  verificationMethod: 'GPS' | 'CODE' | null
  confirmedAt: string | null
}

/**
 * 만남 후기·발자국(#166). 계약 원본: dogether(백엔드)/docs/spec/M3/04_M3_API_상세명세.md §11.
 * `POST /meetings/{meetingId}/reviews` — 여기 `meetingId`는 카드 id가 아니라
 * GPS/CODE 확정 뒤 얻는 `Meeting.id`(MeetingVerificationStatusResult.meetingId)다.
 */
export type MeetingReviewSubmitBody = {
  /** 같은 Pet 재요청 식별용 멱등키. */
  clientRequestId: string
  /** 공백 불가, 최대 30자. */
  placeTag: string
  /** 선택, 최대 500자. */
  content?: string
}

export type ReviewFootprintResult = {
  /** 이 요청으로 새 발자국이 생겼는지. */
  granted: boolean
  footprintId: number
  /** 그날(Asia/Seoul) 발자국이 이미 있어서 새로 안 만들었는지. */
  duplicateDay: boolean
  /** Asia/Seoul 기준 적립 날짜 (YYYY-MM-DD). */
  earnedDate: string
}

export type MeetingReviewSubmitResult = {
  reviewId: number
  meetingId: number
  placeTag: string
  content: string | null
  createdAt: string
  footprint: ReviewFootprintResult
}

export type FootprintCounterpartPet = {
  petId: number
  nickname: string
}

export type FootprintItem = {
  footprintId: number
  meetingId: number
  counterpartPet: FootprintCounterpartPet
  earnedDate: string
  createdAt: string
}

export type FootprintListResult = {
  items: FootprintItem[]
  page: { nextCursor: string | null; hasNext: boolean }
}
