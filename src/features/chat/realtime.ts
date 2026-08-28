import { Client, type IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getRealtimeAccessToken } from '@/lib/api'
import type { ChatMessage } from './types'
import type { OpenChatCardDraft } from './api'

type ChatMessageEvent = {
  requestId: string
  messageId: number
  roomId: number
  senderPetId: number | null
  senderPetNickname: string | null
  senderType: 'PET' | 'SYSTEM'
  type: 'TEXT' | 'CARD' | 'ROUTE_SHARE' | 'MAP' | 'SYSTEM'
  body: string | null
  map: import('./types').ChatMapMessage | null
  sharedRouteId: string | null
  meetingCardId: number | null
  clientMessageId: string | null
  sentAt: string
}

export type OpenChatDraft = Omit<OpenChatCardDraft, 'participants'>

export type OpenChatDraftNotification = {
  requestId: string
  roomId: number
  status: 'COMPLETED' | 'FAILED'
  message: string | null
  drafts: OpenChatDraft[]
}

const WS_URL = import.meta.env.VITE_WS_URL ?? '/open-chat-ws'

export function subscribeToChatRoom(
  roomId: number,
  onMessage: (message: ChatMessage) => void,
  onStateChange?: (connected: boolean) => void,
  onOpenChatDraft?: (notification: OpenChatDraftNotification) => void,
) {
  const token = getRealtimeAccessToken()
  if (!token) return () => undefined

  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3_000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    onConnect: () => {
      onStateChange?.(true)
      client.subscribe(`/topic/chat/${roomId}`, (frame: IMessage) => {
        const event = JSON.parse(frame.body) as ChatMessageEvent
        onMessage({
          messageId: event.messageId,
          roomId: event.roomId,
          senderType: event.senderType,
          senderPetId: event.senderPetId,
          senderPetNickname: event.senderPetNickname,
          type: event.type,
          body: event.body,
          map: event.map ?? null,
          sharedRouteId: event.sharedRouteId ?? null,
          meetingCardId: event.meetingCardId ?? null,
          clientMessageId: event.clientMessageId,
          createdAt: event.sentAt,
        })
      })
      if (onOpenChatDraft) {
        client.subscribe('/user/queue/open-chat-card-drafts', (frame: IMessage) => {
          const notification = JSON.parse(frame.body) as OpenChatDraftNotification
          if (notification.roomId === roomId) onOpenChatDraft(notification)
        })
      }
    },
    onDisconnect: () => onStateChange?.(false),
    onWebSocketClose: () => onStateChange?.(false),
    onStompError: () => onStateChange?.(false),
  })

  client.activate()
  return () => void client.deactivate()
}
