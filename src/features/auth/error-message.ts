import { ApiError, NetworkError } from '@/lib/api'

/**
 * 인증 오류를 사용자 문구로 바꾼다.
 * 어떤 이메일이 가입돼 있는지 흘리지 않도록 401 은 뭉뚱그려 답한다.
 */
const EMAIL_VERIFICATION_MESSAGES: Record<string, string> = {
  EMAIL_VERIFICATION_RATE_LIMITED: '잠시 후 다시 시도해 주세요.',
  EMAIL_VERIFICATION_CODE_MISMATCH: '인증번호가 일치하지 않습니다.',
  EMAIL_VERIFICATION_UNAVAILABLE: '인증 요청이 만료되었습니다. 이메일을 다시 인증해 주세요.',
  EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED:
    '인증번호 입력 가능 횟수를 초과했습니다. 이메일을 다시 인증해 주세요.',
  EMAIL_VERIFICATION_TOKEN_INVALID: '인증이 만료되었습니다. 이메일을 다시 인증해 주세요.',
  EMAIL_DELIVERY_UNAVAILABLE: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
}

export function toAuthMessage(e: unknown): string {
  if (e instanceof NetworkError) return e.message
  if (e instanceof ApiError) {
    if (e.code in EMAIL_VERIFICATION_MESSAGES) return EMAIL_VERIFICATION_MESSAGES[e.code]
    if (e.status === 401) return '이메일 또는 비밀번호가 올바르지 않습니다.'
    if (e.status === 403) return '이용이 제한된 계정입니다.'
    if (e.status === 409) return '이미 사용 중인 이메일입니다.'
    return e.message
  }
  return '알 수 없는 오류가 발생했습니다.'
}

/** UNAVAILABLE·ATTEMPTS_EXCEEDED·TOKEN_INVALID — challenge/token 이 죽어 이메일 단계부터 다시 시작해야 하는 오류. */
export function isEmailVerificationExpired(e: unknown): boolean {
  return (
    e instanceof ApiError &&
    (e.code === 'EMAIL_VERIFICATION_UNAVAILABLE' ||
      e.code === 'EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED' ||
      e.code === 'EMAIL_VERIFICATION_TOKEN_INVALID')
  )
}
