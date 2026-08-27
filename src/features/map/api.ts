import { apiRequest } from '@/lib/api'
import type { BackendMapPlaceType, CulturalFacility, CulturalFacilityCategory, MapBounds, MapCenter, MapPlace } from './types'

export function listMapPlaces(type: BackendMapPlaceType, bounds: MapBounds, signal?: AbortSignal) {
  const params = new URLSearchParams({
    type,
    minLongitude: bounds.minLongitude.toString(),
    minLatitude: bounds.minLatitude.toString(),
    maxLongitude: bounds.maxLongitude.toString(),
    maxLatitude: bounds.maxLatitude.toString(),
  })

  return apiRequest<MapPlace[]>(`/map/places?${params}`, { signal })
}

export function listNearbyMapPlaces(
  type: BackendMapPlaceType,
  center: MapCenter,
  signal?: AbortSignal,
) {
  return apiRequest<MapPlace[]>('/map/places/nearby', {
    method: 'POST',
    body: {
      type,
      longitude: center.longitude,
      latitude: center.latitude,
      radiusMeters: 3000,
    },
    signal,
  })
}

export function listNearbyCulturalFacilities(category: CulturalFacilityCategory, center: MapCenter, signal?: AbortSignal) {
  return apiRequest<CulturalFacility[]>('/map/cultural-facilities/nearby', {
    method: 'POST',
    body: { category, longitude: center.longitude, latitude: center.latitude },
    signal,
  })
}

type VWorldSearchItem = {
  id?: string
  title?: string
  category?: string
  address?: {
    road?: string
    parcel?: string
    bldnm?: string
  }
  point?: { x?: string; y?: string }
}

type VWorldSearchResponse = {
  response?: {
    status?: 'OK' | 'NOT_FOUND' | 'ERROR'
    result?: { items?: VWorldSearchItem[] }
    error?: { text?: string }
  }
}

type VWorldSearchType = { type: 'place' } | { type: 'address'; category: 'road' | 'parcel' }

// 브라우저에서 VWorld를 직접 호출하면 응답에 CORS 헤더가 없어 차단된다.
// 개발(Vite)과 배포(Nginx)가 같은 출처의 이 경로를 VWorld로 프록시한다.
const VWORLD_SEARCH_URL = '/vworld-api/req/search'

/** VWorld 검색 API 2.0의 장소·도로명주소·지번주소 결과를 하나의 목록으로 합친다. */
export async function searchVWorld(query: string, signal?: AbortSignal): Promise<MapPlace[]> {
  const key = import.meta.env.VITE_VWORLD_API_KEY as string | undefined
  if (!key) throw new Error('VWorld API 키가 설정되지 않았습니다.')

  const searchTypes: VWorldSearchType[] = [
    { type: 'place' },
    { type: 'address', category: 'road' },
    { type: 'address', category: 'parcel' },
  ]

  const responses = await Promise.all(
    searchTypes.map(async (searchType) => {
      const params = new URLSearchParams({
        service: 'search',
        request: 'search',
        version: '2.0',
        crs: 'EPSG:4326',
        size: searchType.type === 'place' ? '10' : '5',
        page: '1',
        query,
        type: searchType.type,
        format: 'json',
        errorformat: 'json',
        key,
      })
      if ('category' in searchType) params.set('category', searchType.category)

      const response = await fetch(`${VWORLD_SEARCH_URL}?${params}`, { signal })
      if (!response.ok) throw new Error('VWorld 검색 요청에 실패했습니다.')
      const body = (await response.json()) as VWorldSearchResponse
      if (body.response?.status === 'ERROR') {
        throw new Error(body.response.error?.text ?? 'VWorld 검색 요청에 실패했습니다.')
      }
      return { searchType, items: body.response?.result?.items ?? [] }
    }),
  )

  const seen = new Set<string>()
  return responses.flatMap(({ searchType, items }) =>
    items.flatMap((item) => {
      const longitude = Number(item.point?.x)
      const latitude = Number(item.point?.y)
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return []

      const address = item.address?.road || item.address?.parcel || null
      const rawName = item.title || item.address?.bldnm || address || query
      const name = rawName.replace(/<[^>]*>/g, '')
      const dedupeKey = `${name}-${longitude}-${latitude}`
      if (seen.has(dedupeKey)) return []
      seen.add(dedupeKey)

      return [{
        placeId: seen.size,
        type: 'VWORLD' as const,
        name,
        address,
        phoneNumber: null,
        status: searchType.type === 'place' ? item.category || '장소' : '주소',
        longitude,
        latitude,
        distanceMeters: null,
      }]
    }),
  ).slice(0, 20)
}
