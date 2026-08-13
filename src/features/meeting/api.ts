import { apiRequest } from '@/lib/api'
import type {
  CardDraft,
  CardType,
  MeetingCard,
  MeetingCardListResult,
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
