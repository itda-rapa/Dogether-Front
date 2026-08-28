import { useEffect, useRef, useState } from 'react'
import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import Map from 'ol/Map'
import View from 'ol/View'
import Point from 'ol/geom/Point'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj'
import { defaults as defaultInteractions } from 'ol/interaction/defaults'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import type { NearbyFacility, RouteNode, RouteResult } from './types'
import type { MapBounds, MapPlace } from '@/features/map/types'
import { prepareRouteLineFeatures, routeLineStyles, SLOPE_LEGEND } from './routeLineStyle'
import 'ol/ol.css'

type Props = {
  start: RouteNode | null
  waypoints: RouteNode[]
  destination: RouteNode | null
  pendingSelection: { longitude: number; latitude: number; label: string; color: string } | null
  geoJson: Record<string, unknown> | null
  nearbyFacilities: RouteResult['nearbyFacilities']
  heatmapGeoJson: Record<string, unknown> | null
  mapTheme: 'DEFAULT' | 'ROUTE_HEATMAP'
  places: MapPlace[]
  selectedPlace: MapPlace | null
  onSelectPlace: (place: MapPlace | null) => void
  onBoundsChange: (bounds: MapBounds) => void
  onPointClick: (longitude: number, latitude: number) => void
  onDestinationDoubleClick: (longitude: number, latitude: number) => void
}

type FacilityKey = 'toilets' | 'poopBags' | 'waterFountains' | 'parks'

const FACILITY_STYLES: Record<FacilityKey, { label: string; marker: string; color: string }> = {
  toilets: { label: '화장실', marker: '화', color: '#2563eb' },
  poopBags: { label: '배변봉투함', marker: '봉', color: '#7c3aed' },
  waterFountains: { label: '급수대', marker: '수', color: '#0891b2' },
  parks: { label: '공원', marker: '공', color: '#16a34a' },
}

type FacilityPopup = { facility: NearbyFacility; type: FacilityKey } | null

