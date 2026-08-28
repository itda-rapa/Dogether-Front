import { apiRequest } from '@/lib/api'
import type {
  CardDraft,
  CardType,
  ConfirmationCodeResult,
  FootprintListResult,
  IssueConfirmationCodeResult,
  MeetingCard,
  MeetingCardListResult,
  MeetingReviewSubmitBody,
  MeetingReviewSubmitResult,
  MeetingVerificationStatusResult,
  MeetingVerificationSubmitResult,
  SubmitMeetingVerificationBody,
} from './types'

/**
 * AI 약속 카드 초안 생성. UI에는 항상 후보 배열로 반환한다.
 *
 * 서버는 AI 실패·지연·대화 부족도 오류로 만들지 않고 200 + fallback=true 인
 * 빈 폼을 돌려준다. 현재 단건 응답과 향후 다건 응답을 모두 배열로 정규화한다.
 * 따라서 호출이 성공했다고 값이 채워져 있다는 뜻은 아니다.
 */
export async function createCardDraft(roomId: number): Promise<CardDraft[]> {
  const response = await apiRequest<CardDraft | CardDraft[] | null>(
    `/chat/rooms/${roomId}/card-drafts`,
    {
      method: 'POST',
    },
  )

  // The deployed API currently returns one draft, while newer API versions may
  // return multiple candidates. Normalize both contracts at the API boundary.
  if (Array.isArray(response)) return response.filter(isCardDraft)
  return isCardDraft(response) ? [response] : []
}

function isCardDraft(value: unknown): value is CardDraft {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<CardDraft>).draftId === 'number'
  )
}

export type CreateMeetingCardBody = {
  roomId: number
  /** 초안에서 이어진 경우 그 draftId 를 함께 보낸다. */
  draftId: number | null
  cardType: CardType
  placeText: string
  /** ISO date-time */
  meetAt: string
  /** Open-chat only. DIRECT chat leaves this undefined. */
  participantPetIds?: number[]
}

/** 사용자가 확정 버튼을 눌렀을 때만 호출한다. */
export function createMeetingCard(body: CreateMeetingCardBody) {
  return apiRequest<MeetingCard>('/meeting-cards', { method: 'POST', body })
}

export type ListMeetingCardsParams = {
  status?: 'OPEN' | 'CANCELED'
  cursor?: string
  limit?: number
}

/**
 * 내 Active Pet 이 creator 이거나 참가자인 약속 카드 목록.
 *
 * ⚠️ 제안 단계 엔드포인트다 — 아직 BE 에 없다. BE 배포 전에는 404/NetworkError 가
 * 정상 동작이며, 화면은 ApiErrorNotice 로 안내한다. 계약 상세는
 * docs/handover/meeting-cards-list-be.md 참고.
 */
export function listMyMeetingCards(params?: ListMeetingCardsParams) {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.cursor) q.set('cursor', params.cursor)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiRequest<MeetingCardListResult>(
    `/meeting-cards/me${qs ? `?${qs}` : ''}`,
  )
}

export function getMeetingCard(cardId: number) {
  return apiRequest<MeetingCard>(`/meeting-cards/${cardId}`)
}

/** 취소는 되돌릴 수 없다. UI 에서 한 번 더 확인을 받는다. */
export function cancelMeetingCard(cardId: number) {
  return apiRequest<MeetingCard>(`/meeting-cards/${cardId}/cancel`, {
    method: 'POST',
  })
}

/**
 * 만남 GPS 위치 제출. 같은 `clientRequestId`는 항상 같은 payload로만 보내야 한다
 * (서버가 clientRequestId+payload를 immutable ledger로 멱등 처리한다).
 * 네트워크 재시도는 이 함수를 그대로 다시 부르면 되지만, 위치를 새로 잡은
 * "다른 시도"라면 새 clientRequestId로 새로 호출해야 한다.
 */
export function submitMeetingVerification(
  cardId: number,
  body: SubmitMeetingVerificationBody,
) {
  return apiRequest<MeetingVerificationSubmitResult>(
    `/meeting-cards/${cardId}/meeting-verifications`,
    { method: 'POST', body },
  )
}

/** 좌표는 내려오지 않는다. 대기 화면 폴링에 쓴다. */
export function getMeetingVerification(cardId: number) {
  return apiRequest<MeetingVerificationStatusResult>(
    `/meeting-cards/${cardId}/meeting-verification`,
  )
}

/**
 * 확인 코드 fallback(#164). CODE_REQUIRED 참여 Pet만 호출 가능. 평문 코드는
 * 이 응답에서만 온다 — 어디에도 저장하지 말고 화면에 보여주기만 한다.
 */
export function issueConfirmationCode(cardId: number) {
  return apiRequest<IssueConfirmationCodeResult>(
    `/meeting-cards/${cardId}/confirmation-codes`,
    { method: 'POST' },
  )
}

/** 상대 Pet만 호출 가능(발급자 본인은 403). 성공해도 아직 Meeting 은 생성되지 않는다. */
export function verifyConfirmationCode(cardId: number, code: string) {
  return apiRequest<ConfirmationCodeResult>(
    `/meeting-cards/${cardId}/confirmation-codes/verify`,
    { method: 'POST', body: { code } },
  )
}

/** 코드 발급자만 호출. 상대가 아직 검증하지 않았으면 409 MEETING_CODE_VERIFIER_REQUIRED. */
export function confirmConfirmationCode(cardId: number) {
  return apiRequest<ConfirmationCodeResult>(
    `/meeting-cards/${cardId}/confirmation-codes/confirm`,
    { method: 'POST' },
  )
}

/**
 * 만남 후기 작성(#166). `meetingId`는 카드 id가 아니라 확정된 Meeting.id다.
 * 같은 clientRequestId 재요청은 멱등, 같은 (meeting, 내 Pet) 재작성은 409 REVIEW_ALREADY_EXISTS.
 */
export function submitMeetingReview(meetingId: number, body: MeetingReviewSubmitBody) {
  return apiRequest<MeetingReviewSubmitResult>(`/meetings/${meetingId}/reviews`, {
    method: 'POST',
    body,
  })
}

/** 내 Active Pet 발자국 목록. createdAt DESC 커서 페이지, size 기본 20·최대 100. */
export function listFootprints(params?: { cursor?: string; size?: number }) {
  const q = new URLSearchParams()
  if (params?.cursor) q.set('cursor', params.cursor)
  if (params?.size) q.set('size', String(params.size))
  const qs = q.toString()
  return apiRequest<FootprintListResult>(`/footprints${qs ? `?${qs}` : ''}`)
}
