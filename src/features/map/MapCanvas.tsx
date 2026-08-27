import { useEffect, useRef } from 'react'
import Feature from 'ol/Feature'
import Map from 'ol/Map'
import View from 'ol/View'
import Point from 'ol/geom/Point'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { defaults as defaultControls } from 'ol/control/defaults'
import { boundingExtent } from 'ol/extent'
import { fromLonLat, transformExtent } from 'ol/proj'
import Cluster from 'ol/source/Cluster'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import type { MapBounds, MapCenter, MapPlace, MapPlaceType } from './types'
import 'ol/ol.css'

const SEOUL_CENTER = fromLonLat([126.978, 37.5665])

type Props = {
  places: MapPlace[]
  selectedPlace: MapPlace | null
  onSelectPlace: (place: MapPlace | null) => void
  onBoundsChange: (bounds: MapBounds) => void
  locateRequest: number
  onLocationResult: (result: 'found' | 'denied' | 'unavailable', center?: MapCenter) => void
  onMapReady: (actions: { zoomIn: () => void; zoomOut: () => void }) => void
  fitPlaces?: boolean
}

function mapColor(type: MapPlaceType) {
  const styles = getComputedStyle(document.documentElement)
  const token = type === 'HOSPITAL'
    ? '--dg-map-hospital'
    : type === 'PHARMACY'
      ? '--dg-map-pharmacy'
      : '--dg-primary-strong'
  return styles.getPropertyValue(token).trim()
}

