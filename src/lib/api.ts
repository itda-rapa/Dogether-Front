/**
 * 백엔드 API 클라이언트.
 *
 * 모든 응답은 { success, message, data, error } 봉투로 온다.
 * 이 모듈이 봉투를 벗겨 data 만 돌려주고, 실패는 ApiError 로 던진다.
 * 화면 코드가 봉투 구조를 알 필요는 없다.
 *
 * 계약 원본: dogether(백엔드)/docs/spec/04_M1_OpenAPI.yaml
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

type Envelope<T> = {
  success: boolean
  message: string
  data: T | null
  error: { code: string; message: string } | null
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** 네트워크 자체가 실패한 경우. 서버가 준 오류(ApiError)와 구분한다. */
export class NetworkError extends Error {
  constructor(message = '네트워크에 연결할 수 없습니다.') {
    super(message)
    this.name = 'NetworkError'
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** 인증 헤더를 붙이지 않는다. 로그인·회원가입·동네 목록에 쓴다. */
  anonymous?: boolean
  signal?: AbortSignal
}

/** 토큰 접근자. AuthProvider 가 주입한다(순환 의존을 피하기 위한 구조). */
let tokenAccessor: {
  getAccessToken: () => string | null
  refresh: () => Promise<string | null>
  onAuthLost: () => void
} | null = null

export function configureAuth(accessor: typeof tokenAccessor) {
  tokenAccessor = accessor
}

/** REST 밖의 STOMP 연결에서 현재 access token을 헤더에 넣을 때만 사용한다. */
export function getRealtimeAccessToken() {
  return tokenAccessor?.getAccessToken() ?? null
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, anonymous = false, signal } = options

  const send = async (token: string | null) => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    try {
      return await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      })
    } catch {
      throw new NetworkError()
    }
  }

  let res = await send(anonymous ? null : (tokenAccessor?.getAccessToken() ?? null))

  // 액세스 토큰 만료면 한 번만 회전을 시도하고 재요청한다.
  if (res.status === 401 && !anonymous && tokenAccessor) {
    const renewed = await tokenAccessor.refresh()
    if (renewed) {
      res = await send(renewed)
    } else {
      tokenAccessor.onAuthLost()
    }
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  let envelope: Envelope<T> | null = null
  try {
    envelope = (await res.json()) as Envelope<T>
  } catch {
    // 봉투가 아닌 응답(프록시 오류 등)
  }

  if (!res.ok || !envelope?.success) {
    throw new ApiError(
      res.status,
      envelope?.error?.code ?? 'UNKNOWN',
      envelope?.error?.message ?? envelope?.message ?? '요청을 처리하지 못했습니다.',
    )
  }

  return envelope.data as T
}
