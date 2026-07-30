import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CaretRight,
  SealCheck,
  Dog,
  SignOut,
  WarningCircle,
  ArrowClockwise,
  Plus,
} from '@phosphor-icons/react'
import { ApiError } from '@/lib/api'
import { Page } from '@/components/ui/Page'
import { useAuth } from '@/features/auth/auth-context'
import { selectActivePet } from '@/features/auth/api'
import { listMyPets } from '@/features/pet/api'
import { ageFrom, type Pet } from '@/features/pet/types'
import { cn } from '@/lib/cn'

/** Figma 기획의 마이페이지 메뉴. 순서를 임의로 바꾸지 않는다. */
const MENU: { label: string; to: string }[] = [
  { label: '펫 인증', to: '/me/pets/verify' },
  { label: '친구 목록', to: '/me/friends' },
  { label: '나의 장소', to: '/me/places' },
  { label: '차단 목록', to: '/me/blocks' },
  { label: '공지사항', to: '/notices' },
  { label: 'QNA', to: '/qna' },
  { label: 'FAQ', to: '/faq' },
]

export function MePage() {
  const { me, meStatus, meError, refetchMe, signOut } = useAuth()
  const queryClient = useQueryClient()

  const pets = useQuery({
    queryKey: ['pets', 'me'],
    queryFn: listMyPets,
    retry: false,
  })

  const activate = useMutation({
    mutationFn: selectActivePet,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      void queryClient.invalidateQueries({ queryKey: ['pets', 'me'] })
    },
  })

  if (meStatus === 'pending') {
    return (
      <Page title="마이 페이지">
        <p className="text-muted-foreground">불러오는 중…</p>
      </Page>
    )
  }

  if (!me) {
    return (
      <Page title="마이 페이지">
        <UnavailableNotice
          endpoint="GET /me"
          error={meError}
          onRetry={refetchMe}
        />
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-destructive"
        >
          <SignOut size={20} />
          로그아웃
        </button>
      </Page>
    )
  }

  return (
    <Page title="마이 페이지">
      <section className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div aria-hidden className="size-14 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{me.nickname}</p>
            <p className="truncate text-[14px] text-muted-foreground">
              {me.email}
            </p>
          </div>
        </div>

        <dl className="mt-4 flex flex-col gap-2 text-[14px]">
          <Row term="공개 태그" desc={me.publicTag} mono />
          <Row term="동네" desc={me.neighborhoodCode} />
        </dl>

        {/* L1 = Active Pet 이 없는 상태. 대부분의 기능이 막히므로 먼저 알린다. */}
        {me.accessLevel === 'L1' && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-lg border border-border p-3"
          >
            <WarningCircle
              size={20}
              weight="fill"
              className="mt-0.5 shrink-0 text-destructive"
            />
            <p className="text-[14px]">
              대표 강아지가 없습니다. 강아지를 등록하거나 아래에서 대표로
              지정하면 채팅·친구 기능을 쓸 수 있습니다.
            </p>
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="flex-1 text-lg font-bold">나의 펫</h2>
          <Link
            to="/me/pets/new"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary"
          >
            <Plus size={18} weight="bold" />
            등록
          </Link>
        </div>

        {pets.isPending && <p className="text-muted-foreground">불러오는 중…</p>}

        {pets.isError && (
          <UnavailableNotice
            endpoint="GET /pets/me"
            error={pets.error}
            onRetry={() => void pets.refetch()}
          />
        )}

        {pets.data?.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
            등록된 강아지가 없습니다.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {pets.data?.map((pet) => (
            <li key={pet.petId}>
              <PetRow
                pet={pet}
                isActive={me.activePetId === pet.petId}
                onActivate={() => activate.mutate(pet.petId)}
                activating={activate.isPending && activate.variables === pet.petId}
              />
            </li>
          ))}
        </ul>

        {activate.isError && (
          <p role="alert" className="mt-2 text-[14px] text-destructive">
            대표 강아지를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold">메뉴</h2>
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {MENU.map((item, i) => (
            <li key={item.label} className={i > 0 ? 'border-t border-border' : ''}>
              <Link
                to={item.to}
                className="flex min-h-11 items-center justify-between px-4 py-3 transition-colors hover:bg-primary-subtle"
              >
                <span>{item.label}</span>
                <CaretRight size={18} className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 관리자에게만 보인다. 실제 권한 검사는 서버가 한다. */}
      {(me.role === 'ADMIN' || me.role === 'SUPER_ADMIN') && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold">관리자</h2>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            <li>
              <Link
                to="/admin/reports"
                className="flex min-h-11 items-center justify-between px-4 py-3 transition-colors hover:bg-primary-subtle"
              >
                <span>신고 처리</span>
                <CaretRight size={18} className="text-muted-foreground" />
              </Link>
            </li>
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-destructive"
      >
        <SignOut size={20} />
        로그아웃
      </button>
    </Page>
  )
}

/**
 * 아직 구현되지 않은 API 를 구분해 알린다.
 *
 * 404 는 백엔드에 그 엔드포인트가 아직 없다는 뜻이라 사용자가 재시도해도 소용없다.
 * 일반 오류와 뭉뚱그리면 개발 중에 원인을 못 찾는다.
 */
function UnavailableNotice({
  endpoint,
  error,
  onRetry,
}: {
  endpoint: string
  error: unknown
  onRetry: () => void
}) {
  const notImplemented = error instanceof ApiError && error.status === 404

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <WarningCircle
        size={22}
        weight="fill"
        className="mt-0.5 shrink-0 text-destructive"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {notImplemented
            ? '아직 준비되지 않은 기능입니다'
            : '정보를 불러오지 못했습니다'}
        </p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {notImplemented
            ? `백엔드에 ${endpoint} 가 아직 구현되지 않았습니다.`
            : '잠시 후 다시 시도해 주세요.'}
        </p>
        {!notImplemented && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary"
          >
            <ArrowClockwise size={18} />
            다시 시도
          </button>
        )}
      </div>
    </div>
  )
}

function Row({
  term,
  desc,
  mono,
}: {
  term: string
  desc: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd className={cn('min-w-0 truncate', mono && 'tabular-nums')}>{desc}</dd>
    </div>
  )
}

function PetRow({
  pet,
  isActive,
  onActivate,
  activating,
}: {
  pet: Pet
  isActive: boolean
  onActivate: () => void
  activating: boolean
}) {
  const age = ageFrom(pet.birthDate)

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-surface p-4',
        isActive ? 'border-primary' : 'border-border',
      )}
    >
      <Link
        to={`/me/pets/${pet.petId}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <Dog size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{pet.nickname}</span>
            {pet.verified && (
              <SealCheck
                size={16}
                weight="fill"
                className="shrink-0 text-primary"
                aria-label="인증된 펫"
              />
            )}
          </p>
          <p className="truncate text-[14px] text-muted-foreground">
            {[age !== null ? `${age}살` : null, pet.breedName]
              .filter(Boolean)
              .join(' · ') || pet.publicTag}
          </p>
        </div>
      </Link>

      {isActive ? (
        <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-[13px] font-semibold text-on-primary">
          대표
        </span>
      ) : (
        <button
          type="button"
          onClick={onActivate}
          disabled={activating || pet.status !== 'ACTIVE'}
          className="min-h-11 shrink-0 rounded-lg border-2 border-primary px-3 font-semibold text-primary transition-colors hover:bg-primary-subtle disabled:opacity-50"
        >
          {activating ? '변경 중…' : '대표로'}
        </button>
      )}
    </div>
  )
}
