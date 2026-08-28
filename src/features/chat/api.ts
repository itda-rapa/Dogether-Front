import { apiRequest } from '@/lib/api'
import type {
  ChatMessage,
  ChatMessageListResult,
  ChatRoom,
  ChatRoomListResult,
  OpenChatRoom,
  OpenChatRoomPage,
} from './types'
import type { CardDraft } from '@/features/meeting/types'

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

type SendChatMessageInput =
  | { clientMessageId: string; body: string }
  | { clientMessageId: string; type: 'IMAGE' | 'VIDEO'; mediaId: number }
  | { clientMessageId: string; type: 'SETLOG_SHARE'; setlogId: number }

/**
 * 메시지 전송. TEXT 는 `type` 을 생략해도 서버가 기존 계약대로 TEXT 로 정규화한다.
 * IMAGE/VIDEO/SETLOG_SHARE 는 `type` 이 필수다.
 *
 * clientMessageId 로 재시도 멱등성을 보장한다. 같은 값으로 다시 보내면
 * 서버가 201 대신 200 으로 기존 메시지를 돌려주므로 중복이 생기지 않는다.
 * 따라서 재시도할 때 새 id 를 만들면 안 된다.
 */
export function sendChatMessage(roomId: number, input: SendChatMessageInput) {
  return apiRequest<ChatMessage>(`/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    body: input,
  })
}

export function listOpenChatRooms(page = 0, size = 20) {
  const q = new URLSearchParams({ page: String(page), size: String(size) })
  return apiRequest<OpenChatRoomPage>(`/chat/rooms/open?${q.toString()}`)
}

export function getOpenChatRoom(roomId: number) {
  return apiRequest<OpenChatRoom>(`/chat/rooms/open/${roomId}`)
}

export function createOpenChatRoom(input: {
  title: string
  description: string | null
  maxParticipants: number
  isPublic: boolean
}) {
  return apiRequest<OpenChatRoom>('/chat/rooms/open', {
    method: 'POST',
    body: input,
  })
}

export function joinOpenChatRoom(roomId: number) {
  return apiRequest<OpenChatRoom>(`/chat/rooms/open/${roomId}/join`, {
    method: 'POST',
  })
}

export type OpenChatInviteResult = {
  roomId: number
  targetPetId: number
  joined: boolean
  activeParticipants: number
}

export function inviteFriendToOpenChat(roomId: number, targetPetId: number) {
  return apiRequest<OpenChatInviteResult>(
    `/chat/rooms/open/${roomId}/invites`,
    {
      method: 'POST',
      body: { targetPetId },
    },
  )
}

export type OpenChatDraftParticipant = {
  petId: number
  nickname: string
  profileUrl: string | null
}

export type PlaceIntentResult = {
  decision: 'SHOW' | 'SUPPRESS'
  placeType: import('@/features/map/types').CulturalFacilityCategory | null
  targetPetId: number
}

export function decidePlaceIntent(roomId: number, triggerMessageId: number) {
  return apiRequest<PlaceIntentResult>(`/chat/rooms/${roomId}/place-intent`, {
    method: 'POST',
    body: { triggerMessageId },
  })
}

export function createChatMapMessage(
  roomId: number,
  input: {
    triggerMessageId: number
    category: import('@/features/map/types').CulturalFacilityCategory
    longitude: number
    latitude: number
  },
) {
  return apiRequest<ChatMessage>(`/chat/rooms/${roomId}/map-messages`, {
    method: 'POST',
    body: input,
  })
}

export function shareChatMapLocation(
  roomId: number,
  mapMessageId: number,
  input: { longitude: number; latitude: number },
) {
  return apiRequest<ChatMessage>(
    `/chat/rooms/${roomId}/map-messages/${mapMessageId}/locations`,
    { method: 'POST', body: input },
  )
}

export type OpenChatCardDraft = CardDraft & {
  requestedByPetId: number
  participantPetIds: number[]
  participants: OpenChatDraftParticipant[]
}

export type OpenChatDraftRequestResult = {
  requestId: string
  roomId: number
}

export function requestOpenChatCardDraft(roomId: number) {
  return apiRequest<OpenChatDraftRequestResult>(
    `/chat/rooms/open/${roomId}/card-drafts`,
    { method: 'POST' },
  )
}

export function getOpenChatCardDraft(roomId: number, draftId: number) {
  return apiRequest<OpenChatCardDraft>(
    `/chat/rooms/open/${roomId}/card-drafts/${draftId}`,
  )
}

/** 지도 시설에서 AI 호출 없이, 장소가 미리 채워진 오픈채팅 약속 초안을 만든다. */
export function createOpenChatPlaceDraft(
  roomId: number,
  input: { placeText: string; cardType: import('@/features/meeting/types').CardType },
) {
  return apiRequest<OpenChatCardDraft>(
    `/chat/rooms/open/${roomId}/place-drafts`,
    { method: 'POST', body: input },
  )
}

export function leaveOpenChatRoom(roomId: number) {
  return apiRequest<void>(`/chat/rooms/open/${roomId}/leave`, {
    method: 'DELETE',
  })
}

export function deleteOpenChatRoom(roomId: number) {
  return apiRequest<void>(`/chat/rooms/open/${roomId}`, {
    method: 'DELETE',
  })
}

/** #169 통합 인앱 알림. 8종 전부 이 하나의 봉투로 온다 — 타입별로 응답이 갈리지 않는다. */
export type NotificationType =
  | 'OPEN_CHAT_INVITE'
  | 'BOARD_POST_LIKE'
  | 'BOARD_POST_HELPFUL'
  | 'BOARD_COMMENT_HELPFUL'
  | 'BOARD_COMMENT_CREATED'
  | 'BOARD_REPLY_CREATED'
  | 'SETLOG_LIKE'
  | 'SETLOG_CUTE'

export type NotificationTargetType =
  | 'OPEN_CHAT_ROOM'
  | 'BOARD_POST'
  | 'BOARD_COMMENT'
  | 'SETLOG'

export type AppNotification = {
  notificationId: number
  type: NotificationType
  targetType: NotificationTargetType
  targetId: number
  /** OPEN_CHAT_INVITE 에서만 채워진다. */
  roomId: number | null
  /** 채팅 알림에서만 채워진다 — 그 외 타입은 항상 null. */
  roomTitle: string | null
  postId: number | null
  setlogId: number | null
  actorPetId: number
  actorPetNickname: string
  actorProfileAssetId: number | null
  /** BOARD_COMMENT_CREATED/BOARD_REPLY_CREATED 에서만 채워진다. */
  commentPreview: string | null
  /** 조회 시점 접근 가능 여부. false 면 원문·이동 링크를 보여주면 안 된다(존재 은닉). */
  targetAvailable: boolean
  createdAt: string
  readAt: string | null
}

export function listNotifications() {
  return apiRequest<AppNotification[]>('/notifications')
}

/** 헤더 배지용. 목록 전체를 안 받고 읽지 않은 개수만 받는다. */
export function getUnreadNotificationCount() {
  return apiRequest<{ unreadCount: number }>('/notifications/unread-count')
}

export function markNotificationRead(notificationId: number) {
  return apiRequest<AppNotification>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })
}
