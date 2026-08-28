import { Client, type IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getRealtimeAccessToken } from '@/lib/api'
import type { RouteStatusNotification } from './types'

const WS_URL = import.meta.env.VITE_WS_URL ?? '/open-chat-ws'

export function subscribeToRouteStatus(
  onEvent: (event: RouteStatusNotification) => void,
  onStateChange?: (connected: boolean) => void,
  onHeatmapUpdate?: () => void,
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
      client.subscribe('/user/queue/routes', (frame: IMessage) => {
        onEvent(JSON.parse(frame.body) as RouteStatusNotification)
      })
      if (onHeatmapUpdate) {
        client.subscribe('/topic/routes/heatmap', () => onHeatmapUpdate())
      }
    },
    onDisconnect: () => onStateChange?.(false),
    onWebSocketClose: () => onStateChange?.(false),
    onStompError: () => onStateChange?.(false),
  })
  client.activate()
  return () => void client.deactivate()
}
