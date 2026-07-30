import { ApiError, NetworkError } from '@/lib/api'

/**
 * 인증 오류를 사용자 문구로 바꾼다.
 * 어떤 이메일이 가입돼 있는지 흘리지 않도록 401 은 뭉뚱그려 답한다.
 */
export function toAuthMessage(e: unknown): string {
  if (e instanceof NetworkError) return e.message
  if (e instanceof ApiError) {
    if (e.status === 401) return '이메일 또는 비밀번호가 올바르지 않습니다.'
    if (e.status === 403) return '이용이 제한된 계정입니다.'
    if (e.status === 409) return '이미 사용 중인 이메일입니다.'
    return e.message
  }
  return '알 수 없는 오류가 발생했습니다.'
}
