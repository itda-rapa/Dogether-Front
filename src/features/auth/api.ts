import { apiRequest } from '@/lib/api'
import type {
  AuthTokens,
  LoginRequest,
  Me,
  Neighborhood,
  SignupRequest,
} from './types'

export function listNeighborhoods() {
  return apiRequest<Neighborhood[]>('/neighborhoods', { anonymous: true })
}

export function signup(body: SignupRequest) {
  return apiRequest<AuthTokens>('/auth/signup', {
    method: 'POST',
    body,
    anonymous: true,
  })
}

export function login(body: LoginRequest) {
  return apiRequest<AuthTokens>('/auth/login', {
    method: 'POST',
    body,
    anonymous: true,
  })
}

export function refreshTokens(refreshToken: string) {
  return apiRequest<AuthTokens>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    anonymous: true,
  })
}

export function logout() {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

export function getMe() {
  return apiRequest<Me>('/me')
}

export function selectActivePet(petId: number) {
  return apiRequest<Me>('/me/active-pet', { method: 'PUT', body: { petId } })
}
