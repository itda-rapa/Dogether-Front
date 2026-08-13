/** 04_M1_OpenAPI.yaml 의 Chat 스키마. 필드명·enum 을 임의로 바꾸지 않는다. */

export type PetSearchItem = {
  petId: number
  publicTag: string
  nickname: string
  profileUrl: string | null
  verified: boolean
  /** Active Pet 이 없는 L1 사용자에게는 null 로 온다. */
  relationship: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIEND' | null
}

export type ChatMessageType = 'TEXT' | 'CARD' | 'SYSTEM'

export type ChatMessage = {
  messageId: number
  roomId: number
  senderType: 'PET' | 'SYSTEM'
  senderPetId: number | null
  senderPetNickname: string | null
  type: ChatMessageType
  body: string | null
  meetingCardId: number | null
  clientMessageId: string | null
  createdAt: string
}

export type SendBlockedReason =
  | 'GREETING_REPLY_REQUIRED'
  | 'BLOCKED_USER'
  | 'ACCOUNT_NOT_ACTIVE'
  | null

export type ChatRoom = {
  roomId: number
  status: 'ACTIVE' | 'ARCHIVED'
  origin?: 'GREETING' | 'FRIEND'
  counterpartPet: PetSearchItem
  canSend: boolean
  sendBlockedReason: SendBlockedReason
  lastMessage: ChatMessage | null
  lastMessageAt: string | null
  updatedAt: string
}

export type ChatRoomListResult = {
  items: ChatRoom[]
  page: { nextCursor: string | null; hasNext: boolean }
}

export type OpenChatRoom = {
  roomId: number
  title: string
  description: string | null
  ownerPetId: number
  maxParticipants: number
  /** 상세 조회에서 제공되는 현재 참여 인원. */
  activeParticipants: number | null
  isPublic: boolean
  status: 'ACTIVE' | 'ARCHIVED'
  origin: 'OPEN_CHAT'
  createdAt: string
  updatedAt: string
}

export type OpenChatRoomPage = {
  content: OpenChatRoom[]
  number: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  empty: boolean
}

export type ChatMessageListResult = {
  items: ChatMessage[]
  /** 다음 폴링에 그대로 넘길 커서. null 이면 아직 메시지가 없다. */
  nextAfterMessageId: number | null
  hasMore: boolean
}

export const SEND_BLOCKED_MESSAGE: Record<
  Exclude<SendBlockedReason, null>,
  string
> = {
  GREETING_REPLY_REQUIRED: '상대가 먼저 답장해야 대화를 이어갈 수 있습니다.',
  BLOCKED_USER: '차단된 상대와는 대화할 수 없습니다.',
  ACCOUNT_NOT_ACTIVE: '이용이 제한된 계정입니다.',
}

/**
 * 약속 잡기 버튼 활성 조건.
 *
 * 계약: "프런트는 최근 24시간 내 사용자 TEXT 메시지 2개 이상일 때 버튼을 활성화한다."
 * SYSTEM·CARD 메시지는 제외한다.
 */
export function canDraftMeeting(messages: ChatMessage[], now = Date.now()) {
  const dayAgo = now - 24 * 60 * 60 * 1000
  const count = messages.filter(
    (m) =>
      m.type === 'TEXT' &&
      m.senderType === 'PET' &&
      new Date(m.createdAt).getTime() >= dayAgo,
  ).length
  return count >= 2
}

/** 같은 messageId 가 중복 적재되지 않도록 병합한다. 폴링이 겹칠 수 있기 때문. */
export function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]) {
  if (incoming.length === 0) return prev
  const seen = new Set(prev.map((m) => m.messageId))
  const added = incoming.filter((m) => !seen.has(m.messageId))
  if (added.length === 0) return prev
  return [...prev, ...added].sort((a, b) => a.messageId - b.messageId)
}

export function formatTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
