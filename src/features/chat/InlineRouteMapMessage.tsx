import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import GeoJSON from 'ol/format/GeoJSON'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'
import { getSharedRoute } from '@/features/route/api'
import type { RouteResult } from '@/features/route/types'
import { prepareRouteLineFeatures, routeLineStyles } from '@/features/route/routeLineStyle'
import 'ol/ol.css'

export function InlineRouteMapMessage({ roomId, routeId }: { roomId: number; routeId: string }) {
  const route = useQuery({
    queryKey: ['chat', 'shared-route', roomId, routeId],
    queryFn: ({ signal }) => getSharedRoute(roomId, routeId, signal),
    retry: false,
    staleTime: 60_000,
  })

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-muted">
      <RoutePreview geoJson={route.data?.geoJson ?? null} />
      <div className="grid grid-cols-2 gap-2 px-3 py-2 text-xs">
        <p><span className="text-muted-foreground">거리</span><br /><strong>{route.data?.totalDistanceMeters == null ? '-' : `${(route.data.totalDistanceMeters / 1000).toFixed(2)} km`}</strong></p>
        <p><span className="text-muted-foreground">예상시간</span><br /><strong>{route.data?.durationMinutes == null ? '-' : `${Math.round(route.data.durationMinutes)}분`}</strong></p>
        <p><span className="text-muted-foreground">운동 종류</span><br /><strong>{activityLabel(route.data?.activityType)}</strong></p>
      </div>
      {route.data && (
        <div className="border-t border-border px-3 py-2 text-xs">
          <p>
            <span className="text-muted-foreground">예정 시각</span><br />
            <strong>{formatDateTime(route.data.departureAt)}</strong>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <p>
              <span className="text-muted-foreground">날씨</span><br />
              <strong>{weatherLabel(route.data.environmentInfo?.weather)}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">미세먼지</span><br />
              <strong>{airQualityLabel(route.data.environmentInfo?.airQuality)}</strong>
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">기상·미세먼지는 예정 시점의 참고 정보입니다.</p>
        </div>
      )}
      {route.isPending && <p className="px-3 pb-3 text-xs text-muted-foreground">경로 지도를 불러오고 있습니다…</p>}
      {route.isError && <p className="px-3 pb-3 text-xs text-destructive">경로 지도를 불러오지 못했습니다.</p>}
    </div>
  )
}

function activityLabel(activity: RouteResult['activityType'] | undefined) {
  if (activity === 'RUN') return '러닝'
  if (activity === 'CYCLE') return '자전거'
  if (activity === 'WALK') return '걷기'
  return '-'
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit',
  })
}

function weatherLabel(weather: Record<string, unknown> | null | undefined) {
  if (weather?.status === 'AVAILABLE') return String(weather.summary ?? '예보 제공')
  return providerStatusLabel(weather, 'WEATHER')
}

function airQualityLabel(air: Record<string, unknown> | null | undefined) {
  if (air?.status === 'AVAILABLE') return `PM10 ${String(air.pm10 ?? '-')} / PM2.5 ${String(air.pm25 ?? '-')}`
  return providerStatusLabel(air, 'AIR')
}

function providerStatusLabel(provider: Record<string, unknown> | null | undefined, kind: 'WEATHER' | 'AIR') {
  const status = String(provider?.status ?? '')
  if (status === 'KMA_APPLICATION_REQUIRED') return '기상청 활용승인 확인 필요'
  if (status === 'KEY_REJECTED') return '기상청 인증키 확인 필요'
  if (status === 'AIR_SERVICE_KEY_REJECTED') return '에어코리아 키 확인 필요'
  if (status === 'OUT_OF_RANGE') return '예보 범위 밖'
  if (status === 'NOT_CONFIGURED') return 'API 키 미설정'
  return kind === 'WEATHER' ? '날씨 조회 불가' : '미세먼지 조회 불가'
}

function RoutePreview({ geoJson }: { geoJson: Record<string, unknown> | null }) {
  const targetRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const routeSourceRef = useRef(new VectorSource())

  useEffect(() => {
    if (!targetRef.current || mapRef.current) return
    const key = import.meta.env.VITE_VWORLD_API_KEY as string | undefined
    const layers = []
    if (key) {
      layers.push(new TileLayer({ source: new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${key}/Base/{z}/{y}/{x}.png`, crossOrigin: 'anonymous' }) }))
    }
    layers.push(new VectorLayer({
      source: routeSourceRef.current,
      style: routeLineStyles,
    }))
    const map = new Map({
      target: targetRef.current,
      layers,
      controls: [],
      interactions: [],
      view: new View({ center: fromLonLat([126.978, 37.5665]), zoom: 13 }),
    })
    mapRef.current = map
    return () => { map.setTarget(undefined); mapRef.current = null }
  }, [])

  useEffect(() => {
    const source = routeSourceRef.current
    source.clear()
    if (!geoJson) return
    source.addFeatures(prepareRouteLineFeatures(new GeoJSON().readFeatures(geoJson, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })))
    const extent = source.getExtent()
    if (extent) mapRef.current?.getView().fit(extent, { padding: [20, 20, 20, 20], maxZoom: 16, duration: 250 })
  }, [geoJson])

  return <div ref={targetRef} className="h-44 w-full bg-primary-subtle" aria-label="공유된 경로 미리보기 지도" />
}
