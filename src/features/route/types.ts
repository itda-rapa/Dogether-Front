export type RouteActivityType = 'WALK' | 'RUN' | 'CYCLE'
export type RoutePriorityType = 'GREEN' | 'SLOPE' | 'ROAD' | 'AMENITY' | 'OBSTRUCTION'
export type RouteStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type RouteNode = {
  nodeId: number
  longitude: number
  latitude: number
}

export type RouteAccepted = {
  requestId: string
  status: RouteStatus
}

export type NearbyFacility = {
  id?: number
  name?: string | null
  address?: string | null
  distanceMeters?: number
  longitude?: number
  latitude?: number
}

export type RouteResult = {
  requestId: string
  status: RouteStatus
  activityType: RouteActivityType
  priorityType: RoutePriorityType
  speedKmh: number
  startNodeId: number
  waypointNodeIds: number[]
  destinationNodeId: number
  geoJson: Record<string, unknown> | null
  totalDistanceMeters: number | null
  ownerCaloriesKcal: number | null
  petCaloriesKcal: number | null
  averageSlope: number | null
  durationMinutes: number | null
  nearbyFacilities: {
    toilets?: NearbyFacility[]
    poopBags?: NearbyFacility[]
    waterFountains?: NearbyFacility[]
    parks?: NearbyFacility[]
  } | null
  departureAt: string
  environmentInfo: {
    status?: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | 'NOT_CONFIGURED'
    weather?: Record<string, unknown> | null
    airQuality?: Record<string, unknown> | null
  } | null
  savedAt: string | null
  errorCode: string | null
  createdAt: string
  completedAt: string | null
}

export type RouteStatusNotification = {
  eventType: 'ROUTE_STATUS_CHANGED'
  requestId: string
  status: 'COMPLETED' | 'FAILED'
  errorCode: string | null
  completedAt: string
}
