import { Link, NavLink, Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { MagnifyingGlass, Bell, Sun, Moon } from '@phosphor-icons/react'
import { NAV_ITEMS } from '@/app/navigation'
import { useTheme } from '@/app/theme-context'
import { useAuth } from '@/features/auth/auth-context'
import { listMyPets } from '@/features/pet/api'
import { listNeighborhoods } from '@/features/auth/api'
import { listNotifications } from '@/features/chat/api'
import { cn } from '@/lib/cn'

/**
 * 앱 셸.
 *
 * 원본 Figma 는 모바일 앱 기준이라 하단 탭바만 있다. 웹으로 옮기면서
 * < 768px 은 하단 탭바를 유지하고, >= 768px 은 같은 5개 항목을 좌측
 * 사이드바로 전환한다. 항목과 순서는 양쪽이 동일해야 한다.
 */
export function AppShell() {
  return (
    /*
      모바일에서도 flex-col 로 세로 축을 잡아 둬야 한다. 이게 없으면 이 div 는
      block 이라 안쪽 `flex-1 flex-col` 래퍼(Header+main)가 뷰포트 높이로
      늘어나지 못하고 콘텐츠만큼만 차지한다. 다만 이것만으로는 부족하다 —
      나머지 절반은 main 쪽 주석 참고.
    */
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />

        {/*
          하단 탭바가 콘텐츠를 가리지 않도록 여백을 확보한다.
          탭바 높이(64px) + iOS 홈 인디케이터 safe-area.
        */}
        {/*
          flex flex-col 이 반드시 필요하다. main 자체가 block 이면 안쪽에서
          `min-h-full`(높이 100%)을 쓰는 자식이 퍼센트를 풀지 못한다 — main 의
          높이가 flex-grow 로 "그려진" 값일 뿐 CSS 상 height 는 여전히 auto라서,
          퍼센트 계산의 기준이 되지 못하기 때문이다(ChatRoomPage 입력창이 화면
          하단이 아니라 메시지 바로 아래에 붙던 버그의 원인). main 을 flex-col
          로 만들고 자식이 `flex-1`을 쓰면 퍼센트가 아니라 flex 계산이라 항상
          늘어난다.
        */}
        <main
          className="flex min-h-0 flex-1 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"
          id="main-content"
        >
          <Outlet />
        </main>
      </div>

      <BottomTabBar />
    </div>
  )
}

function Header() {
  const { theme, toggle } = useTheme()
  const { me } = useAuth()

  const pets = useQuery({
    queryKey: ['pets', 'me'],
    queryFn: listMyPets,
    enabled: !!me,
  })
  const neighborhoods = useQuery({
    queryKey: ['neighborhoods'],
    queryFn: listNeighborhoods,
    enabled: !!me,
  })
  const notifications = useQuery({
    queryKey: ['notifications', me?.activePetId],
    queryFn: listNotifications,
    enabled: me?.activePetId != null,
    refetchInterval: 30_000,
  })
  const unreadCount = me
    ? (notifications.data?.filter((item) => !item.readAt).length ?? 0)
    : 0

  const hasActivePet = me?.activePetId != null
  const activePetNickname = pets.data?.find(
    (pet) => pet.petId === me?.activePetId,
  )?.nickname
  // 대표 펫이 없으면 등록을 유도한다. pets 로딩 중엔 사람 닉네임으로 잠깐 대체해 깜빡임을 줄인다.
  const profileLabel = !me
    ? '내 프로필'
    : !hasActivePet
      ? '펫 등록하기'
      : (activePetNickname ?? me.nickname)

  const neighborhood = neighborhoods.data?.find(
    (n) => n.code === me?.neighborhoodCode,
  )
  const neighborhoodLabel =
    neighborhood &&
    (neighborhood.eupmyeondongName ?? neighborhood.sigunguName ?? neighborhood.sidoName)

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4">
        {/* 프로필을 누르면 마이 페이지로. 대표 펫이 없으면 등록 화면으로 바로 보낸다. */}
        <Link
          to={me && !hasActivePet ? '/me/pets/new' : '/me'}
          className="flex min-w-0 items-center gap-2"
        >
          {me?.avatarUrl ? (
            <img
              src={me.avatarUrl}
              alt=""
              className="size-9 shrink-0 rounded-full bg-muted object-cover"
            />
          ) : (
            <div aria-hidden className="size-9 shrink-0 rounded-full bg-muted" />
          )}
          <span className="truncate font-semibold">{profileLabel}</span>
          {/* 동네는 정보성 태그라 솔리드 CTA보다 낮은 위계로 표시한다. */}
          {me && (
            <span className="shrink-0 rounded-full bg-primary-subtle px-2.5 py-1 text-[13px] font-medium text-primary-strong">
              {neighborhoodLabel ?? me.neighborhoodCode}
            </span>
          )}
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <IconLink to="/search" label="검색">
            <MagnifyingGlass size={20} />
          </IconLink>
          <IconLink to="/notifications" label="알림">
            <span className="relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 min-w-4 rounded-full bg-like px-1 text-center text-[10px] font-bold leading-4 text-white"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {unreadCount > 0 && (
                <span className="sr-only">읽지 않은 알림 {unreadCount}개</span>
              )}
            </span>
          </IconLink>
          <IconButton
            label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            onClick={toggle}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </IconButton>
        </div>
      </div>
    </header>
  )
}

function IconLink({
  to,
  label,
  children,
}: {
  to: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="grid size-11 place-items-center rounded-lg transition-colors hover:bg-primary-subtle"
    >
      {children}
    </Link>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      // 아이콘만 있는 버튼은 반드시 aria-label 을 갖는다.
      aria-label={label}
      onClick={onClick}
      // 최소 히트영역 44x44
      className="grid size-11 place-items-center rounded-lg transition-colors hover:bg-primary-subtle"
    >
      {children}
    </button>
  )
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-surface px-3 py-4 md:block">
      <Link to="/" className="flex items-center gap-2 px-3 pb-6 text-xl font-bold text-primary-strong">
        <img src="/logo-mark.png" alt="" className="size-6 shrink-0" />
        Dogether
      </Link>

      {/* 하단 탭바와 동시에 DOM 에 존재하므로 landmark 라벨을 구분한다 */}
      <nav aria-label="주요 메뉴 (사이드바)">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, emphasized }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium transition-colors',
                    // 데스크톱 활성 메뉴는 hover와 같은 민트 계열로 통일한다.
                    isActive
                      ? 'bg-primary-subtle text-primary-strong'
                      : 'text-muted-foreground hover:bg-primary-subtle hover:text-primary-strong',
                    !isActive && emphasized && 'text-primary-strong',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function BottomTabBar() {
  return (
    <nav
      aria-label="주요 메뉴 (하단 탭)"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-3xl">
        {NAV_ITEMS.map(({ to, label, icon: Icon, emphasized }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-1 transition-colors',
                  isActive ? 'text-primary-strong' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) =>
                emphasized ? (
                  <>
                    <span className="grid size-11 place-items-center rounded-full bg-primary text-on-primary">
                      <Icon size={24} weight="bold" />
                    </span>
                    <span className="sr-only">{label}</span>
                  </>
                ) : (
                  <>
                    <Icon size={24} weight={isActive ? 'fill' : 'regular'} />
                    {/* 라벨 13px — 12px 미만으로 내리지 않는다 */}
                    <span className="text-[13px] font-medium">{label}</span>
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
