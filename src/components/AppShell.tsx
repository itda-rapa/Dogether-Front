import { Link, NavLink, Outlet } from 'react-router'
import { List, MagnifyingGlass, Bell, Sun, Moon } from '@phosphor-icons/react'
import { NAV_ITEMS } from '@/app/navigation'
import { useTheme } from '@/app/theme-context'
import { useAuth } from '@/features/auth/auth-context'
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
    <div className="min-h-dvh md:flex">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        {/*
          하단 탭바가 콘텐츠를 가리지 않도록 여백을 확보한다.
          탭바 높이(64px) + iOS 홈 인디케이터 safe-area.
        */}
        <main
          className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"
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

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <button
          type="button"
          aria-label="메뉴 열기"
          className="grid size-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-primary-subtle md:hidden"
        >
          <List size={22} />
        </button>

        {/* 프로필을 누르면 마이 페이지로. Figma 의 프로필 메뉴 진입점이다. */}
        <Link to="/me" className="flex min-w-0 items-center gap-2">
          <div aria-hidden className="size-9 shrink-0 rounded-full bg-muted" />
          <span className="truncate font-semibold">
            {me?.nickname ?? '내 프로필'}
          </span>
          {/* 동네 뱃지는 솔리드 청록. 브랜드색이 실제로 보이는 몇 안 되는 자리다. */}
          {me && (
            <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[13px] font-semibold text-on-primary">
              {me.neighborhoodCode}
            </span>
          )}
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <IconLink to="/search" label="검색">
            <MagnifyingGlass size={20} />
          </IconLink>
          <IconLink to="/notifications" label="알림">
            <Bell size={20} />
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
      <div className="px-3 pb-6 text-xl font-bold text-primary">Dogether</div>

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
                    // 활성 항목은 솔리드 청록. 창백한 민트로 두면 어디가 켜졌는지 안 읽힌다.
                    isActive
                      ? 'bg-primary text-on-primary'
                      : 'text-muted-foreground hover:bg-primary-subtle hover:text-primary',
                    !isActive && emphasized && 'text-primary',
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
                  isActive ? 'text-primary' : 'text-muted-foreground',
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
