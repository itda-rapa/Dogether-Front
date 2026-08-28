import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CaretDown, CaretUp, FirstAid, MagnifyingGlass, MapPin, Pill, SpinnerGap, X } from '@phosphor-icons/react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { createRoundTripRoute, createRoute, findNearestRouteNode, getRoute, getRouteHeatmap, getSharedRoute, listSavedRoutes, saveRoute } from '@/features/route/api'
import { listJoinedOpenChatRooms, shareRouteToOpenChat } from '@/features/chat/api'
import { RoutePlannerMap } from '@/features/route/RoutePlannerMap'
import { subscribeToRouteStatus } from '@/features/route/realtime'
import type { NearbyFacility, RouteActivityType, RouteNode, RoutePriorityType, RouteResult } from '@/features/route/types'
import { ApiError, NetworkError } from '@/lib/api'
import { listNearbyMapPlaces, searchVWorld } from '@/features/map/api'
import type { BackendMapPlaceType, MapBounds, MapCenter, MapPlace } from '@/features/map/types'

const SPEEDS: Record<RouteActivityType, number[]> = {
  WALK: [2, 3, 4, 5, 6, 7],
  RUN: [6, 8, 10, 12, 15, 18, 20],
  CYCLE: [8, 12, 15, 20, 25, 30, 35, 40],
}

const FACILITY_LABELS = {
  toilets: '화장실',
  poopBags: '배변봉투함',
  waterFountains: '급수대',
  parks: '공원',
} as const

type FacilityKey = keyof typeof FACILITY_LABELS
type RouteSearchMode = 'ALL' | BackendMapPlaceType
type PlannerTab = 'CREATE' | 'SAVED'
type MapTheme = 'DEFAULT' | 'ROUTE_HEATMAP'
type RouteConstructionMode = 'POINTS' | 'ROUND_TRIP'

const ROUTE_SEARCH_MODES: Array<{ value: RouteSearchMode; label: string }> = [
  { value: 'ALL', label: '통합검색' },
  { value: 'HOSPITAL', label: '동물병원' },
  { value: 'PHARMACY', label: '동물약국' },
]

function visibleFacilities(key: FacilityKey, items: NearbyFacility[] | undefined) {
  const unique = new Map<string, NearbyFacility>()
  for (const item of items ?? []) {
    const name = item.name?.trim() ?? ''
    if (key === 'parks' && (/^\d+(?:\.\d+)?$/.test(name) || /^[-\d.]+,\s*[-\d.]+$/.test(name))) continue
    const identity = [name, item.address ?? '', item.longitude ?? '', item.latitude ?? ''].join('|')
    if (!unique.has(identity)) unique.set(identity, item)
  }
  return [...unique.values()]
}

function localDateTimeValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function providerStatusLabel(provider: Record<string, unknown> | null | undefined, kind: 'WEATHER' | 'AIR') {
  const status = String(provider?.status ?? '')
  if (status === 'KMA_APPLICATION_REQUIRED') return '기상청 API 활용신청 승인 필요'
  if (status === 'AIR_SERVICE_KEY_REJECTED') return '에어코리아 서비스키 확인 필요'
  if (status === 'OUT_OF_RANGE') return '중기예보 범위 밖'
  if (status === 'NOT_CONFIGURED') return 'API 키 미설정'
  return kind === 'WEATHER' ? '날씨 조회 불가' : '미세먼지 조회 불가'
}

