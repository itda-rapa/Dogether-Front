import { Link, useSearchParams } from 'react-router'
import { AuthLayout } from '@/components/AuthLayout'

/**
 * `/oauth/error?errorCode=...` 콜백. errorCode 허용값은 dogether(백엔드)
 * docs/spec/M3/02_M3_API_계약.md §2 를 따른다 — 목록에 없는 값은 기본 문구로 처리한다.
 */
const ERROR_MESSAGE: Record<string, string> = {
  OAUTH_STATE_INVALID: '로그인 요청이 유효하지 않습니다. 다시 시도해 주세요.',
  OAUTH_STATE_EXPIRED: '로그인 요청 시간이 만료되었습니다. 다시 시도해 주세요.',
  OAUTH_AUTHORIZATION_DENIED: '로그인이 취소되었습니다.',
  OAUTH_IDENTITY_VERIFICATION_FAILED: '본인 확인에 실패했습니다.',
  OAUTH_PROVIDER_UNAVAILABLE: '지금은 이 방식으로 로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  INTERNAL_ERROR: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
}

export function OAuthErrorPage() {
  const [params] = useSearchParams()
  const errorCode = params.get('errorCode')
  const message = (errorCode && ERROR_MESSAGE[errorCode]) || '로그인에 실패했습니다.'

  return (
    <AuthLayout title="로그인" subtitle="로그인에 실패했습니다" hideTitle>
      <p role="alert" className="text-[14px] text-destructive">
        {message}
      </p>
      <Link
        to="/login"
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-on-primary transition-colors hover:bg-primary-hover"
      >
        로그인으로 돌아가기
      </Link>
    </AuthLayout>
  )
}
