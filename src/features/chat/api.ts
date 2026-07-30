import { apiRequest } from '@/lib/api'
import type {
  ChatMessage,
  ChatMessageListResult,
  ChatRoom,
  ChatRoomListResult,
} from './types'

/** Active Pet 이 Participant 인 방을 lastMessageAt 내림차순으로 반환한다. */
export function listChatRooms(params?: { cursor?: string; limit?: number }) {
  const q = new URLSearchParams()
  if (params?.cursor) q.set('cursor', params.cursor)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiRequest<ChatRoomListResult>(`/chat/rooms${qs ? `?${qs}` : ''}`)
}

export function getChatRoom(roomId: number) {
  return apiRequest<ChatRoom>(`/chat/rooms/${roomId}`)
}

/**
 * 새 메시지 폴링.
 * afterMessageId 보다 큰 메시지를 ID 오름차순으로 받는다.
 */
export function listChatMessages(
  roomId: number,
  afterMessageId?: number | null,
  limit = 50,
) {
  const q = new URLSearchParams({ limit: String(limit) })
  if (afterMessageId != null) q.set('afterMessageId', String(afterMessageId))
  return apiRequest<ChatMessageListResult>(
    `/chat/rooms/${roomId}/messages?${q.toString()}`,
  )
}

/**
 * TEXT 메시지 전송.
 *
 * clientMessageId 로 재시도 멱등성을 보장한다. 같은 값으로 다시 보내면
 * 서버가 201 대신 200 으로 기존 메시지를 돌려주므로 중복이 생기지 않는다.
 * 따라서 재시도할 때 새 id 를 만들면 안 된다.
 */
export function sendChatMessage(
  roomId: number,
  input: { clientMessageId: string; body: string },
) {
  return apiRequest<ChatMessage>(`/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    body: input,
  })
}
