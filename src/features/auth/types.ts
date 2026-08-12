/** 04_M1_OpenAPI.yaml 의 스키마를 그대로 옮긴 타입. 임의로 바꾸지 않는다. */

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  /** ISO date-time */
  accessTokenExpiresAt: string
}

export type Me = {
  userId: number
  email: string
  nickname: string
  publicTag: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN'
  /** L1 = Active Pet 없음, L2 = 있음 */
  accessLevel: 'L1' | 'L2'
  neighborhoodCode: string
  activePetId: number | null
  /**
   * ⚠️ 제안 단계 필드. M1 OpenAPI 의 `Me` 에는 없다. `PATCH /me/avatar` 로 이
   * 필드를 채우는 걸 제안했다 — docs/handover/profile-avatar-be.md 참고.
   * BE 배포 전에는 응답에 이 키 자체가 없어 항상 undefined 로 온다.
   */
  avatarUrl?: string | null
}

export type Neighborhood = {
  code: string
  sidoName: string
  sigunguName: string | null
  eupmyeondongName: string | null
}

export function formatNeighborhood(n: Neighborhood) {
  return [n.sidoName, n.sigunguName, n.eupmyeondongName].filter(Boolean).join(' ')
}

export type SignupRequest = {
  email: string
  password: string
  nickname: string
  neighborhoodCode: string
  /** 이메일 인증 확인(confirm) 응답으로 받은 단기 토큰. */
  verificationToken: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type EmailVerificationPurpose = 'SIGNUP' | 'PASSWORD_RESET'

export type EmailVerificationSendRequest = {
  email: string
  purpose: EmailVerificationPurpose
}

export type EmailVerificationChallenge = {
  challengeId: string
  /** ISO date-time. 인증번호(코드) 자체의 만료 시각. */
  expiresAt: string
  resendAfterSeconds: number
}

export type EmailVerificationConfirmRequest = {
  challengeId: string
  code: string
}

export type EmailVerificationConfirmed = {
  verificationToken: string
  /** ISO date-time. verificationToken 의 만료 시각. */
  expiresAt: string
}

/**
 * ⚠️ 제안 단계 엔드포인트, M1 OpenAPI 계약에 없음. confirmEmailVerification
 * (purpose: 'PASSWORD_RESET')로 받은 verificationToken 을 SignupRequest 와
 * 동일한 방식으로 재사용한다고 가정했다. 실제 경로·바디는 BE 확정 필요.
 */
export type PasswordResetRequest = {
  verificationToken: string
  newPassword: string
}
