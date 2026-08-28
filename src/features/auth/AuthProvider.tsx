import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { configureAuth } from '@/lib/api'
import { connect as connectChatRealtime, disconnect as disconnectChatRealtime } from '@/features/chat/directRealtime'
import { AuthContext } from './auth-context'
import * as authApi from './api'
import type { AuthTokens } from './types'

const ACCESS_KEY = 'dogether-access-token'
const REFRESH_KEY = 'dogether-refresh-token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  // 토큰은 ref 로 들고 있는다. 렌더 사이클과 무관하게 즉시 읽혀야 하기 때문.
  const accessToken = useRef<string | null>(null)
  const refreshToken = useRef<string | null>(null)
  /** 동시에 여러 요청이 401 을 받아도 회전은 한 번만 돌게 한다. */
  const refreshInFlight = useRef<Promise<string | null> | null>(null)

  const persist = useCallback((tokens: AuthTokens | null) => {
    accessToken.current = tokens?.accessToken ?? null
    refreshToken.current = tokens?.refreshToken ?? null
    if (tokens) {
      localStorage.setItem(ACCESS_KEY, tokens.accessToken)
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
    } else {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
    }
  }, [])

  const clearSession = useCallback(() => {
    persist(null)
    setHasSession(false)
    queryClient.clear()
  }, [persist, queryClient])

  const doRefresh = useCallback(async () => {
    if (!refreshToken.current) return null
    if (refreshInFlight.current) return refreshInFlight.current

    refreshInFlight.current = (async () => {
      try {
        const tokens = await authApi.refreshTokens(refreshToken.current!)
        persist(tokens)
        return tokens.accessToken
      } catch {
        persist(null)
        return null
      } finally {
        refreshInFlight.current = null
      }
    })()

    return refreshInFlight.current
  }, [persist])

  // API 클라이언트에 토큰 접근자를 주입한다.
  useEffect(() => {
    configureAuth({
      getAccessToken: () => accessToken.current,
      refresh: doRefresh,
      onAuthLost: clearSession,
    })
  }, [doRefresh, clearSession])

  // 새로고침 시 저장된 토큰으로 세션을 복원한다.
  useEffect(() => {
    accessToken.current = localStorage.getItem(ACCESS_KEY)
    refreshToken.current = localStorage.getItem(REFRESH_KEY)
    setHasSession(Boolean(accessToken.current ?? refreshToken.current))
    setLoading(false)
  }, [])

  /*
    채팅 WebSocket 연결도 세션을 따라간다. 토큰은 이미 위에서 ref 로 들고 있으니
    새 접근자를 만들지 않고 그대로 넘긴다 — WEBSOCKET_ENABLED 가 꺼져 있으면
    연결이 조용히 실패하고 REST 폴링이 그대로 동작한다(features/chat/directRealtime.ts).
  */
  useEffect(() => {
    if (!hasSession) {
      disconnectChatRealtime()
      return
    }
    connectChatRealtime({
      getToken: () => accessToken.current,
      refresh: doRefresh,
      onAuthLost: clearSession,
    })
    return () => disconnectChatRealtime()
  }, [hasSession, doRefresh, clearSession])

  /*
    프로필은 세션과 분리된 별도 질의다.
    /me 가 아직 구현되지 않았거나(404) 일시적으로 실패해도 로그인은 유지된다.
  */
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    enabled: hasSession,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const signIn = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login({ email, password })
      persist(tokens)
      setHasSession(true)
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    [persist, queryClient],
  )

  const signUp = useCallback(
    async (input: {
      email: string
      password: string
      nickname: string
      neighborhoodCode: string
      verificationToken: string
    }) => {
      const tokens = await authApi.signup(input)
      persist(tokens)
      setHasSession(true)
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    [persist, queryClient],
  )

  const signInWithTokens = useCallback(
    (tokens: AuthTokens) => {
      persist(tokens)
      setHasSession(true)
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    [persist, queryClient],
  )

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // 서버 폐기에 실패해도 로컬 세션은 반드시 지운다.
    }
    clearSession()
  }, [clearSession])

  return (
    <AuthContext
      value={{
        loading,
        hasSession,
        me: meQuery.data ?? null,
        meStatus: meQuery.status,
        meError: meQuery.error,
        refetchMe: () => void meQuery.refetch(),
        signIn,
        signUp,
        signInWithTokens,
        signOut,
      }}
    >
      {children}
    </AuthContext>
  )
}
