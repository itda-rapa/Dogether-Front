import { apiRequest } from '@/lib/api'
import type { Greeting, ReactionType, SetlogListResult, SetlogReaction } from './types'

/** M1 은 모든 사용자에게 동일한 시드 영상 3개를 준다. 커서 페이지네이션 응답이다. */
export function listSetlogs() {
  return apiRequest<SetlogListResult>('/setlogs')
}

/** 동일 반응을 다시 추가해도 서버가 멱등 처리한다. */
export function addReaction(setlogId: number, type: ReactionType) {
  return apiRequest<SetlogReaction>(`/setlogs/${setlogId}/reactions/${type}`, {
    method: 'PUT',
  })
}

/** 반응이 이미 없어도 200 과 reacted=false 를 돌려주는 멱등 API 다. */
export function removeReaction(setlogId: number, type: ReactionType) {
  return apiRequest<SetlogReaction>(`/setlogs/${setlogId}/reactions/${type}`, {
    method: 'DELETE',
  })
}

/**
 * 고정 인사 전송 → DIRECT 채팅방 생성.
 *
 * 요청 본문이 없다. 서버가 "안녕하세요! 같이 놀아요." 를 대신 저장한다.
 * 상대가 답하기 전까지 추가 메시지를 보낼 수 없고, 하루 10명 제한이 있다(429).
 */
export function sendGreeting(setlogId: number) {
  return apiRequest<Greeting>(`/setlogs/${setlogId}/greetings`, {
    method: 'POST',
  })
}
