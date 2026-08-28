import { useState } from 'react'
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
  CalendarCheck,
  UserCircle,
} from '@phosphor-icons/react'
import { ApiError } from '@/lib/api'
import { Page } from '@/components/ui/Page'
import { AvatarUpload } from '@/components/ui/AvatarUpload'
import { useAuth } from '@/features/auth/auth-context'
import {
  selectActivePet,
  listNeighborhoods,
  updateMyAvatar,
} from '@/features/auth/api'
import { listMyPets, updatePetProfileImage } from '@/features/pet/api'
import { ageFrom, type Pet } from '@/features/pet/types'
import { listMyMeetingCards } from '@/features/meeting/api'
import type { MeetingCardListItem } from '@/features/meeting/types'
import { formatMeetAt, formatParticipants } from '@/features/meeting/format'
import { cn } from '@/lib/cn'

/*
  Figma 기획의 마이페이지 메뉴. 순서를 임의로 바꾸지 않는다.
  "펫 인증"은 여기 없다 — 조회 API 가 petId 를 미리 알아야 해서(EXISTING_PET_VERIFY),
  펫을 고르지 않은 채 들어오는 제너릭 진입점을 두지 않고 각 펫 상세 화면의
  "인증하기" 버튼으로만 들어가게 했다(PetDetailPage.tsx).
*/
const MENU: { label: string; to: string }[] = [
  { label: '친구 목록', to: '/me/friends' },
  { label: '나의 장소', to: '/me/places' },
  { label: '차단 목록', to: '/me/blocks' },
  { label: '숨긴 셋로그', to: '/me/hidden-setlogs' },
  { label: '공지사항', to: '/notices' },
  { label: 'Q&A', to: '/qna' },
  { label: 'FAQ', to: '/faq' },
]