export function MapCanvas({
  places,
  selectedPlace,
  onSelectPlace,
  onBoundsChange,
  locateRequest,
  onLocationResult,
  onMapReady,
  fitPlaces = false,
}: Props) {
  const targetRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const placeLayerRef = useRef<VectorLayer<Cluster<Feature<Point>>> | null>(null)
  const placeSourceRef = useRef(new VectorSource<Feature<Point>>())
  const userSourceRef = useRef(new VectorSource<Feature<Point>>())
  const selectedPlaceRef = useRef<MapPlace | null>(selectedPlace)
  const callbacksRef = useRef({ onSelectPlace, onBoundsChange, onLocationResult, onMapReady })
  const vworldKeyRef = useRef(import.meta.env.VITE_VWORLD_API_KEY as string | undefined)

  callbacksRef.current = { onSelectPlace, onBoundsChange, onLocationResult, onMapReady }

  useEffect(() => {
    if (!targetRef.current || mapRef.current) return

    const clusterSource = new Cluster({ distance: 44, minDistance: 18, source: placeSourceRef.current })
    const styleCache = new globalThis.Map<string, Style>()

    const placeLayer = new VectorLayer({
      source: clusterSource,
      declutter: true,
      style: (cluster) => {
        const members = cluster.get('features') as Feature<Point>[]
        const count = members.length
        const member = members[0]
        const place = member?.get('place') as MapPlace | undefined
        const placeType = place?.type ?? 'HOSPITAL'
        const currentSelection = selectedPlaceRef.current
        const isSelected = place != null && count === 1 && place.placeId === currentSelection?.placeId && place.type === currentSelection.type
        const cacheKey = `${placeType}-${count}-${isSelected}`
        let style = styleCache.get(cacheKey)
        if (!style) {
          const color = mapColor(placeType)
          style = new Style({
            image: new CircleStyle({
              radius: count > 1 ? 19 : isSelected ? 17 : 14,
              fill: new Fill({ color }),
              stroke: new Stroke({ color: '#ffffff', width: isSelected ? 4 : 3 }),
            }),
            text: new Text({
              text: count > 1 ? String(count) : placeType === 'HOSPITAL' ? '+' : placeType === 'PHARMACY' ? 'P' : '●',
              font: `700 ${count > 99 ? 11 : 13}px Pretendard`,
              fill: new Fill({ color: '#ffffff' }),
            }),
            zIndex: isSelected ? 5 : count > 1 ? 3 : 2,
          })
          styleCache.set(cacheKey, style)
        }
        return style
      },
    })
    placeLayerRef.current = placeLayer

    const userLayer = new VectorLayer({
      source: userSourceRef.current,
      style: new Style({
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({ color: '#2563eb' }),
          stroke: new Stroke({ color: '#ffffff', width: 4 }),
        }),
      }),
      zIndex: 10,
    })

    const layers = []
    if (vworldKeyRef.current) {
      layers.push(
        new TileLayer({
          source: new XYZ({
            url: `https://api.vworld.kr/req/wmts/1.0.0/${vworldKeyRef.current}/Base/{z}/{y}/{x}.png`,
            attributions: '© VWorld',
            crossOrigin: 'anonymous',
          }),
        }),
      )
    }
    layers.push(placeLayer, userLayer)

    const map = new Map({
      target: targetRef.current,
      layers,
      controls: defaultControls({ zoom: false, rotate: false }),
      view: new View({ center: SEOUL_CENTER, zoom: 14, minZoom: 6, maxZoom: 19 }),
    })
    mapRef.current = map

    const publishBounds = () => {
      const size = map.getSize()
      if (!size) return
      const extent = transformExtent(map.getView().calculateExtent(size), 'EPSG:3857', 'EPSG:4326')
      callbacksRef.current.onBoundsChange({
        minLongitude: Number(extent[0].toFixed(6)),
        minLatitude: Number(extent[1].toFixed(6)),
        maxLongitude: Number(extent[2].toFixed(6)),
        maxLatitude: Number(extent[3].toFixed(6)),
      })
    }

    map.on('moveend', publishBounds)
    map.on('click', (event) => {
      const cluster = map.forEachFeatureAtPixel(event.pixel, (feature) => feature)
      const members = cluster?.get('features') as Feature<Point>[] | undefined
      if (!members?.length) {
        callbacksRef.current.onSelectPlace(null)
        return
      }
      if (members.length === 1) {
        callbacksRef.current.onSelectPlace(members[0].get('place') as MapPlace)
        return
      }
      const extent = boundingExtent(members.map((feature) => feature.getGeometry()!.getCoordinates()))
      map.getView().fit(extent, { duration: 250, maxZoom: 17, padding: [80, 80, 80, 80] })
    })
    map.on('pointermove', (event) => {
      if (targetRef.current) targetRef.current.style.cursor = map.hasFeatureAtPixel(event.pixel) ? 'pointer' : ''
    })
    callbacksRef.current.onMapReady({
      zoomIn: () => map.getView().animate({ zoom: Math.min((map.getView().getZoom() ?? 14) + 1, 19), duration: 180 }),
      zoomOut: () => map.getView().animate({ zoom: Math.max((map.getView().getZoom() ?? 14) - 1, 6), duration: 180 }),
    })
    requestAnimationFrame(() => {
      map.updateSize()
      publishBounds()
    })

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      placeLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const source = placeSourceRef.current
    source.clear()
    source.addFeatures(
      places.map((place) => {
        const feature = new Feature({
          geometry: new Point(fromLonLat([place.longitude, place.latitude])),
          place,
        })
        feature.setId(`${place.type}-${place.placeId}`)
        return feature
      }),
    )
    const map = mapRef.current
    if (fitPlaces && map && places.length > 0) {
      const extent = boundingExtent(
        places.map((place) => fromLonLat([place.longitude, place.latitude])),
      )
      map.getView().fit(extent, {
        duration: 250,
        maxZoom: 16,
        padding: [45, 45, 45, 45],
      })
    }
  }, [fitPlaces, places])

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace
    placeLayerRef.current?.changed()
    const map = mapRef.current
    if (!map || !selectedPlace) return
    map.getView().animate({
      center: fromLonLat([selectedPlace.longitude, selectedPlace.latitude]),
      zoom: Math.max(map.getView().getZoom() ?? 14, 16),
      duration: 250,
    })
  }, [selectedPlace])

  useEffect(() => {
    if (locateRequest === 0) return
    const map = mapRef.current
    if (!map || !('geolocation' in navigator)) {
      callbacksRef.current.onLocationResult('denied')
      return
    }
    const found = ({ coords }: GeolocationPosition) => {
      const coordinate = fromLonLat([coords.longitude, coords.latitude])
      userSourceRef.current.clear()
      userSourceRef.current.addFeature(new Feature(new Point(coordinate)))
      map.getView().animate({ center: coordinate, zoom: 16, duration: 350 })
      callbacksRef.current.onLocationResult('found', {
        longitude: coords.longitude,
        latitude: coords.latitude,
      })
    }
    navigator.geolocation.getCurrentPosition(
      found,
      (highAccuracyError) => {
        if (highAccuracyError.code === highAccuracyError.PERMISSION_DENIED) {
          callbacksRef.current.onLocationResult('denied')
          return
        }
        // GPS가 없는 데스크톱에서는 고정밀 조회가 시간 초과될 수 있다.
        // 이때 Wi-Fi/네트워크 기반의 일반 위치 조회를 한 번 더 시도한다.
        navigator.geolocation.getCurrentPosition(
          found,
          (fallbackError) => callbacksRef.current.onLocationResult(
            fallbackError.code === fallbackError.PERMISSION_DENIED ? 'denied' : 'unavailable',
          ),
          { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
        )
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }, [locateRequest])

  return <div ref={targetRef} className="absolute inset-0" aria-label="현재 위치 주변 시설 지도" />
}
