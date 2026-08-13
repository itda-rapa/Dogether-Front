import { Link } from 'react-router'
import { Heart, Storefront } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/auth-context'
import { PLACEHOLDER_PLACES } from '@/features/places/placeholderPlaces'
import { listLikedPlaceIds } from '@/features/places/likedPlaces'

/** 지도에서 하트를 누른 장소가 쌓이는 곳. */
export function PlacesPage() {
  const { me } = useAuth()
  const likedIds = me == null ? [] : listLikedPlaceIds(me.userId)
  const liked = PLACEHOLDER_PLACES.filter((p) => likedIds.includes(p.id))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">나의 장소</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        지도에서 하트를 누른 장소가 모입니다.
      </p>

      {liked.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="저장한 장소가 없습니다"
            description="지도에서 마음에 드는 곳에 하트를 눌러보세요."
            action={
              <Link
                to="/map"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-on-primary"
              >
                지도 보기
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {liked.map((p) => (
            <li key={p.id}>
              <Link
                to={`/map/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle"
              >
                <div
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
                >
                  <Storefront size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="truncate text-[14px] text-muted-foreground">
                    {p.address}
                  </p>
                </div>
                <Heart
                  size={20}
                  weight="fill"
                  className="shrink-0 text-like"
                  aria-label="찜한 장소"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <NotConnected endpoint="GET /me/places" />
      </div>
    </div>
  )
}
