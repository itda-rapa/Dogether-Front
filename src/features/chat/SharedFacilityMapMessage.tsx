import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { CalendarPlus, Clock, MapPin, Phone, UsersThree, X } from '@phosphor-icons/react'
import { MapCanvas } from '@/features/map/MapCanvas'
import type { MapPlace } from '@/features/map/types'
import type { ChatMapFacility, ChatMapMessage } from './types'
import { keywordFromPlaceType } from './placeSuggestion'
import { createOpenChatPlaceDraft, shareChatMapLocation } from './api'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api'

export function SharedFacilityMapMessage({
  map,
  roomId,
  messageId,
  senderNickname,
  /**
   * "이 장소로 약속 만들기"는 오픈챗 전용 `POST /chat/rooms/open/{roomId}/place-drafts`를
   * 부른다 — DIRECT 방에는 그 엔드포인트가 없다. DIRECT에서는 이 버튼 자체를 숨긴다
   * (거짓으로 실패하는 버튼을 보여주는 대신). 기본값은 기존 오픈챗 동작 유지.
   */
  allowPlaceDraft = true,
}: {
  map: ChatMapMessage
  roomId: number
  messageId: number
  senderNickname: string | null
  allowPlaceDraft?: boolean
}) {
  const navigate = useNavigate()
  const [liveMap, setLiveMap] = useState(map)
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'shared'>('idle')
  const [locationError, setLocationError] = useState<string | null>(null)
  const keyword = keywordFromPlaceType(liveMap.category) ?? '시설'
  const places = useMemo<MapPlace[]>(() => liveMap.facilities.map((facility) => ({
    placeId: facility.facilityId,
    type: liveMap.category,
    name: facility.name ?? `${keyword} 시설`,
    address: facility.address,
    phoneNumber: facility.telephone,
    status: facility.operatingHours,
    longitude: facility.longitude,
    latitude: facility.latitude,
    distanceMeters: facility.averageDistanceMeters ?? facility.distanceMeters,
  })), [keyword, liveMap])
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null)
  const [detailPlace, setDetailPlace] = useState<MapPlace | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const createDraft = useMutation({
    mutationFn: (place: MapPlace) => createOpenChatPlaceDraft(roomId, {
      placeText: [place.name, place.address].filter(Boolean).join(' · '),
      cardType: liveMap.category === 'HOSPITAL' ? 'HOSPITAL' : 'OTHER',
    }),
    onSuccess: (draft) => {
      navigate(`/chat/${roomId}/meeting/new?draftId=${draft.draftId}&openChat=true`)
    },
  })
  const shareLocation = useMutation({
    mutationFn: (location: { longitude: number; latitude: number }) =>
      shareChatMapLocation(roomId, messageId, location),
    onSuccess: (message) => {
      if (message.map) setLiveMap(message.map)
      setLocationState('shared')
      setLocationError(null)
    },
    onError: (error) => {
      setLocationState('idle')
      setLocationError(
        error instanceof ApiError
          ? error.message
          : '위치를 평균거리에 반영하지 못했습니다.',
      )
    },
  })
  const ignoreBounds = useCallback(() => {}, [])
  const ignoreLocation = useCallback(() => {}, [])
  const ignoreReady = useCallback(() => {}, [])

  useEffect(() => {
    setLiveMap(map)
  }, [map])

  useEffect(() => {
    if (!detailPlace) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailPlace(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [detailPlace])

  const selectPlace = useCallback((place: MapPlace | null) => {
    setSelectedPlace(place)
    if (place) setDetailPlace(place)
  }, [])

  const shareMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('이 브라우저에서는 위치 정보를 사용할 수 없습니다.')
      return
    }
    setLocationState('locating')
    setLocationError(null)
    const submit = ({ coords }: GeolocationPosition) => shareLocation.mutate({
      longitude: coords.longitude,
      latitude: coords.latitude,
    })
    const fail = (error: GeolocationPositionError) => {
      setLocationState('idle')
      setLocationError(
        error.code === error.PERMISSION_DENIED
          ? '위치 권한을 허용한 뒤 다시 시도해 주세요.'
          : '현재 위치를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
    navigator.geolocation.getCurrentPosition(
      submit,
      () => {
        navigator.geolocation.getCurrentPosition(
          submit,
          fail,
          { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
        )
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-surface shadow-sm" aria-label={`공유된 ${keyword} 지도`}>
      <header className="flex items-center gap-2 px-3 py-2">
        <MapPin size={18} weight="fill" className="text-primary-strong" />
        <strong className="text-[14px]">공유된 {keyword} {places.length}곳</strong>
      </header>
      <div className="relative h-64 border-y border-border bg-primary-subtle">
        <MapCanvas
          places={places}
          selectedPlace={selectedPlace}
          onSelectPlace={selectPlace}
          onBoundsChange={ignoreBounds}
          locateRequest={0}
          onLocationResult={ignoreLocation}
          onMapReady={ignoreReady}
          fitPlaces
        />
      </div>
      <div className="grid gap-1 p-2" aria-label="공유된 시설 목록">
        {places.map((place, index) => {
          const facility = liveMap.facilities.find(
            (item) => item.facilityId === place.placeId,
          )
          return (
          <button
            key={`${place.type}-${place.placeId}`}
            type="button"
            onClick={() => selectPlace(place)}
            className="rounded-xl px-2 py-2 text-left text-[13px] transition-colors hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs text-on-primary">
                {facility?.distanceRank ?? index + 1}
              </span>
              {place.name}
            </span>
            <span className="mt-0.5 block truncate text-muted-foreground">{place.address ?? '주소 정보 없음'}</span>
            <span className="mt-1 block font-medium text-primary-strong">
              {distanceLabel(facility, senderNickname)}
            </span>
          </button>
          )
        })}
        <div className="mt-1 border-t border-border p-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={locationState === 'locating' || shareLocation.isPending}
            onClick={shareMyLocation}
          >
            <UsersThree size={19} />
            {locationState === 'shared'
              ? '내 위치가 평균거리에 반영됨'
              : locationState === 'locating' || shareLocation.isPending
                ? '현재 위치 확인 중…'
                : '거리 계산에 내 위치 공유'}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            위치는 평균 계산에만 사용되며 10분 후 자동 삭제됩니다.
          </p>
          {locationError && (
            <p role="alert" className="mt-2 text-center text-xs text-destructive">
              {locationError}
            </p>
          )}
        </div>
      </div>

      {detailPlace && (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailPlace(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`facility-detail-${detailPlace.placeId}`}
            className="w-full max-w-md rounded-t-3xl bg-surface p-5 shadow-xl sm:rounded-3xl"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-primary-strong">{keyword} 상세정보</p>
                <h2 id={`facility-detail-${detailPlace.placeId}`} className="mt-1 text-xl font-bold">
                  {detailPlace.name}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="장소 상세정보 닫기"
                onClick={() => setDetailPlace(null)}
                className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-muted"
              >
                <X size={22} />
              </button>
            </header>

            <dl className="mt-4 grid gap-3 rounded-2xl bg-muted/60 p-4 text-[14px]">
              <DetailRow icon={<MapPin size={18} />} label="주소" value={detailPlace.address ?? '주소 정보 없음'} />
              <DetailRow icon={<Phone size={18} />} label="전화" value={detailPlace.phoneNumber ?? '전화번호 정보 없음'} />
              <DetailRow icon={<Clock size={18} />} label="운영시간" value={detailPlace.status ?? '운영시간 정보 없음'} />
              <DetailRow
                icon={<MapPin size={18} />}
                label="거리"
                value={distanceLabel(
                  liveMap.facilities.find(
                    (facility) => facility.facilityId === detailPlace.placeId,
                  ),
                  senderNickname,
                )}
              />
            </dl>

            {allowPlaceDraft && createDraft.isError && (
              <p role="alert" className="mt-3 text-[13px] text-destructive">
                {createDraft.error instanceof ApiError
                  ? createDraft.error.message
                  : '장소 기반 약속 초안을 만들지 못했습니다. 다시 시도해 주세요.'}
              </p>
            )}

            {allowPlaceDraft && (
              <Button
                className="mt-5 w-full"
                disabled={createDraft.isPending}
                onClick={() => createDraft.mutate(detailPlace)}
              >
                <CalendarPlus size={20} weight="bold" />
                {createDraft.isPending ? '약속 준비 중…' : '이 장소로 약속 만들기'}
              </Button>
            )}
          </section>
        </div>
      )}
    </section>
  )
}

function formatDistance(distance: number | null) {
  if (distance == null) return '정보 없음'
  if (distance < 1000) return `${Math.round(distance)}m`
  return `${(distance / 1000).toFixed(1)}km`
}

function distanceLabel(
  facility: ChatMapFacility | undefined,
  senderNickname: string | null,
) {
  const distance = facility?.averageDistanceMeters ?? facility?.distanceMeters ?? null
  const count = facility?.distanceParticipantCount ?? 1
  if (count <= 1) {
    return `${senderNickname ?? '작성자'} 위치에서 직선거리 ${formatDistance(distance)}`
  }
  return `참여자 ${count}명 평균 직선거리 ${formatDistance(distance)}`
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[20px_56px_1fr] items-start gap-2">
      <span className="mt-0.5 text-primary-strong" aria-hidden="true">{icon}</span>
      <dt className="font-semibold">{label}</dt>
      <dd className="break-words text-muted-foreground">{value}</dd>
    </div>
  )
}
