import { Client, type IFrame, type IMessage } from '@stomp/stompjs'
import type { ChatMessage } from './types'

/**
 * DIRECT 채팅 WebSocket 클라이언트.
 *
 * 계약 정본: dogether(백엔드) docs/spec/06_M2_WebSocket_계약.md.
 * 여기 구현한 재연결·오류 분기는 그 문서 §3·§7·§8 을 그대로 옮긴 것이다 — 새로
 * 판단을 만들지 말고 문서가 바뀌면 여기도 같이 고친다.
 *
 * `WEBSOCKET_ENABLED` 가 꺼져 있으면(현재 로컬·운영 기본값) 연결 자체가 실패한다.
 * 이 모듈은 그 실패를 조용히 흡수하고 REST 폴링이 항상 안전망으로 남는다 —
 * §1 "연결 실패·끊김 시 프론트는 REST 로 복구한다", §10 마지막 수용 기준.
 */

const DIRECT_MESSAGES_QUEUE = '/user/queue/chat/messages'
const DIRECT_ERRORS_QUEUE = '/user/queue/errors'
const sendDestination = (roomId: number) =>
  `/app/chat/direct/rooms/${roomId}/messages`

type WsErrorPayload = {
  eventType: string
  code: string
  message: string
  roomId: number | null
  clientMessageId: string | null
}

type WsSendAck = {
  eventType: string
  roomId: number
  messageId: number
  clientMessageId: string
  replayed: boolean
}

type WsMessageCreated = { eventType: string; roomType: string; message: ChatMessage }

export type RealtimeDeps = {
  getToken: () => string | null
  /** AuthProvider 의 기존 토큰 회전. 새로 만들지 않고 그대로 재사용한다. */
  refresh: () => Promise<string | null>
  /** refresh 실패 시 세션 정리. AuthProvider 의 clearSession 을 그대로 넘긴다. */
  onAuthLost: () => void
}

let client: Client | null = null
let deps: RealtimeDeps | null = null
let backoffMs = 1000
let sawErrorFrame = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

const messageListeners = new Set<(message: ChatMessage) => void>()
const pendingSends = new Map<
  string,
  {
    resolve: (ack: WsSendAck) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
>()

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://'
  return `${proto}${location.host}/ws`
}

function parseJson<T>(body: string): T | null {
  try {
    return JSON.parse(body) as T
  } catch {
    return null
  }
}

/** JWT 는 서명 검증 없이 exp 만 읽는다 — §8 "closed with no error frame" 분기용. */
function decodeJwtExpMs(token: string): number | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number }
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch {
    return null
  }
}

function onQueueFrame(frame: IMessage) {
  const payload = parseJson<Record<string, unknown>>(frame.body)
  if (!payload) return

  if (payload.eventType === 'CHAT_SEND_ACK') {
    const ack = payload as unknown as WsSendAck
    settlePendingSend(ack.clientMessageId, (p) => p.resolve(ack))
    return
  }

  if (payload.eventType === 'CHAT_MESSAGE_CREATED') {
    const { message } = payload as unknown as WsMessageCreated
    messageListeners.forEach((handler) => handler(message))
  }
}

function onErrorFrame(frame: IMessage) {
  const payload = parseJson<WsErrorPayload>(frame.body)
  if (!payload) return

  if (payload.clientMessageId) {
    settlePendingSend(payload.clientMessageId, (p) =>
      p.reject(new Error(payload.code)),
    )
  }

  // §8: CHAT_ERROR(UNAUTHORIZED) 는 현재 서버 구현에서 사실상 발생하지 않지만
  // (토큰 만료는 STOMP ERROR 경로를 탄다), 문서가 명시한 분기라 그대로 둔다.
  if (payload.code === 'UNAUTHORIZED') void reauthenticateAndReconnect()
}

function settlePendingSend(
  clientMessageId: string,
  settle: (pending: { resolve: (a: WsSendAck) => void; reject: (e: Error) => void }) => void,
) {
  const pending = pendingSends.get(clientMessageId)
  if (!pending) return
  clearTimeout(pending.timer)
  pendingSends.delete(clientMessageId)
  settle(pending)
}