export function MePage() {
  const { me, meStatus, meError, refetchMe, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [petsOpen, setPetsOpen] = useState(true)

  const pets = useQuery({
    queryKey: ['pets', 'me'],
    queryFn: listMyPets,
    retry: false,
  })

  /** 헤더와 같은 쿼리 키를 써서 캐시를 공유한다(추가 네트워크 요청 없음). */
  const neighborhoods = useQuery({
    queryKey: ['neighborhoods'],
    queryFn: listNeighborhoods,
    enabled: !!me,
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

  const neighborhood = neighborhoods.data?.find(
    (n) => n.code === me.neighborhoodCode,
  )
  const neighborhoodLabel =
    neighborhood &&
    (neighborhood.eupmyeondongName ?? neighborhood.sigunguName ?? neighborhood.sidoName)

  return (
    <Page title="마이 페이지">
      <section className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <AvatarUpload
            src={me.avatarUrl}
            alt={`${me.nickname} 프로필 사진`}
            size={56}
            fallback={<UserCircle size={32} />}
            onUploaded={async (result) => {
              await updateMyAvatar(result.media.id)
              await queryClient.invalidateQueries({ queryKey: ['me'] })
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{me.nickname}</p>
            <p className="truncate text-[14px] text-muted-foreground">
              {me.email}
            </p>
          </div>
        </div>

        <dl className="mt-4 flex flex-col gap-2 text-[14px]">
          <Row term="공개 태그" desc={me.publicTag} mono />
          <Row term="동네" desc={neighborhoodLabel ?? me.neighborhoodCode} />
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
          <button
            type="button"
            onClick={() => setPetsOpen((o) => !o)}
            aria-expanded={petsOpen}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <h2 className="text-lg font-bold">나의 펫</h2>
            <CaretRight
              size={18}
              className={cn(
                'text-muted-foreground transition-transform duration-200',
                petsOpen && 'rotate-90',
              )}
            />
          </button>
          <Link
            to="/me/pets/new"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary-strong"
          >
            <Plus size={18} weight="bold" />
            등록
          </Link>
        </div>

        {/* 다가오는 약속과 같은 grid-rows 트랜지션. 접혀도 내용은 마운트 상태로 둔다. */}
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-out',
            petsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden" inert={!petsOpen}>
            {pets.isPending && (
              <p className="text-muted-foreground">불러오는 중…</p>
            )}

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
                    activating={
                      activate.isPending && activate.variables === pet.petId
                    }
                  />
                </li>
              ))}
            </ul>

            {activate.isError && (
              <p role="alert" className="mt-2 text-[14px] text-destructive">
                대표 강아지를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold">메뉴</h2>
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          <UpcomingMeetingsMenuItem myPetId={me.activePetId} />
          {MENU.map((item) => (
            <li key={item.label} className="border-t border-border">
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
                to="/admin"
                className="flex min-h-11 items-center justify-between px-4 py-3 transition-colors hover:bg-primary-subtle"
              >
                <span>관리자 페이지</span>
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
 * 메뉴 목록 안에서 펼쳐지는 "다가오는 약속" 아코디언 행.
 *
 * 펼치기 전엔 요청을 보내지 않는다 — listMyMeetingCards 가 부르는
 * GET /meeting-cards/me 는 아직 BE 계약에 없는 제안 단계 엔드포인트라, 방문
 * 빈도가 높은 마이페이지에서 매번 에러를 띄우지 않으려는 것이다.
 */
function UpcomingMeetingsMenuItem({ myPetId }: { myPetId: number | null }) {
  const [open, setOpen] = useState(false)

  const meetings = useQuery({
    queryKey: ['meeting-cards', 'me', 'open'],
    queryFn: () => listMyMeetingCards({ status: 'OPEN', limit: 5 }),
    enabled: open,
    retry: false,
  })

  const items = meetings.data?.items ?? []

  return (
    <li className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-primary-subtle"
      >
        <span className="flex items-center gap-2">
          <CalendarCheck size={18} className="text-muted-foreground" />
          다가오는 약속
        </span>
        <CaretRight
          size={18}
          className={cn(
            'text-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>

      {/*
        grid-template-rows 를 0fr↔1fr 로 트랜지션해 부드럽게 접고 편다.
        조건부 렌더( {open && ...} )로 하면 닫힐 때 DOM 이 즉시 사라져 애니메이션이
        안 먹으므로, 내용은 항상 마운트해 두고 높이만 CSS 로 접는다.
      */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="border-t border-border bg-background px-4 py-3">
            {meetings.isPending && (
              <p className="text-[14px] text-muted-foreground">불러오는 중…</p>
            )}

            {meetings.isError && (
              <UnavailableNotice
                endpoint="GET /meeting-cards/me"
                error={meetings.error}
                onRetry={() => void meetings.refetch()}
              />
            )}

            {meetings.isSuccess && items.length === 0 && (
              <p className="text-[14px] text-muted-foreground">
                다가오는 약속이 없습니다.
              </p>
            )}

            {items.length > 0 && (
              <ul className="flex flex-col gap-2">
                {items.slice(0, 3).map((card) => (
                  <li key={card.cardId}>
                    <MeetingPreviewRow card={card} myPetId={myPetId} />
                  </li>
                ))}
              </ul>
            )}

            <Link
              to="/meetings"
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary-strong"
            >
              전체보기
            </Link>
          </div>
        </div>
      </div>
    </li>
  )
}

function MeetingPreviewRow({
  card,
  myPetId,
}: {
  card: MeetingCardListItem
  myPetId: number | null
}) {
  // ⚠️ 배포된 GET /meeting-cards/me 가 participants 인라인을 안 줄 수 있다. 방어한다.
  const participants = card.participants ?? []
  const others = participants.filter((p) => p.petId !== myPetId)
  const withLabel = formatParticipants(
    others.length > 0 ? others : participants,
  )

  return (
    <Link
      to={`/meeting-cards/${card.cardId}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-primary-subtle"
    >
      <span className="min-w-0 truncate text-[14px] font-medium">
        {withLabel}와의 약속 · {card.participantCount}명
      </span>
      <span className="shrink-0 text-[13px] text-muted-foreground">
        {formatMeetAt(card.meetAt)}
      </span>
    </Link>
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
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary-strong"
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
  const queryClient = useQueryClient()

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-surface p-4',
        isActive ? 'border-primary' : 'border-border',
      )}
    >
      {/*
        업로드 카메라 배지가 있는 아바타는 Link 밖에 둔다 — <a> 안에 <button> 을
        중첩하면 안 되고, 클릭도 항상 상세 페이지 이동으로 새 버린다.
      */}
      <AvatarUpload
        src={pet.profileUrl}
        alt={`${pet.nickname} 프로필 사진`}
        size={44}
        fallback={<Dog size={22} />}
        onUploaded={async (result) => {
          await updatePetProfileImage(pet.petId, result.media.id)
          await queryClient.invalidateQueries({ queryKey: ['pets', 'me'] })
        }}
      />

      <Link
        to={`/me/pets/${pet.petId}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{pet.nickname}</span>
            {pet.verified && (
              <SealCheck
                size={16}
                weight="fill"
                className="shrink-0 text-primary-strong"
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
          className="min-h-11 shrink-0 rounded-lg border-2 border-primary px-3 font-semibold text-primary-strong transition-colors hover:bg-primary-subtle disabled:opacity-50"
        >
          {activating ? '변경 중…' : '대표로'}
        </button>
      )}
    </div>
  )
}
