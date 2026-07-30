import { apiRequest } from '@/lib/api'
import type { CardDraft, CardType, MeetingCard } from './types'

/**
 * AI 약속 카드 초안 생성. 단건이 온다.
 *
 * 서버는 AI 실패·지연·대화 부족도 오류로 만들지 않고 200 + fallback=true 인
 * 빈 폼으로 돌려준다. 따라서 호출이 성공했다고 값이 채워져 있다는 뜻은 아니다.
 */
export function createCardDraft(roomId: number) {
  return apiRequest<CardDraft>(`/chat/rooms/${roomId}/card-drafts`, {
    method: 'POST',
  })
}

export type CreateMeetingCardBody = {
  roomId: number
  /** 초안에서 이어진 경우 그 draftId 를 함께 보낸다. */
  draftId: number | null
  cardType: CardType
  placeText: string
  /** ISO date-time */
  meetAt: string
}

/** 사용자가 확정 버튼을 눌렀을 때만 호출한다. */
export function createMeetingCard(body: CreateMeetingCardBody) {
  return apiRequest<MeetingCard>('/meeting-cards', { method: 'POST', body })
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