/** §7: STOMP ERROR 의 code. UNAUTHORIZED 만 재인증, 그 외는 재연결하지 않는다. */
function onStompProtocolError(frame: IFrame) {
  sawErrorFrame = true
  const payload = parseJson<WsErrorPayload>(frame.body)
  if (payload?.code === 'UNAUTHORIZED') {
    void reauthenticateAndReconnect()
  }
  // FORBIDDEN·VALIDATION_FAILED: §8 "재연결하지 않는다" — 클라이언트 버그로 간주.
}

/** §8: ERROR 프레임 없이 닫혔을 때 — exp 지났으면 재인증, 아니면 같은 토큰으로 backoff. */
function onSocketClosed() {
  if (!deps) return
  if (sawErrorFrame) {
    sawErrorFrame = false
    return
  }
  const exp = decodeJwtExpMs(deps.getToken() ?? '')
  if (exp != null && Date.now() >= exp) {
    void reauthenticateAndReconnect()
  } else {
    scheduleReconnect()
  }
}

async function reauthenticateAndReconnect() {
  if (!deps) return
  clearReconnectTimer()
  const refreshed = await deps.refresh()
  if (!refreshed) {
    deps.onAuthLost()
    return
  }
  scheduleReconnect(0)
}

function scheduleReconnect(delay = backoffMs) {
  if (!deps) return
  clearReconnectTimer()
  reconnectTimer = setTimeout(() => {
    backoffMs = Math.min(backoffMs * 2, 30_000)
    open()
  }, delay)
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function open() {
  if (!deps) return
  sawErrorFrame = false
  client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: { Authorization: `Bearer ${deps.getToken() ?? ''}` },
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    // stompjs 내장 재연결 대신 §8 표를 직접 구현하므로 끈다.
    reconnectDelay: 0,
    onConnect: () => {
      backoffMs = 1000
      // §2: 연결 직후 두 큐를 모두 구독한다. 오류 큐를 빼먹으면 SEND 실패가
      // 신호 없이 사라진다.
      client?.subscribe(DIRECT_MESSAGES_QUEUE, onQueueFrame)
      client?.subscribe(DIRECT_ERRORS_QUEUE, onErrorFrame)
    },
    onStompError: onStompProtocolError,
    onWebSocketClose: onSocketClosed,
  })
  client.activate()
}

/** 로그인 상태일 때만 호출한다(AuthProvider 가 hasSession 을 보고 부른다). */
export function connect(nextDeps: RealtimeDeps) {
  deps = nextDeps
  backoffMs = 1000
  open()
}

export function disconnect() {
  deps = null
  clearReconnectTimer()
  pendingSends.forEach(({ reject, timer }) => {
    clearTimeout(timer)
    reject(new Error('disconnected'))
  })
  pendingSends.clear()
  client?.deactivate()
  client = null
}

/** roomId 필터링은 호출부(ChatRoomPage) 책임 — 이 함수는 모든 방의 이벤트를 흘려준다. */
export function onChatMessageCreated(handler: (message: ChatMessage) => void) {
  messageListeners.add(handler)
  return () => {
    messageListeners.delete(handler)
  }
}

/**
 * WebSocket 으로 DIRECT 메시지를 보낸다. 연결이 없거나, 4초 안에 ACK/오류가
 * 안 오거나, CHAT_ERROR 가 오면 reject 한다 — 호출부가 REST 로 fallback 한다(§8).
 */
export function sendViaRealtime(
  roomId: number,
  clientMessageId: string,
  body: string,
) {
  return new Promise<WsSendAck>((resolve, reject) => {
    if (!client?.connected) {
      reject(new Error('NOT_CONNECTED'))
      return
    }
    const timer = setTimeout(() => {
      pendingSends.delete(clientMessageId)
      reject(new Error('TIMEOUT'))
    }, 4000)
    pendingSends.set(clientMessageId, { resolve, reject, timer })
    client.publish({
      destination: sendDestination(roomId),
      body: JSON.stringify({ clientMessageId, body }),
    })
  })
}
