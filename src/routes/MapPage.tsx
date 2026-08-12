import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CircleNotch, Heart, MapPin, Storefront, Warning } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { NotConnected } from '@/components/ui/NotConnected'
import { cn } from '@/lib/cn'

const FILTERS = ['약국', '병원', '카페', '호텔'] as const

type GeoStatus = 'idle' | 'pending' | 'granted' | 'denied'

export function MapPage() {
  const [params, setParams] = useSearchParams()
  const active = params.get('filter') ?? '약국'
  const likedOnly = params.get('liked') === '1'

  /*
    채팅 팝업(B-3)에서 "지도에서 보기"를 눌렀을 때만 위치 권한을 묻는다.
    지도를 그냥 둘러보러 온 방문에서는 묻지 않는다.
  */
  const wantsLocate = params.get('intent') === 'locate'
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!wantsLocate || geoStatus !== 'idle') return
    if (!('geolocation' in navigator)) {
      setGeoStatus('denied')
      return
    }
    setGeoStatus('pending')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus('granted')
      },
      () => setGeoStatus('denied'),
      { timeout: 8000 },
    )
  }, [wantsLocate, geoStatus])

  return (
    <Page title="지도">
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            aria-pressed={active === f && !likedOnly}
            onClick={() => setParams({ filter: f })}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-4 font-medium transition-colors',
              active === f && !likedOnly
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
            )}
          >
            {f}
          </button>
        ))}

        {/* 좋아요 필터만 기능색(코랄)을 쓴다. 형태(채움/외곽선)도 함께 바뀐다. */}
        <button
          aria-pressed={likedOnly}
          onClick={() =>
            setParams(likedOnly ? { filter: active } : { filter: active, liked: '1' })
          }
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 font-medium transition-colors',
            likedOnly
              ? 'border-like bg-surface text-foreground'
              : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
          )}
        >
          <Heart
            size={18}
            weight={likedOnly ? 'fill' : 'regular'}
            className={likedOnly ? 'text-like' : undefined}
          />
          좋아요
        </button>
      </div>

      {wantsLocate && (
        <p className="mb-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {geoStatus === 'pending' && (
            <>
              <CircleNotch size={14} className="animate-spin" aria-hidden />
              내 위치를 확인하는 중…
            </>
          )}
          {geoStatus === 'granted' && coords && (
            <>
              <MapPin size={14} aria-hidden />
              내 위치 확인됨 ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
            </>
          )}
          {geoStatus === 'denied' && (
            <>
              <Warning size={14} aria-hidden />
              위치 권한이 없어 기본 목록만 보여줍니다.
            </>
          )}
        </p>
      )}

      {/*
        지도 SDK 자리. 네이버 지도 JS SDK 를 붙인다.
        window 의존이라 클라이언트에서만 초기화되며, 컨테이너 높이를 미리 잡아
        로드 시 레이아웃이 밀리지 않게 한다.
      */}
      <div
        role="img"
        aria-label="지도 영역 (연동 예정)"
        className="mb-4 grid aspect-[4/3] w-full place-items-center rounded-xl border border-border bg-muted text-muted-foreground"
      >
        <MapPin size={32} />
      </div>

      {/* 기획: 리스트는 화면 아래에서 올라오고 처음에는 자동으로 떠 있는다. */}
      <h2 className="mb-3 text-lg font-bold">
        {likedOnly ? '나의 장소' : `${active} 목록`}
      </h2>

      <ul className="mb-6 flex flex-col gap-2">
        {PLACEHOLDER_PLACES.map((p) => (
          <li key={p.id}>
            <PlaceRow place={p} />
          </li>
        ))}
      </ul>

      <NotConnected
        endpoint={
          likedOnly
            ? 'GET /me/places'
            : '네이버 지역검색 API · 공공데이터포털 동물위탁관리업'
        }
        note={
          '카페·호텔 데이터를 어디서 가져올지 확인이 필요합니다. 견종 크기별 가능 여부와 예방접종 요구 여부는 API 에 없을 수 있습니다.' +
          (coords
            ? ` 현재 좌표(${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) 기준 반경 검색은 카카오 로컬 API 연동 후 제공됩니다.`
            : '')
        }
      />
    </Page>
  )
}

type PlaceholderPlace = {
  id: number
  name: string
  address: string
  distance: string
  liked: boolean
}

const PLACEHOLDER_PLACES: PlaceholderPlace[] = [
  { id: 1, name: '시흥동물병원', address: '경기 성남시 수정구 시흥동 12-3', distance: '320m', liked: true },
  { id: 2, name: '멍멍약국', address: '경기 성남시 수정구 시흥동 45-1', distance: '540m', liked: false },
  { id: 3, name: '펫프렌들리 카페', address: '경기 성남시 수정구 금토동 8', distance: '1.2km', liked: false },
]

function PlaceRow({ place }: { place: PlaceholderPlace }) {
  return (
    <Link
      to={`/map/${place.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle"
    >
      <div
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
      >
        <Storefront size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{place.name}</p>
        <p className="truncate text-[14px] text-muted-foreground">
          {place.address}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {place.distance}
        </span>
        {place.liked && (
          <Heart size={16} weight="fill" className="text-like" aria-label="찜한 장소" />
        )}
      </div>
    </Link>
  )
}
