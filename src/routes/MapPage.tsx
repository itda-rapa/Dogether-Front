import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CaretDown,
  CaretUp,
  Crosshair,
  FirstAid,
  MagnifyingGlass,
  MapPin,
  Minus,
  Phone,
  Pill,
  Plus,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useSearchParams } from 'react-router'
import { listMapPlaces, searchVWorld } from '@/features/map/api'
import { MapCanvas } from '@/features/map/MapCanvas'
import type { BackendMapPlaceType, MapBounds, MapPlace, MapPlaceType } from '@/features/map/types'
import { cn } from '@/lib/cn'

type SearchMode = 'ALL' | BackendMapPlaceType

const SEARCH_MODE_META = {
  ALL: { label: '통합검색', icon: MagnifyingGlass },
  HOSPITAL: { label: '동물병원', icon: FirstAid },
  PHARMACY: { label: '동물약국', icon: Pill },
} satisfies Record<SearchMode, { label: string; icon: typeof FirstAid }>

const PLACE_TYPE_META = {
  VWORLD: { label: 'VWorld 검색', icon: MapPin },
  HOSPITAL: SEARCH_MODE_META.HOSPITAL,
  PHARMACY: SEARCH_MODE_META.PHARMACY,
} satisfies Record<MapPlaceType, { label: string; icon: typeof FirstAid }>

const SEARCH_MODES: SearchMode[] = ['ALL', 'HOSPITAL', 'PHARMACY']

type MapActions = { zoomIn: () => void; zoomOut: () => void }