export function RoutePlannerPage() {
  const [searchParams] = useSearchParams()
  const sharedRouteId = searchParams.get('routeId')
  const sharedRoomId = Number(searchParams.get('roomId'))
  const [start, setStart] = useState<RouteNode | null>(null)
  const [waypoints, setWaypoints] = useState<RouteNode[]>([])
  const [destination, setDestination] = useState<RouteNode | null>(null)
  const [constructionMode, setConstructionMode] = useState<RouteConstructionMode>('POINTS')
  const [targetDistanceKm, setTargetDistanceKm] = useState(3)
  const [activity, setActivity] = useState<RouteActivityType>('WALK')
  const [priority, setPriority] = useState<RoutePriorityType>('GREEN')
  const [speed, setSpeed] = useState(4)
  const [departureAt, setDepartureAt] = useState(() => {
    const date = new Date(Date.now() + 60 * 60 * 1000)
    date.setMinutes(Math.ceil(date.getMinutes() / 10) * 10, 0, 0)
    return localDateTimeValue(date)
  })
  const [requestId, setRequestId] = useState<string | null>(null)
  const [result, setResult] = useState<RouteResult | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<{
    longitude: number
    latitude: number
    label: string
    color: string
  } | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareRoomId, setShareRoomId] = useState('')
  const [shareNotice, setShareNotice] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [plannerTab, setPlannerTab] = useState<PlannerTab>('CREATE')
  const [plannerPanelCollapsed, setPlannerPanelCollapsed] = useState(false)
  const [searchMode, setSearchMode] = useState<RouteSearchMode>('ALL')
  const [placeSearch, setPlaceSearch] = useState('')
  const [debouncedPlaceSearch, setDebouncedPlaceSearch] = useState('')
  const [nearbyCenter, setNearbyCenter] = useState<MapCenter | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null)
  const [searchPanelCollapsed, setSearchPanelCollapsed] = useState(false)
  const [mapTheme, setMapTheme] = useState<MapTheme>('DEFAULT')
  const pollFailureCount = useRef(0)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedPlaceSearch(placeSearch.trim()), 350)
    return () => window.clearTimeout(timeout)
  }, [placeSearch])

  const nearbyPlaces = useQuery({
    queryKey: ['route-map-places', searchMode, nearbyCenter],
    queryFn: ({ signal }) => listNearbyMapPlaces(searchMode as BackendMapPlaceType, nearbyCenter!, signal),
    enabled: searchMode !== 'ALL' && nearbyCenter != null,
    placeholderData: (previous) => previous,
  })
  const searchedPlaces = useQuery({
    queryKey: ['route-vworld-search', debouncedPlaceSearch],
    queryFn: ({ signal }) => searchVWorld(debouncedPlaceSearch, signal),
    enabled: searchMode === 'ALL' && Boolean(import.meta.env.VITE_VWORLD_API_KEY) && debouncedPlaceSearch.length >= 2,
    retry: false,
  })
  const routeHeatmap = useQuery({
    queryKey: ['routes', 'heatmap'],
    queryFn: ({ signal }) => getRouteHeatmap(signal),
    enabled: mapTheme === 'ROUTE_HEATMAP',
    staleTime: 5 * 60_000,
    retry: false,
  })
  const refetchRouteHeatmap = routeHeatmap.refetch
  const mapPlaces = useMemo(() => {
    if (searchMode === 'ALL') return searchedPlaces.data ?? []
    const normalized = placeSearch.trim().toLocaleLowerCase('ko-KR')
    const all = nearbyPlaces.data ?? []
    if (!normalized) return all
    return all.filter((place) => `${place.name} ${place.address ?? ''}`.toLocaleLowerCase('ko-KR').includes(normalized))
  }, [nearbyPlaces.data, placeSearch, searchMode, searchedPlaces.data])
  const updateMapBounds = useCallback((bounds: MapBounds) => {
    setNearbyCenter({
      longitude: Number(((bounds.minLongitude + bounds.maxLongitude) / 2).toFixed(6)),
      latitude: Number(((bounds.minLatitude + bounds.maxLatitude) / 2).toFixed(6)),
    })
  }, [])

  const readResult = useCallback(async (id: string) => {
    const route = Number.isInteger(sharedRoomId) && sharedRoomId > 0
      ? await getSharedRoute(sharedRoomId, id)
      : await getRoute(id)
    pollFailureCount.current = 0
    setError(null)
    setResult(route)
    if (route.status === 'COMPLETED' || route.status === 'FAILED') setCalculating(false)
  }, [sharedRoomId])

  useEffect(() => {
    if (!sharedRouteId) return
    setRequestId(sharedRouteId)
    void readResult(sharedRouteId).catch(() => setError('공유된 경로를 열 수 없습니다.'))
  }, [readResult, sharedRouteId])

  useEffect(() => subscribeToRouteStatus((event) => {
    if (event.requestId === requestId) void readResult(event.requestId).catch(() => {
      setError('완료 알림을 받았지만 결과 조회가 지연되고 있습니다. 자동으로 다시 조회합니다.')
    })
  }, undefined, () => {
    if (mapTheme === 'ROUTE_HEATMAP') void refetchRouteHeatmap()
  }), [mapTheme, readResult, refetchRouteHeatmap, requestId])

  useEffect(() => {
    if (!calculating || !requestId) return
    const timer = window.setInterval(() => void readResult(requestId).catch(() => {
      pollFailureCount.current += 1
      if (pollFailureCount.current >= 5) {
        setCalculating(false)
        setError('경로 상태를 여러 번 조회하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      } else {
        setError('경로 상태 조회가 지연되고 있습니다. 자동으로 다시 시도합니다.')
      }
    }), 3_000)
    return () => window.clearInterval(timer)
  }, [calculating, readResult, requestId])

  const resolveNode = useCallback(async (
    longitude: number,
    latitude: number,
    nodeRole: 'START' | 'WAYPOINT' | 'DESTINATION',
  ) => {
    setSelecting(true)
    setError(null)
    try {
      return await findNearestRouteNode(longitude, latitude, nodeRole, activity)
    } catch (cause) {
      if (cause instanceof ApiError || cause instanceof NetworkError) {
        setError(cause.message)
      } else {
        setError('선택한 위치에서 경로 노드를 찾지 못했습니다.')
      }
      return null
    } finally {
      setSelecting(false)
    }
  }, [activity])

  const onPointClick = useCallback(async (longitude: number, latitude: number) => {
    if (constructionMode === 'ROUND_TRIP') {
      setPendingSelection({ longitude, latitude, label: '출', color: '#2563eb' })
      const node = await resolveNode(longitude, latitude, 'START')
      setPendingSelection(null)
      if (node) setStart(node)
      return
    }
    setPendingSelection({
      longitude,
      latitude,
      label: start == null ? '출' : `경${waypoints.length + 1}`,
      color: start == null ? '#2563eb' : '#d97706',
    })
    const node = await resolveNode(longitude, latitude, start == null ? 'START' : 'WAYPOINT')
    setPendingSelection(null)
    if (!node) return
    if (start == null) {
      setStart(node)
    } else {
      setWaypoints((current) => {
        if (current.length >= 20) {
          setError('경유지는 최대 20개까지 지정할 수 있습니다.')
          return current
        }
        if (node.nodeId === start?.nodeId || node.nodeId === destination?.nodeId || current.some((item) => item.nodeId === node.nodeId)) {
          setError('이미 선택한 노드입니다. 다른 위치를 선택해 주세요.')
          return current
        }
        return [...current, node]
      })
    }
  }, [constructionMode, destination?.nodeId, resolveNode, start, waypoints.length])

  const onDestinationDoubleClick = useCallback(async (longitude: number, latitude: number) => {
    if (constructionMode === 'ROUND_TRIP') return
    setPendingSelection({ longitude, latitude, label: '도', color: '#dc2626' })
    const node = await resolveNode(longitude, latitude, 'DESTINATION')
    setPendingSelection(null)
    if (!node) return
    if (node.nodeId === start?.nodeId || waypoints.some((item) => item.nodeId === node.nodeId)) {
      setError('출발지나 경유지와 다른 위치를 목적지로 선택해 주세요.')
      return
    }
    setDestination(node)
  }, [constructionMode, resolveNode, start?.nodeId, waypoints])

  const roundTripDistanceValid = Number.isFinite(targetDistanceKm) && targetDistanceKm >= 0.5 && targetDistanceKm <= 50
  const departureTimestamp = new Date(departureAt).getTime()
  const departureValid = Number.isFinite(departureTimestamp) && departureTimestamp >= Date.now()
  const canCreate = start != null
    && (constructionMode === 'ROUND_TRIP' ? roundTripDistanceValid : destination != null)
    && departureValid
    && !calculating
  const distance = result?.totalDistanceMeters == null ? null : result.totalDistanceMeters / 1000
  const facilityGroups = useMemo(() => (Object.keys(FACILITY_LABELS) as FacilityKey[]).map((key) => ({
    key,
    label: FACILITY_LABELS[key],
    items: visibleFacilities(key, result?.nearbyFacilities?.[key]),
  })), [result])
  const facilitiesCount = useMemo(() => facilityGroups.reduce((sum, group) => sum + group.items.length, 0), [facilityGroups])
  const joinedRooms = useQuery({
    queryKey: ['chat', 'open', 'joined'],
    queryFn: listJoinedOpenChatRooms,
    enabled: plannerTab === 'SAVED' && !(Number.isInteger(sharedRoomId) && sharedRoomId > 0),
    retry: false,
  })
  const savedRoutes = useQuery({
    queryKey: ['routes', 'saved'],
    queryFn: listSavedRoutes,
    enabled: !(Number.isInteger(sharedRoomId) && sharedRoomId > 0),
    retry: false,
  })

  const changeActivity = (next: RouteActivityType) => {
    setActivity(next)
    setSpeed(SPEEDS[next][Math.floor(SPEEDS[next].length / 2)])
    setStart(null)
    setWaypoints([])
    setDestination(null)
    setResult(null)
    setError(null)
  }

  const changeConstructionMode = (next: RouteConstructionMode) => {
    setConstructionMode(next)
    setStart(null)
    setWaypoints([])
    setDestination(null)
    setResult(null)
    setRequestId(null)
    setError(null)
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <RoutePlannerMap start={start} waypoints={waypoints} destination={destination} pendingSelection={pendingSelection} geoJson={result?.geoJson ?? null} nearbyFacilities={result?.nearbyFacilities ?? null} heatmapGeoJson={routeHeatmap.data ?? null} mapTheme={mapTheme} places={mapPlaces} selectedPlace={selectedPlace} onSelectPlace={setSelectedPlace} onBoundsChange={updateMapBounds} onPointClick={onPointClick} onDestinationDoubleClick={onDestinationDoubleClick} />
      <Link to="/map" className="absolute left-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-surface shadow" aria-label="시설 지도로 돌아가기"><ArrowLeft size={20} /></Link>

      <aside className={`absolute left-16 top-3 z-10 flex w-[min(370px,calc(100%-5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface/96 shadow-xl backdrop-blur ${searchPanelCollapsed ? 'max-h-14' : 'max-h-[46dvh]'}`}>
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="" className="size-6" />
            <span className="font-extrabold text-primary-strong">Dogether map</span>
            <span className="ml-auto text-xs text-muted-foreground">검색 결과 {mapPlaces.length}곳</span>
            <button type="button" aria-label={searchPanelCollapsed ? '장소 패널 펼치기' : '장소 패널 접기'} onClick={() => setSearchPanelCollapsed((value) => !value)} className="grid size-8 place-items-center rounded-full hover:bg-muted">{searchPanelCollapsed ? <CaretDown /> : <CaretUp />}</button>
          </div>
          {!searchPanelCollapsed && <>
            <label className="mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3">
              <MagnifyingGlass className="text-muted-foreground" />
              <span className="sr-only">장소 검색</span>
              <input type="search" value={placeSearch} onChange={(event) => setPlaceSearch(event.target.value)} placeholder={searchMode === 'ALL' ? '장소·주소 통합검색' : '이름으로 검색'} className="min-w-0 flex-1 bg-transparent outline-none" />
              {placeSearch && <button type="button" onClick={() => setPlaceSearch('')} aria-label="검색어 지우기"><X size={15} /></button>}
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {ROUTE_SEARCH_MODES.map((mode) => <button key={mode.value} type="button" onClick={() => { setSearchMode(mode.value); setSelectedPlace(null); setPlaceSearch('') }} className={`min-h-9 rounded-lg border text-xs font-semibold ${searchMode === mode.value ? 'border-primary bg-primary-subtle text-primary-strong' : 'border-border'}`}>{mode.label}</button>)}
            </div>
          </>}
        </div>
        {!searchPanelCollapsed && <div className="min-h-0 overflow-y-auto">
          {(searchMode === 'ALL' ? searchedPlaces.isFetching : nearbyPlaces.isFetching) && <p className="p-4 text-center text-sm text-muted-foreground">장소를 검색하고 있습니다…</p>}
          {mapPlaces.length === 0 && !(searchMode === 'ALL' ? searchedPlaces.isFetching : nearbyPlaces.isFetching) && <p className="p-5 text-center text-sm text-muted-foreground">{searchMode === 'ALL' && debouncedPlaceSearch.length < 2 ? '검색어를 두 글자 이상 입력해 주세요.' : '검색 결과가 없습니다.'}</p>}
          <ul>{mapPlaces.map((place) => <li key={`${place.type}-${place.placeId}`} className="border-b border-border last:border-0"><button type="button" onClick={() => setSelectedPlace(place)} className={`w-full px-3 py-2.5 text-left hover:bg-primary-subtle ${selectedPlace?.placeId === place.placeId && selectedPlace.type === place.type ? 'bg-primary-subtle' : ''}`}><span className="flex items-center gap-2 font-semibold">{place.type === 'HOSPITAL' ? <FirstAid className="text-red-500" /> : place.type === 'PHARMACY' ? <Pill className="text-violet-500" /> : <MapPin className="text-primary-strong" />}{place.name}</span><span className="mt-0.5 block truncate pl-6 text-xs text-muted-foreground">{place.address ?? '주소 정보 없음'}</span></button></li>)}</ul>
        </div>}
      </aside>

      {(selecting || calculating) && (
        <div role="status" className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2 shadow">
          <SpinnerGap className="animate-spin" /> {selecting ? '가장 가까운 노드를 찾고 있습니다…' : '경로를 계산하고 있습니다…'}
        </div>
      )}

      <section className={`absolute inset-x-3 bottom-3 z-10 overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-xl backdrop-blur transition-[max-height] md:left-auto md:right-3 md:w-[400px] ${plannerPanelCollapsed ? 'max-h-14 md:top-auto' : 'max-h-[48dvh] md:top-3 md:max-h-none'}`}>
        <div className={plannerPanelCollapsed ? '' : 'max-h-[48dvh] overflow-y-auto md:h-full md:max-h-none'}>
        <div className="flex min-h-14 items-center justify-between gap-2 px-4">
          <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground"><MapPin className="shrink-0" /><span className="truncate">{constructionMode === 'POINTS' ? '첫 클릭: 출발지 · 이후 클릭: 경유지 · 더블클릭: 목적지' : '지도에서 왕복 코스의 출발지를 클릭하세요'}</span></p>
          <div className="flex shrink-0 items-center gap-1">
            {!plannerPanelCollapsed && (start || waypoints.length > 0 || destination) && (
              <button type="button" onClick={() => { setStart(null); setWaypoints([]); setDestination(null); setResult(null); setError(null) }} className="rounded-lg border border-border px-2 py-1 text-xs font-semibold">지점 초기화</button>
            )}
            <button type="button" aria-label={plannerPanelCollapsed ? '산책 경로 패널 펼치기' : '산책 경로 패널 접기'} onClick={() => setPlannerPanelCollapsed((value) => !value)} className="grid size-9 place-items-center rounded-full hover:bg-muted">
              {plannerPanelCollapsed ? <CaretUp /> : <CaretDown />}
            </button>
          </div>
        </div>

        {!plannerPanelCollapsed && <div className="px-4 pb-4">

        <div className="mt-3 rounded-xl border border-border bg-muted/60 p-3" role="group" aria-label="지도 테마">
          <div className="flex items-center gap-2">
            <span className="mr-auto text-sm font-semibold">지도 테마</span>
            <button type="button" onClick={() => setMapTheme('DEFAULT')} aria-pressed={mapTheme === 'DEFAULT'} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${mapTheme === 'DEFAULT' ? 'border-primary bg-primary-subtle text-primary-strong' : 'border-border bg-surface'}`}>일반</button>
            <button type="button" onClick={() => setMapTheme('ROUTE_HEATMAP')} aria-pressed={mapTheme === 'ROUTE_HEATMAP'} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${mapTheme === 'ROUTE_HEATMAP' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-border bg-surface'}`}>인기 경로</button>
          </div>
          {mapTheme === 'ROUTE_HEATMAP' && <p className="mt-2 text-[11px] text-muted-foreground">완료된 익명 경로가 많이 겹칠수록 밝게 표시되며 새 경로가 완성되면 자동 갱신됩니다.</p>}
        </div>

        {!sharedRouteId && (
          <div className="mt-3 grid grid-cols-2 gap-2" role="tablist" aria-label="경로 메뉴">
            <button type="button" role="tab" aria-selected={plannerTab === 'CREATE'} onClick={() => { setPlannerTab('CREATE'); setShareNotice(null) }} className={`min-h-10 rounded-lg border font-semibold ${plannerTab === 'CREATE' ? 'border-primary bg-primary-subtle text-primary-strong' : 'border-border'}`}>경로 만들기</button>
            <button type="button" role="tab" aria-selected={plannerTab === 'SAVED'} onClick={() => { setPlannerTab('SAVED'); setShareNotice(null) }} className={`min-h-10 rounded-lg border font-semibold ${plannerTab === 'SAVED' ? 'border-primary bg-primary-subtle text-primary-strong' : 'border-border'}`}>저장 경로 {savedRoutes.data?.length ?? 0}</button>
          </div>
        )}

        <div className={plannerTab === 'CREATE' || sharedRouteId ? '' : 'hidden'}>

        {!sharedRouteId && (
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="경로 생성 방식">
            <button type="button" aria-pressed={constructionMode === 'POINTS'} onClick={() => changeConstructionMode('POINTS')} className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${constructionMode === 'POINTS' ? 'border-primary bg-primary-subtle text-primary-strong' : 'border-border'}`}>맞춤 경로 생성</button>
            <button type="button" aria-pressed={constructionMode === 'ROUND_TRIP'} onClick={() => changeConstructionMode('ROUND_TRIP')} className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${constructionMode === 'ROUND_TRIP' ? 'border-primary bg-primary-subtle text-primary-strong' : 'border-border'}`}>랜덤 경로 생성</button>
          </div>
        )}

        {(start || waypoints.length > 0 || destination) && (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="선택한 경로 노드">
            {start && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">출발지</span>}
            {waypoints.map((waypoint, index) => (
              <span key={waypoint.nodeId} className="inline-flex items-center gap-1 rounded-full bg-amber-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-amber-700">
                경유지 {index + 1}
                <button type="button" aria-label={`경유지 ${index + 1} 삭제`} onClick={() => setWaypoints((current) => current.filter((item) => item.nodeId !== waypoint.nodeId))} className="grid size-6 place-items-center rounded-full hover:bg-amber-100"><X size={13} /></button>
              </span>
            ))}
            {destination && constructionMode === 'POINTS' && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">목적지</span>}
          </div>
        )}

        {constructionMode === 'ROUND_TRIP' && (
          <label className="mt-3 block text-sm font-medium">목표 총거리
            <span className="mt-1 flex items-center gap-2">
              <input type="number" min="0.5" max="50" step="0.5" value={targetDistanceKm} onChange={(event) => setTargetDistanceKm(Number(event.target.value))} className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3" />
              <span className="shrink-0 text-sm text-muted-foreground">km</span>
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">0.5~50km 범위에서 입력하면 출발지로 되돌아오는 순환 코스를 찾습니다.</span>
          </label>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['WALK', 'RUN', 'CYCLE'] as RouteActivityType[]).map((item) => (
            <button type="button" key={item} onClick={() => changeActivity(item)} className={`min-h-10 rounded-lg border font-semibold ${activity === item ? 'border-primary bg-primary-subtle text-primary-strong' : 'border-border'}`}>
              {item === 'WALK' ? '걷기' : item === 'RUN' ? '러닝' : '자전거'}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-sm font-medium">속도
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-2">
              {SPEEDS[activity].map((value) => <option key={value} value={value}>{value} km/h</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">우선 조건
            <select value={priority} onChange={(event) => setPriority(event.target.value as RoutePriorityType)} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-2">
              <option value="GREEN">녹지</option><option value="SLOPE">완만한 경사</option><option value="ROAD">도로 유형</option><option value="AMENITY">편의시설</option><option value="OBSTRUCTION">방해시설 회피</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-sm font-medium">가는 시점
          <input type="datetime-local" value={departureAt} min={localDateTimeValue(new Date())} onChange={(event) => setDepartureAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3" />
          <span className="mt-1 block text-xs text-muted-foreground">선택 시점의 기상·미세먼지 정보는 경로와 별도의 참고 정보로 제공됩니다.</span>
          {!departureValid && <span className="mt-1 block text-xs text-destructive">현재보다 이후 시간을 선택해 주세요. 오전 12시는 자정입니다.</span>}
        </label>

        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <button type="button" disabled={!canCreate} onClick={async () => {
          if (!start || (constructionMode === 'POINTS' && !destination)) return
          pollFailureCount.current = 0; setError(null); setCalculating(true); setResult(null)
          try {
            const accepted = constructionMode === 'ROUND_TRIP'
              ? await createRoundTripRoute({ startNodeId: start.nodeId, targetDistanceMeters: Math.round(targetDistanceKm * 1000), activityType: activity, priorityType: priority, speedKmh: speed, departureAt: new Date(departureAt).toISOString() })
              : await createRoute({ startNodeId: start.nodeId, waypointNodeIds: waypoints.map((waypoint) => waypoint.nodeId), destinationNodeId: destination!.nodeId, activityType: activity, priorityType: priority, speedKmh: speed, departureAt: new Date(departureAt).toISOString() })
            setRequestId(accepted.requestId)
          } catch (cause) {
            setCalculating(false)
            setError(cause instanceof ApiError ? cause.message : '경로 계산 요청을 시작하지 못했습니다.')
          }
        }} className="mt-3 min-h-11 w-full rounded-lg bg-primary font-semibold text-on-primary disabled:opacity-50">{constructionMode === 'ROUND_TRIP' ? '랜덤 경로 생성하기' : '최적 경로 만들기'}</button>

        {result?.status === 'FAILED' && <p className="mt-3 text-sm text-destructive">경로를 만들지 못했습니다. ({result.errorCode})</p>}
        {result?.status === 'COMPLETED' && (
          <>
          <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted p-3 text-sm">
            <div><dt className="text-muted-foreground">총거리</dt><dd className="font-semibold">{distance?.toFixed(2)} km</dd></div>
            <div><dt className="text-muted-foreground">예상시간</dt><dd className="font-semibold">{Math.round(result.durationMinutes ?? 0)}분</dd></div>
            <div><dt className="text-muted-foreground">사용자 칼로리</dt><dd className="font-semibold">{Math.round(result.ownerCaloriesKcal ?? 0)} kcal</dd></div>
            <div><dt className="text-muted-foreground">반려견 칼로리</dt><dd className="font-semibold">{result.petCaloriesKcal == null ? '체중 정보 필요' : `${Math.round(result.petCaloriesKcal)} kcal`}</dd></div>
            <div><dt className="text-muted-foreground">평균 경사</dt><dd className="font-semibold">{((result.averageSlope ?? 0) * 100).toFixed(1)}%</dd></div>
            <div><dt className="text-muted-foreground">인접 시설</dt><dd className="font-semibold">{facilitiesCount}곳</dd></div>
          </dl>
          <button type="button" disabled={saving || result.savedAt != null} onClick={async () => {
            if (!result.requestId || result.savedAt) return
            setSaving(true); setSaveNotice(null)
            try {
              const saved = await saveRoute(result.requestId)
              setResult(saved)
              void savedRoutes.refetch()
              setSaveNotice('내 경로에 저장했습니다.')
            } catch (cause) {
              setSaveNotice(cause instanceof ApiError ? cause.message : '경로를 저장하지 못했습니다.')
            } finally {
              setSaving(false)
            }
          }} className="mt-2 min-h-10 w-full rounded-lg border border-primary font-semibold text-primary-strong disabled:border-border disabled:text-muted-foreground">
            {saving ? '저장하고 있습니다…' : result.savedAt ? '저장된 경로' : '이 경로 저장하기'}
          </button>
          {saveNotice && <p className="mt-1 text-xs text-muted-foreground">{saveNotice}</p>}
          <div className="mt-2 rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold">인접 시설 상세</p>
            <p className="mt-1 text-xs text-muted-foreground">경로에서 300m 이내 시설이며 중복 위치는 한 번만 표시합니다.</p>
            <div className="mt-2 space-y-1.5">
              {facilityGroups.map((group) => (
                <details key={group.key} className="rounded-lg bg-muted px-3 py-2">
                  <summary className="cursor-pointer font-semibold">{group.label} {group.items.length}곳</summary>
                  {group.items.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">주변에서 확인되지 않았습니다.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {group.items.map((facility, index) => (
                        <li key={`${group.key}-${facility.id ?? index}`} className="border-t border-border pt-2 first:border-0 first:pt-0">
                          <p className="font-medium">{facility.name || `${group.label} ${index + 1}`}</p>
                          {facility.address && <p className="text-xs text-muted-foreground">{facility.address}</p>}
                          {facility.distanceMeters != null && <p className="text-xs text-primary-strong">경로에서 약 {Math.round(facility.distanceMeters)}m</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              ))}
            </div>
          </div>
          <div className="mt-2 rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold">가는 시점 환경정보</p>
            <p className="mt-1 text-xs text-muted-foreground">경로 비용에는 반영되지 않는 참고 정보입니다.</p>
            {!result.environmentInfo || result.environmentInfo.status === 'NOT_CONFIGURED' ? (
              <p className="mt-2 text-muted-foreground">기상청·에어코리아 API 키 설정 후 제공됩니다.</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <p>날씨: {result.environmentInfo.weather?.status === 'AVAILABLE' ? String(result.environmentInfo.weather.summary ?? '예보 제공') : providerStatusLabel(result.environmentInfo.weather, 'WEATHER')}</p>
                <p>미세먼지: {result.environmentInfo.airQuality?.status === 'AVAILABLE' ? `PM10 ${String(result.environmentInfo.airQuality.pm10 ?? '-')} / PM2.5 ${String(result.environmentInfo.airQuality.pm25 ?? '-')}` : providerStatusLabel(result.environmentInfo.airQuality, 'AIR')}</p>
              </div>
            )}
          </div>
          </>
        )}
        </div>

        {!sharedRouteId && plannerTab === 'SAVED' && (
          <div className="mt-3 text-sm" role="tabpanel">
            {savedRoutes.isPending && <p className="py-6 text-center text-muted-foreground">저장 경로를 불러오고 있습니다…</p>}
            {savedRoutes.isError && <div className="py-4 text-center"><p className="text-destructive">저장 경로를 불러오지 못했습니다.</p><button type="button" onClick={() => savedRoutes.refetch()} className="mt-2 font-semibold text-primary-strong">다시 불러오기</button></div>}
            {!savedRoutes.isPending && !savedRoutes.isError && savedRoutes.data?.length === 0 && <p className="py-6 text-center text-muted-foreground">아직 저장한 경로가 없습니다.</p>}
            <ul className="space-y-2">
              {savedRoutes.data?.map((route, index) => (
                <li key={route.requestId}>
                  <button type="button" onClick={() => { setRequestId(route.requestId); setResult(route); setCalculating(false); setError(null); setShareNotice(null) }} className={`w-full rounded-xl border p-3 text-left ${result?.requestId === route.requestId ? 'border-primary bg-primary-subtle' : 'border-border bg-muted hover:border-primary'}`}>
                    <span className="font-semibold">저장 경로 {index + 1} · {route.activityType === 'WALK' ? '걷기' : route.activityType === 'RUN' ? '러닝' : '자전거'}</span>
                    <span className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{((route.totalDistanceMeters ?? 0) / 1000).toFixed(2)}km · {Math.round(route.durationMinutes ?? 0)}분</span><time>{new Date(route.savedAt ?? route.createdAt).toLocaleDateString('ko-KR')}</time></span>
                  </button>
                </li>
              ))}
            </ul>
            {result?.savedAt && (
              <div className="mt-3 rounded-xl border border-border p-3">
                <p className="font-semibold">선택한 저장 경로 공유</p>
                <p className="mt-1 text-xs text-muted-foreground">현재 참여 중인 오픈채팅방에만 공유할 수 있습니다.</p>
                <div className="mt-2 flex gap-2">
                  <select aria-label="공유할 오픈채팅방" value={shareRoomId} onChange={(event) => { setShareRoomId(event.target.value); setShareNotice(null) }} disabled={joinedRooms.isPending || joinedRooms.isError} className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3">
                    <option value="">{joinedRooms.isPending ? '채팅방을 불러오는 중…' : joinedRooms.isError ? '채팅방 조회 실패' : '오픈채팅방 선택'}</option>
                    {(joinedRooms.data ?? []).map((room) => <option key={room.roomId} value={room.roomId}>{room.title} ({room.activeParticipants ?? 0}명)</option>)}
                  </select>
                  <button type="button" disabled={sharing || !shareRoomId} className="rounded-lg bg-primary px-3 font-semibold text-on-primary disabled:opacity-50" onClick={async () => {
                    const roomId = Number(shareRoomId)
                    if (!Number.isInteger(roomId) || roomId <= 0) { setShareNotice('공유할 오픈채팅방을 선택해 주세요.'); return }
                    setSharing(true); setShareNotice(null)
                    try {
                      await shareRouteToOpenChat(roomId, { routeId: result.requestId, clientMessageId: crypto.randomUUID() })
                      setShareNotice('선택한 저장 경로를 공유했습니다.')
                    } catch (cause) {
                      setShareNotice(cause instanceof ApiError ? cause.message : '경로를 공유하지 못했습니다.')
                    } finally { setSharing(false) }
                  }}>{sharing ? '공유 중…' : '공유'}</button>
                </div>
                {!joinedRooms.isPending && !joinedRooms.isError && joinedRooms.data?.length === 0 && <p className="mt-2 text-muted-foreground">현재 참여 중인 오픈채팅방이 없습니다.</p>}
                {joinedRooms.isError && <button type="button" onClick={() => joinedRooms.refetch()} className="mt-2 font-semibold text-primary-strong">채팅방 다시 불러오기</button>}
                {shareNotice && <p className="mt-2 text-muted-foreground">{shareNotice}</p>}
              </div>
            )}
          </div>
        )}
        </div>}
        </div>
      </section>
    </div>
  )
}
