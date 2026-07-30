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
}

export type LoginRequest = {
  email: string
  password: string
}
