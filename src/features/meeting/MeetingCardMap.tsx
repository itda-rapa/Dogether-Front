import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Feature from 'ol/Feature'
import Map from 'ol/Map'
import View from 'ol/View'
import Point from 'ol/geom/Point'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { fromLonLat } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { InlineRouteMapMessage } from '@/features/chat/InlineRouteMapMessage'
import { searchVWorld } from '@/features/map/api'
import type { MapPlace } from '@/features/map/types'
import 'ol/ol.css'

type Props = {
  roomId: number
  routeRequestId: string | null
  placeText: string
}

export function MeetingCardMap({ roomId, routeRequestId, placeText }: Props) {
  if (routeRequestId) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-semibold">산책 경로</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          약속에 연결된 산책 경로와 예상 거리·시간입니다.
        </p>
        <InlineRouteMapMessage roomId={roomId} routeId={routeRequestId} />
      </section>
    )
  }

  return <MeetingPlaceMap placeText={placeText} />
}

function MeetingPlaceMap({ placeText }: { placeText: string }) {
  const place = useQuery({
    queryKey: ['meeting-card', 'place-map', placeText],
    queryFn: ({ signal }) => searchVWorld(placeText, signal),
    enabled: placeText.trim().length > 0,
    retry: false,
    staleTime: 30 * 60_000,
  })
  const selected = useMemo(() => chooseBestPlace(placeText, place.data ?? []), [place.data, placeText])

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="p-4 pb-3">
        <h2 className="font-semibold">약속 장소</h2>
        <p className="mt-1 text-sm text-muted-foreground">저장된 장소를 지도에서 확인할 수 있습니다.</p>
      </div>
      <PlacePreview place={selected} />
      {place.isPending && <p className="px-4 pb-4 text-sm text-muted-foreground">장소 지도를 불러오고 있습니다…</p>}
      {place.isError && <p className="px-4 pb-4 text-sm text-destructive">장소 위치를 찾지 못했습니다.</p>}
      {!place.isPending && !place.isError && !selected && (
        <p className="px-4 pb-4 text-sm text-muted-foreground">검색된 지도 위치가 없습니다.</p>
      )}
      {selected && (
        <div className="border-t border-border px-4 py-3">
          <p className="font-semibold">{selected.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{selected.address ?? placeText}</p>
        </div>
      )}
    </section>
  )
}

function PlacePreview({ place }: { place: MapPlace | null }) {
  const targetRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerSourceRef = useRef(new VectorSource())

  useEffect(() => {
    if (!targetRef.current || mapRef.current) return
    const key = import.meta.env.VITE_VWORLD_API_KEY as string | undefined
    const layers = []
    if (key) {
      layers.push(new TileLayer({
        source: new XYZ({
          url: `https://api.vworld.kr/req/wmts/1.0.0/${key}/Base/{z}/{y}/{x}.png`,
          crossOrigin: 'anonymous',
        }),
      }))
    }
    layers.push(new VectorLayer({
      source: markerSourceRef.current,
      style: new Style({
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({ color: '#0f766e' }),
          stroke: new Stroke({ color: '#ffffff', width: 4 }),
        }),
      }),
    }))
    const map = new Map({
      target: targetRef.current,
      layers,
      controls: [],
      view: new View({ center: fromLonLat([126.978, 37.5665]), zoom: 14 }),
    })
    mapRef.current = map
    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const source = markerSourceRef.current
    source.clear()
    if (!place) return
    const coordinate = fromLonLat([place.longitude, place.latitude])
    source.addFeature(new Feature({ geometry: new Point(coordinate) }))
    mapRef.current?.getView().animate({ center: coordinate, zoom: 16, duration: 250 })
  }, [place])

  return <div ref={targetRef} className="h-64 w-full bg-primary-subtle" aria-label="약속 장소 지도" />
}

function chooseBestPlace(query: string, places: MapPlace[]) {
  if (places.length === 0) return null
  const normalized = query.replace(/\s/g, '').toLowerCase()
  return [...places].sort((left, right) => score(right, normalized) - score(left, normalized))[0]
}

function score(place: MapPlace, query: string) {
  const name = place.name.replace(/\s/g, '').toLowerCase()
  const address = (place.address ?? '').replace(/\s/g, '').toLowerCase()
  if (name === query) return 4
  if (query.includes(name) || name.includes(query)) return 3
  if (address && (query.includes(address) || address.includes(query))) return 2
  return 0
}
