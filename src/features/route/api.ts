import { apiRequest } from '@/lib/api'
import type {
  RouteAccepted,
  RouteActivityType,
  RouteNode,
  RoutePriorityType,
  RouteResult,
} from './types'

export function findNearestRouteNode(
  longitude: number,
  latitude: number,
  role: 'START' | 'WAYPOINT' | 'DESTINATION',
  activityType: RouteActivityType,
) {
  const query = new URLSearchParams({
    longitude: longitude.toString(),
    latitude: latitude.toString(),
    role,
    activityType,
  })
  return apiRequest<RouteNode>(`/routes/nodes/nearest?${query}`)
}

export function createRoute(body: {
  startNodeId: number
  waypointNodeIds: number[]
  destinationNodeId: number
  activityType: RouteActivityType
  priorityType: RoutePriorityType
  speedKmh: number
  departureAt: string
}) {
  return apiRequest<RouteAccepted>('/routes', { method: 'POST', body })
}

export function createRoundTripRoute(body: {
  startNodeId: number
  targetDistanceMeters: number
  activityType: RouteActivityType
  priorityType: RoutePriorityType
  speedKmh: number
  departureAt: string
}) {
  return apiRequest<RouteAccepted>('/routes/round-trips', { method: 'POST', body })
}

export function getRoute(requestId: string, signal?: AbortSignal) {
  return apiRequest<RouteResult>(`/routes/${requestId}`, { signal })
}

export function saveRoute(requestId: string) {
  return apiRequest<RouteResult>(`/routes/${requestId}/save`, { method: 'POST' })
}

export function listSavedRoutes() {
  return apiRequest<RouteResult[]>('/routes')
}

export function getRouteHeatmap(signal?: AbortSignal) {
  return apiRequest<Record<string, unknown>>('/routes/heatmap', { signal })
}

export function getSharedRoute(roomId: number, requestId: string, signal?: AbortSignal) {
  return apiRequest<RouteResult>(`/chat/rooms/${roomId}/route-shares/${requestId}`, { signal })
}
