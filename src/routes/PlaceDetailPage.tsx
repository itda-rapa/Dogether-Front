import { useParams } from 'react-router'
import { Clock, MapPin, Phone, Storefront } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { LikeButton } from '@/components/ui/LikeButton'

export function PlaceDetailPage() {
  const { placeId = '' } = useParams()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/map" label="지도" />

      <div className="mt-4 flex items-start gap-4">
        <div
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"
        >
          <Storefront size={30} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight">시흥동물병원</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">병원 · 320m</p>
        </div>
        {/* 하트를 누르면 마이 페이지의 "나의 장소"에 쌓인다. */}
        <LikeButton count={7} />
      </div>

      <dl className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <InfoRow icon={<MapPin size={18} />} term="주소" value="경기 성남시 수정구 시흥동 12-3" />
        <InfoRow icon={<Clock size={18} />} term="운영시간" value="09:00 - 19:00" />
        <InfoRow icon={<Phone size={18} />} term="전화번호" value="031-000-0000" />
      </dl>

      <h2 className="mb-3 mt-8 text-lg font-bold">반려동물 정보</h2>
      <dl className="overflow-hidden rounded-xl border border-border bg-surface">
        <InfoRow term="견종 크기" value={null} />
        <InfoRow term="예방접종 필수" value={null} />
      </dl>

      <div className="mt-8">
        <NotConnected
          endpoint={`장소 상세 (id: ${placeId}) — 네이버 지역검색 API`}
          note="견종 크기별 가능 여부와 예방접종 요구 여부는 외부 API 에 없을 가능성이 큽니다. 별도 수집이 필요한지 확인해야 합니다."
        />
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  term,
  value,
}: {
  icon?: React.ReactNode
  term: string
  value: string | null
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd
        className={
          value ? 'ml-auto min-w-0 truncate' : 'ml-auto text-muted-foreground'
        }
      >
        {value ?? '확인 필요'}
      </dd>
    </div>
  )
}