export function MapPage() {
  const [params, setParams] = useSearchParams()
  const requestedType = params.get('type')
  const mode: SearchMode = requestedType === 'HOSPITAL' || requestedType === 'PHARMACY'
    ? requestedType
    : 'ALL'
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null)
  const [locateRequest, setLocateRequest] = useState(params.get('intent') === 'locate' ? 1 : 0)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'pending' | 'found' | 'denied'>('idle')
  const [mapActions, setMapActions] = useState<MapActions | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const hasVworldKey = Boolean(import.meta.env.VITE_VWORLD_API_KEY)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timeout)
  }, [search])

  const placesQuery = useQuery({
    queryKey: ['map-places', mode, bounds],
    queryFn: ({ signal }) => listMapPlaces(mode as BackendMapPlaceType, bounds!, signal),
    enabled: mode !== 'ALL' && bounds != null,
    placeholderData: (previous) => previous,
  })

  const vworldQuery = useQuery({
    queryKey: ['vworld-search', debouncedSearch],
    queryFn: ({ signal }) => searchVWorld(debouncedSearch, signal),
    enabled: mode === 'ALL' && hasVworldKey && debouncedSearch.length >= 2,
    retry: false,
  })

  const places = useMemo(() => {
    if (mode === 'ALL') return vworldQuery.data ?? []
    const normalized = search.trim().toLocaleLowerCase('ko-KR')
    const all = placesQuery.data ?? []
    if (!normalized) return all
    return all.filter((place) =>
      `${place.name} ${place.address ?? ''}`.toLocaleLowerCase('ko-KR').includes(normalized),
    )
  }, [mode, placesQuery.data, search, vworldQuery.data])

  const chooseMode = (nextMode: SearchMode) => {
    setParams(nextMode === 'ALL' ? {} : { type: nextMode })
    setSelectedPlace(null)
    setSearch('')
    setDebouncedSearch('')
  }

  const resultsPending = mode === 'ALL' ? vworldQuery.isFetching : placesQuery.isPending
  const resultsError = mode === 'ALL' ? vworldQuery.isError : placesQuery.isError

  const locate = () => {
    setLocationStatus('pending')
    setLocateRequest((request) => request + 1)
  }

  return (
    <div className="relative min-h-[calc(100dvh-7.5rem)] flex-1 overflow-hidden bg-map-canvas md:min-h-0">
      <h1 className="sr-only">반려동물 의료 지도</h1>

      <MapCanvas
        places={places}
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
        onBoundsChange={setBounds}
        locateRequest={locateRequest}
        onLocationResult={(result) => setLocationStatus(result)}
        onMapReady={setMapActions}
      />

      {!hasVworldKey && (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface/95 px-4 py-2 text-[13px] font-medium shadow-[var(--dg-shadow-md)] backdrop-blur">
          <WarningCircle size={17} className="text-destructive" aria-hidden />
          VWorld API 키를 설정하면 배경지도가 표시됩니다.
        </div>
      )}

      <aside
        className={cn(
          'absolute bottom-3 left-3 z-10 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/96 shadow-[var(--dg-shadow-map)] backdrop-blur transition-[width,max-height] duration-200 md:left-4 md:top-4',
          isPanelCollapsed
            ? 'w-[min(330px,calc(100%-1.5rem))] max-h-18 md:w-[330px]'
            : 'right-3 max-h-[52%] md:bottom-4 md:right-auto md:max-h-none md:w-[370px]',
        )}
      >
        <div className={cn(!isPanelCollapsed && 'border-b border-border', 'p-4')}>
          <div className={cn('flex items-center gap-2', !isPanelCollapsed && 'mb-3')}>
            <img src="/logo-mark.png" alt="" className="size-7" />
            <span className="text-lg font-extrabold tracking-tight text-primary-strong">Dogether map</span>
            <span className="ml-auto whitespace-nowrap text-[13px] text-muted-foreground">
              {isPanelCollapsed ? SEARCH_MODE_META[mode].label : mode === 'ALL' ? '검색 결과' : '현재 지도'} {places.length}곳
            </span>
            <button
              type="button"
              aria-expanded={!isPanelCollapsed}
              aria-controls="map-place-panel-content"
              aria-label={isPanelCollapsed ? '장소 패널 펼치기' : '장소 패널 접기'}
              onClick={() => setIsPanelCollapsed((collapsed) => !collapsed)}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary-subtle hover:text-primary-strong"
            >
              {isPanelCollapsed ? <CaretUp size={19} /> : <CaretDown size={19} />}
            </button>
          </div>

          {!isPanelCollapsed && (
            <div id="map-place-panel-content">
              <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary-strong focus-within:ring-2 focus-within:ring-primary/25">
                <MagnifyingGlass size={20} className="shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only">장소 검색</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={mode === 'ALL' ? '장소·주소 통합검색' : `${SEARCH_MODE_META[mode].label}명 검색`}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} aria-label="검색어 지우기" className="grid size-8 place-items-center rounded-full hover:bg-muted">
                    <X size={16} />
                  </button>
                )}
              </label>

              <div className="mt-3 grid grid-cols-3 gap-2" role="tablist" aria-label="검색 종류">
                {SEARCH_MODES.map((searchMode) => {
                  const { label, icon: Icon } = SEARCH_MODE_META[searchMode]
                  const active = mode === searchMode
                  return (
                    <button
                      key={searchMode}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => chooseMode(searchMode)}
                      className={cn(
                        'flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-1 text-[14px] font-semibold transition-colors',
                        active
                          ? searchMode === 'ALL'
                            ? 'border-primary-strong bg-primary text-on-primary'
                            : searchMode === 'HOSPITAL'
                            ? 'border-map-hospital bg-map-hospital text-white'
                            : 'border-map-pharmacy bg-map-pharmacy text-white'
                          : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
                      )}
                    >
                      <Icon size={19} weight={active ? 'fill' : 'regular'} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {!isPanelCollapsed && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {resultsPending && (
            <p className="p-6 text-center text-[14px] text-muted-foreground">
              {mode === 'ALL' ? 'VWorld에서 검색하고 있어요…' : '현재 지도에서 장소를 찾고 있어요…'}
            </p>
          )}
          {resultsError && (
            <div className="m-4 rounded-xl bg-muted p-4 text-[14px]">
              <p className="font-semibold">검색 결과를 불러오지 못했어요.</p>
              <button type="button" onClick={() => mode === 'ALL' ? vworldQuery.refetch() : placesQuery.refetch()} className="mt-2 font-semibold text-primary-strong">다시 시도</button>
            </div>
          )}
          {!resultsPending && !resultsError && places.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin size={28} className="mx-auto mb-2" />
              <p className="font-medium">
                {mode === 'ALL' && debouncedSearch.length < 2
                  ? '검색어를 두 글자 이상 입력해 주세요.'
                  : mode === 'ALL'
                    ? 'VWorld 검색 결과가 없습니다.'
                    : `현재 지도 영역에 ${SEARCH_MODE_META[mode].label}이 없습니다.`}
              </p>
              <p className="mt-1 text-[13px]">
                {mode === 'ALL' ? '장소명, 도로명주소 또는 지번주소를 검색할 수 있어요.' : '지도를 이동하거나 검색어를 바꿔보세요.'}
              </p>
            </div>
          )}
          <ul>
            {places.map((place) => (
              <li key={`${place.type}-${place.placeId}`} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setSelectedPlace(place)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors hover:bg-primary-subtle',
                    selectedPlace?.placeId === place.placeId && selectedPlace.type === place.type && 'bg-primary-subtle',
                  )}
                >
                  <div className="flex gap-3">
                    <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-white', place.type === 'HOSPITAL' ? 'bg-map-hospital' : place.type === 'PHARMACY' ? 'bg-map-pharmacy' : 'bg-primary-strong')}>
                      {place.type === 'HOSPITAL' ? <FirstAid size={18} weight="fill" /> : place.type === 'PHARMACY' ? <Pill size={18} weight="fill" /> : <MapPin size={18} weight="fill" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{place.name}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{place.address ?? '주소 정보 없음'}</span>
                      {place.status && <span className="mt-1 inline-block text-[13px] font-medium text-primary-strong">{place.status}</span>}
                    </span>
                  </div>
                </button>
                {selectedPlace?.placeId === place.placeId && selectedPlace.type === place.type && place.phoneNumber && (
                  <div className="px-4 pb-3 md:hidden">
                    <a href={`tel:${place.phoneNumber}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary-subtle px-3 font-semibold text-primary-strong">
                      <Phone size={17} /> {place.phoneNumber}
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>}
      </aside>

      <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--dg-shadow-md)] md:right-5 md:top-5">
        <button type="button" onClick={() => mapActions?.zoomIn()} aria-label="지도 확대" className="grid size-11 place-items-center border-b border-border hover:bg-primary-subtle"><Plus size={20} /></button>
        <button type="button" onClick={() => mapActions?.zoomOut()} aria-label="지도 축소" className="grid size-11 place-items-center hover:bg-primary-subtle"><Minus size={20} /></button>
      </div>

      <button
        type="button"
        onClick={locate}
        aria-label="내 위치로 이동"
        className="absolute right-3 top-[7.25rem] z-10 grid size-11 place-items-center rounded-xl border border-border bg-surface shadow-[var(--dg-shadow-md)] hover:bg-primary-subtle md:right-5 md:top-[8rem]"
      >
        <Crosshair size={21} className={locationStatus === 'pending' ? 'animate-pulse text-primary-strong' : undefined} />
      </button>

      {locationStatus === 'denied' && (
        <div role="status" className="absolute right-3 top-[10.5rem] z-10 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--dg-shadow-md)] md:right-5 md:top-[11.25rem]">
          위치 권한을 확인해 주세요.
        </div>
      )}

      {selectedPlace && (
        <section aria-label="선택한 장소" className="absolute left-1/2 top-4 z-10 hidden w-[min(420px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-surface p-4 shadow-[var(--dg-shadow-map)] md:block">
          <button type="button" onClick={() => setSelectedPlace(null)} aria-label="장소 정보 닫기" className="absolute right-2 top-2 grid size-9 place-items-center rounded-full hover:bg-muted"><X size={17} /></button>
          <p className={cn('text-[13px] font-bold', selectedPlace.type === 'HOSPITAL' ? 'text-map-hospital' : selectedPlace.type === 'PHARMACY' ? 'text-map-pharmacy' : 'text-primary-strong')}>{PLACE_TYPE_META[selectedPlace.type].label}</p>
          <h2 className="pr-8 text-lg font-extrabold">{selectedPlace.name}</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">{selectedPlace.address ?? '주소 정보 없음'}</p>
          {selectedPlace.phoneNumber && <a href={`tel:${selectedPlace.phoneNumber}`} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary-subtle px-3 font-semibold text-primary-strong"><Phone size={17} /> 전화하기</a>}
        </section>
      )}
    </div>
  )
}
