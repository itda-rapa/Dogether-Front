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
  OAuthExchangeResult,
  OAuthProviderName,
  OAuthSignupBody,
  PasswordResetRequest,
  SignupRequest,
  UpdateMeBody,
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

/**
 * OAuth 브라우저 시작 URL. `/oauth2/authorization/{provider}` 는 fetch 대상이 아니라
 * 실제 페이지 이동(302 redirect) 대상이라 apiRequest 를 거치지 않는다.
 *
 * VITE_API_BASE_URL 이 `/api`(개발 프록시, 기본값)면 상대 경로를 그대로 쓴다 —
 * vite.config.ts 의 `/oauth2`, `/login/oauth2` 프록시가 백엔드로 넘긴다.
 * 절대 URL(운영, 예: https://api.example.com/api)이면 `/api` 접미사를 떼어
 * 백엔드 origin 으로 직접 이동한다.
 */
export function oauthStartUrl(provider: OAuthProviderName) {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const origin = base.endsWith('/api') ? base.slice(0, -'/api'.length) : base
  return `${origin}/oauth2/authorization/${provider.toLowerCase()}`
}

/** 200 이면 AuthTokensResponse, 202 면 OAuthSignupRequiredResponse. */
export function exchangeOAuth(provider: OAuthProviderName, loginCode: string) {
  return apiRequest<OAuthExchangeResult>('/auth/oauth/exchange', {
    method: 'POST',
    body: { provider, loginCode },
    anonymous: true,
  })
}

/** signupToken 은 exchangeOAuth 의 202 응답에서 받은 값을 그대로 넘긴다. */
export function signupOAuth(body: OAuthSignupBody) {
  return apiRequest<AuthTokens>('/auth/oauth/signup', {
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
 * 닉네임·동네·몸무게 부분 수정(#173). `body` 에 실제로 있는 키만 서버가 반영한다 —
 * 안 바꾼 필드는 호출부에서 아예 빼야 한다(빈 객체·unknown property 거부).
 */
export function updateMe(body: UpdateMeBody) {
  return apiRequest<Me>('/me', { method: 'PATCH', body })
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
