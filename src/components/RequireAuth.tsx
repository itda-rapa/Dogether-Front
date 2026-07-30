import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/auth-context'

/**
 * 인증이 필요한 라우트 가드.
 *
 * 세션 복원이 끝나기 전에는 판단을 미룬다. 그러지 않으면 새로고침할 때마다
 * 로그인 화면이 한 번 번쩍이고 원래 화면으로 돌아온다.
 */
export function RequireAuth() {
  const { loading, hasSession } = useAuth()
  const location = useLocation()

  if (loading) return <SessionLoading />

  if (!hasSession) {
    // 로그인 후 원래 가려던 곳으로 돌려보내기 위해 위치를 넘긴다.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function SessionLoading() {
  return (
    <div
      className="grid min-h-dvh place-items-center"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="text-muted-foreground">불러오는 중…</span>
    </div>
  )
}