export function RoutePlannerMap({ start, waypoints, destination, pendingSelection, geoJson, nearbyFacilities, heatmapGeoJson, mapTheme, places, selectedPlace, onSelectPlace, onBoundsChange, onPointClick, onDestinationDoubleClick }: Props) {
  const targetRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const [facilityPopup, setFacilityPopup] = useState<FacilityPopup>(null)
  const markerSource = useRef(new VectorSource())
  const routeSource = useRef(new VectorSource())
  const heatmapSource = useRef(new VectorSource())
  const baseLayerRef = useRef<TileLayer<XYZ> | null>(null)
  const heatmapLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const placeSource = useRef(new VectorSource())
  const facilitySource = useRef(new VectorSource())
  const placeLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const selectedPlaceRef = useRef<MapPlace | null>(selectedPlace)
  const clickRef = useRef({ onPointClick, onDestinationDoubleClick, onSelectPlace, onBoundsChange })
  clickRef.current = { onPointClick, onDestinationDoubleClick, onSelectPlace, onBoundsChange }

  useEffect(() => {
    if (!targetRef.current || mapRef.current) return
    const key = import.meta.env.VITE_VWORLD_API_KEY as string | undefined
    const layers = []
    if (key) {
      const baseLayer = new TileLayer({
        source: new XYZ({
          url: `https://api.vworld.kr/req/wmts/1.0.0/${key}/Base/{z}/{y}/{x}.png`,
          crossOrigin: 'anonymous',
        }),
      })
      baseLayerRef.current = baseLayer
      layers.push(baseLayer)
    }
    const placeLayer = new VectorLayer({
        source: placeSource.current,
        style: (feature) => {
          const place = feature.get('place') as MapPlace
          const selected = selectedPlaceRef.current?.placeId === place.placeId && selectedPlaceRef.current?.type === place.type
          return new Style({
            image: new CircleStyle({ radius: selected ? 12 : 9, fill: new Fill({ color: place.type === 'HOSPITAL' ? '#ef4444' : place.type === 'PHARMACY' ? '#8b5cf6' : '#0f766e' }), stroke: new Stroke({ color: '#fff', width: selected ? 4 : 3 }) }),
          })
        },
        zIndex: 4,
      })
    const facilityLayer = new VectorLayer({
      source: facilitySource.current,
      style: (feature) => {
        const type = feature.get('facilityType') as FacilityKey
        const style = FACILITY_STYLES[type]
        return new Style({
          image: new CircleStyle({ radius: 13, fill: new Fill({ color: style.color }), stroke: new Stroke({ color: '#fff', width: 3 }) }),
          text: new Text({ text: style.marker, fill: new Fill({ color: '#fff' }), font: '700 11px Pretendard' }),
        })
      },
      zIndex: 7,
    })
    layers.push(
      placeLayer,
      new VectorLayer({ source: routeSource.current, style: routeLineStyles, zIndex: 5 }),
      facilityLayer,
      new VectorLayer({
        source: markerSource.current,
        style: (feature) => new Style({
          image: new CircleStyle({ radius: 14, fill: new Fill({ color: feature.get('color') }), stroke: new Stroke({ color: '#fff', width: 3 }) }),
          text: new Text({ text: feature.get('label'), fill: new Fill({ color: '#fff' }), font: '700 12px Pretendard' }),
        }),
        zIndex: 10,
      }),
    )
    const heatmapLayer = new VectorLayer({
      source: heatmapSource.current,
      style: (feature) => {
        const intensity = Math.max(0, Math.min(1, Number(feature.get('heatIntensity') ?? 0)))
        const coreColor = intensity > 0.82
          ? `rgba(255, 255, 225, ${0.72 + intensity * 0.28})`
          : intensity > 0.38
            ? `rgba(255, ${Math.round(75 + intensity * 150)}, 0, ${0.58 + intensity * 0.35})`
            : `rgba(255, 0, ${Math.round(125 - intensity * 80)}, ${0.4 + intensity * 0.4})`
        return [
          new Style({ stroke: new Stroke({ color: `rgba(255, 0, 105, ${0.08 + intensity * 0.28})`, width: 10 + intensity * 16 }) }),
          new Style({ stroke: new Stroke({ color: `rgba(255, 55, 0, ${0.18 + intensity * 0.48})`, width: 5 + intensity * 7 }) }),
          new Style({ stroke: new Stroke({ color: coreColor, width: 1.5 + intensity * 3 }) }),
        ]
      },
      visible: false,
      zIndex: 3,
    })
    heatmapLayerRef.current = heatmapLayer
    layers.splice(baseLayerRef.current ? 1 : 0, 0, heatmapLayer)
    const map = new Map({
      target: targetRef.current,
      layers,
      interactions: defaultInteractions({ doubleClickZoom: false }),
      view: new View({ center: fromLonLat([126.978, 37.5665]), zoom: 14, minZoom: 7, maxZoom: 19 }),
    })
    placeLayerRef.current = placeLayer
    const publishBounds = () => {
      const size = map.getSize()
      if (!size) return
      const extent = transformExtent(map.getView().calculateExtent(size), 'EPSG:3857', 'EPSG:4326')
      clickRef.current.onBoundsChange({ minLongitude: extent[0], minLatitude: extent[1], maxLongitude: extent[2], maxLatitude: extent[3] })
    }
    map.on('moveend', publishBounds)
    map.on('singleclick', (event) => {
      const selectedFeature = map.forEachFeatureAtPixel(event.pixel, (feature) => {
        if (feature.get('facility') || feature.get('place')) return feature
        return undefined
      }, { hitTolerance: 8 })
      if (selectedFeature?.get('facility')) {
        setFacilityPopup({
          facility: selectedFeature.get('facility') as NearbyFacility,
          type: selectedFeature.get('facilityType') as FacilityKey,
        })
        return
      }
      const placeFeature = selectedFeature?.get('place') ? selectedFeature : undefined
      if (placeFeature) {
        clickRef.current.onSelectPlace(placeFeature.get('place') as MapPlace)
        return
      }
      setFacilityPopup(null)
      const [longitude, latitude] = toLonLat(event.coordinate)
      clickRef.current.onPointClick(longitude, latitude)
    })
    map.on('dblclick', (event) => {
      event.preventDefault()
      const [longitude, latitude] = toLonLat(event.coordinate)
      clickRef.current.onDestinationDoubleClick(longitude, latitude)
    })
    mapRef.current = map
    requestAnimationFrame(publishBounds)
    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const heatmapEnabled = mapTheme === 'ROUTE_HEATMAP'
    heatmapLayerRef.current?.setVisible(heatmapEnabled)
    baseLayerRef.current?.setOpacity(heatmapEnabled ? 0.28 : 1)
    if (targetRef.current) targetRef.current.style.background = heatmapEnabled ? '#160d1d' : '#eef2ed'
  }, [mapTheme])

  useEffect(() => {
    heatmapSource.current.clear()
    if (!heatmapGeoJson) return
    const features = new GeoJSON().readFeatures(heatmapGeoJson, {
      dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857',
    })
    const logUsages = features.map((feature) => Math.log1p(Math.max(1, Number(feature.get('usageCount') ?? 1))))
    const minimum = Math.min(...logUsages)
    const maximum = Math.max(...logUsages)
    const range = maximum - minimum
    features.forEach((feature, index) => {
      feature.set('heatIntensity', range > 0 ? (logUsages[index] - minimum) / range : 1)
    })
    heatmapSource.current.addFeatures(features)
  }, [heatmapGeoJson])

  useEffect(() => {
    placeSource.current.clear()
    placeSource.current.addFeatures(places.map((place) => new Feature({
      geometry: new Point(fromLonLat([place.longitude, place.latitude])),
      place,
    })))
  }, [places])

  useEffect(() => {
    facilitySource.current.clear()
    setFacilityPopup(null)
    if (!nearbyFacilities) return

    const occupiedCoordinates = new Set<string>()
    const keys = Object.keys(FACILITY_STYLES) as FacilityKey[]
    const features: Feature<Point>[] = []
    for (const type of keys) {
      for (const facility of nearbyFacilities[type] ?? []) {
        const longitude = Number(facility.longitude)
        const latitude = Number(facility.latitude)
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue
        const coordinateKey = `${longitude.toFixed(5)}:${latitude.toFixed(5)}`
        if (occupiedCoordinates.has(coordinateKey)) continue
        occupiedCoordinates.add(coordinateKey)
        features.push(new Feature({
          geometry: new Point(fromLonLat([longitude, latitude])),
          facility,
          facilityType: type,
        }))
      }
    }
    facilitySource.current.addFeatures(features)
  }, [nearbyFacilities])

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace
    placeLayerRef.current?.changed()
    if (!selectedPlace) return
    mapRef.current?.getView().animate({
      center: fromLonLat([selectedPlace.longitude, selectedPlace.latitude]),
      zoom: Math.max(mapRef.current?.getView().getZoom() ?? 14, 16),
      duration: 250,
    })
  }, [selectedPlace])

  useEffect(() => {
    markerSource.current.clear()
    const add = (node: RouteNode | null, label: string, color: string) => {
      if (!node) return
      markerSource.current.addFeature(new Feature({
        geometry: new Point(fromLonLat([node.longitude, node.latitude])), label, color,
      }))
    }
    add(start, '출', '#2563eb')
    waypoints.forEach((waypoint, index) => add(waypoint, `경${index + 1}`, '#d97706'))
    add(destination, '도', '#dc2626')
    if (pendingSelection) {
      markerSource.current.addFeature(new Feature({
        geometry: new Point(fromLonLat([
          pendingSelection.longitude,
          pendingSelection.latitude,
        ])),
        label: pendingSelection.label,
        color: pendingSelection.color,
      }))
    }
  }, [start, waypoints, destination, pendingSelection])

  useEffect(() => {
    routeSource.current.clear()
    if (!geoJson) return
    const features = prepareRouteLineFeatures(new GeoJSON().readFeatures(geoJson, {
      dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857',
    }), start ? fromLonLat([start.longitude, start.latitude]) : undefined)
    routeSource.current.addFeatures(features)
    const extent = routeSource.current.getExtent()
    if (extent) {
      mapRef.current?.getView().fit(extent, { padding: [80, 40, 260, 40], duration: 350, maxZoom: 17 })
    }
  }, [geoJson, start])

  return <div className="absolute inset-0" aria-label="한 번 클릭으로 출발지와 경유지, 더블클릭으로 목적지를 선택하는 지도">
    <div ref={targetRef} className="absolute inset-0" />
    {geoJson && (
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-xl border border-border bg-surface/95 p-3 shadow-lg" aria-label="경사도 색상 범례">
        <p className="mb-2 text-xs font-bold">경사도 · 진행방향 ➤</p>
        <ul className="grid gap-1 text-[11px] text-muted-foreground">
          {SLOPE_LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className="h-1.5 w-6 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    )}
    <div className={facilityPopup ? 'absolute left-1/2 top-20 z-30 w-[min(280px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-surface p-3 shadow-xl' : 'hidden'} role="dialog" aria-label="인접 시설 정보">
      {facilityPopup && <>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: FACILITY_STYLES[facilityPopup.type].color }}>{FACILITY_STYLES[facilityPopup.type].marker}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold" style={{ color: FACILITY_STYLES[facilityPopup.type].color }}>{FACILITY_STYLES[facilityPopup.type].label}</p>
            <p className="break-words font-semibold">{facilityPopup.facility.name?.trim() || FACILITY_STYLES[facilityPopup.type].label}</p>
          </div>
          <button type="button" aria-label="시설 정보 닫기" onClick={() => setFacilityPopup(null)} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted"><span aria-hidden="true">×</span></button>
        </div>
        <dl className="mt-2 space-y-1 text-xs">
          <div><dt className="sr-only">주소</dt><dd className="break-words text-muted-foreground">{facilityPopup.facility.address?.trim() || '주소 정보 없음'}</dd></div>
          <div className="flex gap-1"><dt className="text-muted-foreground">경로에서 거리</dt><dd className="font-semibold">{facilityPopup.facility.distanceMeters == null ? '정보 없음' : `${Math.round(facilityPopup.facility.distanceMeters).toLocaleString()} m`}</dd></div>
        </dl>
      </>}
    </div>
  </div>
}
