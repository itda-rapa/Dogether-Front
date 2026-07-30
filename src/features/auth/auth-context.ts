import { createContext, useContext } from 'react'
import type { Me } from './types'

export type AuthContextValue = {
  /** 저장된 토큰 복원이 끝나기 전 true. 이 동안 라우팅 판단을 미룬다. */
  loading: boolean
  /**
   * 유효한 세션(토큰) 보유 여부.
   *
   * 프로필(/me) 조회 성공 여부와 분리한다. 프로필 API 가 실패해도 로그인 자체는
   * 유지돼야 하고, 반대로 프로필이 없다고 로그인 화면으로 튕기면 안 된다.
   */
  hasSession: boolean
  /** 프로필. 아직 못 받았거나 조회에 실패하면 null 이다. */
  me: Me | null
  meStatus: 'pending' | 'error' | 'success'
  meError: unknown
  refetchMe: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    email: string
    password: string
    nickname: string
    neighborhoodCode: string
  }) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
