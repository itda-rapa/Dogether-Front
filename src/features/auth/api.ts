import { apiRequest } from '@/lib/api'
import type {
  AuthTokens,
  EmailVerificationChallenge,
  EmailVerificationConfirmed,
  EmailVerificationConfirmRequest,
  EmailVerificationSendRequest,
  LoginRequest,
  Me,
  Neighborhood,
  PasswordResetRequest,
  SignupRequest,
} from './types'

export function listNeighborhoods() {
  return apiRequest<Neighborhood[]>('/neighborhoods', { anonymous: true })
}

export function requestEmailVerification(body: EmailVerificationSendRequest) {
  return apiRequest<EmailVerificationChallenge>('/auth/email-verifications', {
    method: 'POST',
    body,
    anonymous: true,
  })
}

export function confirmEmailVerification(body: EmailVerificationConfirmRequest) {
  return apiRequest<EmailVerificationConfirmed>('/auth/email-verifications/confirm', {
    method: 'POST',
    body,
    anonymous: true,
  })
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

export function resetPassword(body: PasswordResetRequest) {
  return apiRequest<void>('/auth/password-reset', {
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

/**
 * 프로필 사진 등록/교체.
 *
 * ⚠️ 제안 단계 엔드포인트, M1 계약에 없다. `mediaId` 는 features/media/api 의
 * `uploadMedia` 로 저장을 먼저 끝낸 미디어의 id 다 — 원본 URL 을 직접 보내지
 * 않고 서버가 소유권·상태를 검증하게 한다. docs/handover/profile-avatar-be.md 참고.
 */
export function updateMyAvatar(mediaId: number) {
  return apiRequest<Me>('/me/avatar', { method: 'PATCH', body: { mediaId } })
}
