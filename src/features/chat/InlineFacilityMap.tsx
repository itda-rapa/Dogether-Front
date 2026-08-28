import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Sparkle, X } from '@phosphor-icons/react'
import { createChatMapMessage } from './api'
import { MapCanvas } from '@/features/map/MapCanvas'
import type { CulturalFacilityCategory, MapCenter, MapPlace } from '@/features/map/types'
import type { ChatMessage } from './types'
import type { PlaceKeyword } from './placeSuggestion'

type Props = {
  roomId: number
  triggerMessageId: number
  category: CulturalFacilityCategory
  keyword: PlaceKeyword
  onDismiss: () => void
  onShared: (message: ChatMessage) => void
}

export function InlineFacilityMap({ roomId, triggerMessageId, category, keyword, onDismiss, onShared }: Props) {
  const [center, setCenter] = useState<MapCenter | null>(null)
  const [locationError, setLocationError] = useState<'denied' | 'unavailable' | null>(null)
  const [locateRequest, setLocateRequest] = useState(1)
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null)
  const sharedMessage = useQuery({
    queryKey: ['chat', 'map-message', roomId, triggerMessageId, category, center],
    queryFn: () => createChatMapMessage(roomId, {
      triggerMessageId,
      category,
      longitude: center!.longitude,
      latitude: center!.latitude,
    }),
    enabled: center != null,
    retry: false,
  })
  useEffect(() => {
    if (sharedMessage.data) onShared(sharedMessage.data)
  }, [onShared, sharedMessage.data])

  const places = useMemo<MapPlace[]>(() => (sharedMessage.data?.map?.facilities ?? []).map((facility) => ({
    placeId: facility.facilityId,
    type: category,
    name: facility.name ?? `${keyword} 시설`,
    address: facility.address,
    phoneNumber: facility.telephone,
    status: facility.operatingHours,
    longitude: facility.longitude,
    latitude: facility.latitude,
    distanceMeters: facility.distanceMeters,
  })), [category, keyword, sharedMessage.data?.map?.facilities])
  const visiblePlace = selectedPlace ?? places[0] ?? null
  const ignoreBounds = useCallback(() => {}, [])
  const ignoreReady = useCallback(() => {}, [])

  useEffect(() => {
    if (!navigator.permissions?.query) return
    let status: PermissionStatus | null = null
    const retryWhenGranted = () => {
      if (status?.state !== 'granted') return
      setLocationError(null)
      setLocateRequest((request) => request + 1)
    }
    void navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
      status = permission
      permission.addEventListener('change', retryWhenGranted)
    }).catch(() => undefined)
    return () => status?.removeEventListener('change', retryWhenGranted)
  }, [])

  const retryLocation = () => {
    setLocationError(null)
    setLocateRequest((request) => request + 1)
  }

  return (
    <section className="mt-2 overflow-hidden rounded-2xl border border-primary/30 bg-surface shadow-sm" aria-label={`${keyword} 주변 지도`}>
      <header className="px-3 py-2">
        <div className="flex items-center gap-2">
          <MapPin size={18} weight="fill" className="text-primary-strong" />
          <strong className="min-w-0 flex-1 truncate text-[14px]">가장 가까운 {keyword} 5곳</strong>
          <button type="button" onClick={onDismiss} aria-label="주변 시설 지도 닫기" className="grid size-9 place-items-center rounded-lg hover:bg-primary-subtle">
            <X size={18} />
          </button>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Sparkle size={13} weight="fill" className="shrink-0 text-primary-strong" aria-hidden="true" />
          AI가 채팅 내용을 분석해 검색한 장소 정보입니다.
        </p>
      </header>
      <div className="relative h-64 border-y border-border bg-primary-subtle">
        <MapCanvas
          places={places}
          selectedPlace={selectedPlace}
          onSelectPlace={setSelectedPlace}
          onBoundsChange={ignoreBounds}
          locateRequest={locateRequest}
          onLocationResult={(result, location) => {
            if (result === 'found' && location) { setCenter(location); setLocationError(null) }
            else if (result !== 'found') setLocationError(result)
          }}
          onMapReady={ignoreReady}
        />
        {center == null && locationError == null && <MapNotice>현재 위치를 확인하고 있어요…</MapNotice>}
        {locationError && (
          <MapNotice alert>
            <span>{locationError === 'denied' ? '브라우저의 위치 권한을 허용해 주세요.' : '현재 위치를 확인하지 못했습니다.'}</span>
            <button type="button" onClick={retryLocation} className="ml-2 rounded-md bg-primary px-2 py-1 font-semibold text-on-primary">위치 다시 확인</button>
          </MapNotice>
        )}
        {center != null && sharedMessage.isPending && <MapNotice>지도 메시지를 공유하고 있어요…</MapNotice>}
        {sharedMessage.isError && <MapNotice alert>지도 메시지를 공유하지 못했습니다.</MapNotice>}
      </div>
      {visiblePlace && (
        <div className="p-3 text-[13px]">
          <p className="font-semibold">{visiblePlace.name}</p>
          <p className="mt-0.5 truncate text-muted-foreground">{visiblePlace.address ?? '주소 정보 없음'} · {formatDistance(visiblePlace.distanceMeters)}</p>
        </div>
      )}
    </section>
  )
}

function MapNotice({ children, alert = false }: { children: React.ReactNode; alert?: boolean }) {
  return <p role={alert ? 'alert' : 'status'} className="absolute inset-x-3 top-3 z-10 rounded-lg bg-surface/95 p-2 text-center text-[13px] shadow">{children}</p>
}

function formatDistance(distance: number | null) {
  if (distance == null) return '거리 정보 없음'
  return distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`
}
