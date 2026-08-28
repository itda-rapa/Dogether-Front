import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowClockwise } from '@phosphor-icons/react'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/features/auth/auth-context'
import { exchangeOAuth, listNeighborhoods, signupOAuth } from '@/features/auth/api'
import { toAuthMessage } from '@/features/auth/error-message'
import { formatNeighborhood, isOAuthSignupRequired } from '@/features/auth/types'
import type { OAuthProviderName, OAuthSignupRequired } from '@/features/auth/types'
import { ApiError } from '@/lib/api'

/**
 * `/oauth/success?loginCode=...&provider=GOOGLE|NAVER` 콜백.
 * 계약 원본: dogether(백엔드) docs/spec/M3/02_M3_API_계약.md §2, .env.example 의
 * `*_OAUTH_SUCCESS_CALLBACK_URI` — 경로를 임의로 바꾸지 않는다.
 */
export function OAuthSuccessPage() {
  const [params] = useSearchParams()
  const { signInWithTokens, hasSession, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [signupRequired, setSignupRequired] = useState<
    (OAuthSignupRequired & { provider: OAuthProviderName }) | null
  >(null)
  const [done, setDone] = useState(false)

  const loginCode = params.get('loginCode')
  const provider = params.get('provider')
  const validProvider = provider === 'GOOGLE' || provider === 'NAVER'

  /*
    loginCode 는 1회용이다. React StrictMode(main.tsx)는 개발 모드에서 effect를
    마운트→클린업→재마운트로 두 번 돌리는데, `cancelled` 플래그는 상태 반영만
    막을 뿐 실제 네트워크 호출 자체는 막지 못한다 — 그대로 두면 같은 loginCode로
    exchangeOAuth 를 두 번 호출하게 되고, 그중 하나(서버가 나중에 처리하는 쪽)는
    "이미 소비됨"으로 실패한다. 만약 그게 cancelled 되지 않은 실행이면, 실제로는
    로그인에 성공했는데도 사용자에게 실패 화면이 뜨는 결과가 된다. 첫 실행에서만
    실제로 호출하도록 ref 로 한 번만 막는다(SetlogViewer.tsx 의 history push 이중
    실행 방지와 같은 종류의 StrictMode 대응).
  */
  const startedRef = useRef(false)

  useEffect(() => {
    if (!loginCode || !validProvider) return
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const result = await exchangeOAuth(provider, loginCode)
        if (cancelled) return
        if (isOAuthSignupRequired(result)) {
          setSignupRequired({ ...result, provider })
        } else {
          signInWithTokens(result)
          setDone(true)
        }
      } catch (e) {
        if (!cancelled) setError(toOAuthExchangeMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
    // signInWithTokens 는 세션마다 새로 만들어지지 않는 안정 참조라 의도적으로 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginCode, validProvider, provider])

  if (!loading && hasSession && done) return <Navigate to="/" replace />

  if (!loginCode || !validProvider) {
    return (
      <AuthLayout title="로그인" subtitle="잘못된 접근입니다" hideTitle>
        <p className="text-[14px] text-destructive">
          로그인 정보를 확인할 수 없습니다. 로그인 화면에서 다시 시도해 주세요.
        </p>
        <BackToLogin />
      </AuthLayout>
    )
  }

  if (signupRequired) {
    return <OAuthSignupForm signupRequired={signupRequired} />
  }

  if (error) {
    return (
      <AuthLayout title="로그인" subtitle="로그인에 실패했습니다" hideTitle>
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
        <BackToLogin />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="로그인" subtitle="로그인하는 중…" hideTitle>
      <p className="text-[14px] text-muted-foreground">잠시만 기다려 주세요…</p>
    </AuthLayout>
  )
}

const schema = z.object({
  nickname: z.string().trim().min(2, '닉네임은 2자 이상이어야 합니다.').max(20, '닉네임은 20자 이하여야 합니다.'),
  neighborhoodCode: z.string().min(1, '동네를 선택해 주세요.'),
})
type FormValues = z.input<typeof schema>

function OAuthSignupForm({
  signupRequired,
}: {
  signupRequired: OAuthSignupRequired & { provider: OAuthProviderName }
}) {
  const { signInWithTokens } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const neighborhoods = useQuery({
    queryKey: ['neighborhoods'],
    queryFn: listNeighborhoods,
    staleTime: 60 * 60 * 1000,
  })

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { nickname: '', neighborhoodCode: '' },
  })

  const complete = useMutation({
    mutationFn: (values: FormValues) =>
      signupOAuth({ signupToken: signupRequired.signupToken, ...values }),
    onSuccess: (tokens) => {
      signInWithTokens(tokens)
      setDone(true)
    },
    onError: (e) => setSubmitError(toAuthMessage(e)),
  })

  if (done) return <Navigate to="/" replace />

  return (
    <AuthLayout title="회원가입" subtitle="마지막 한 단계만 더 알려주세요">
      <form
        onSubmit={handleSubmit((values) => complete.mutate(values))}
        className="flex flex-col gap-5"
        noValidate
      >
        <Field label="닉네임" hint="2~20자" error={formState.errors.nickname?.message}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              autoComplete="nickname"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={inputClass(invalid)}
              {...register('nickname')}
            />
          )}
        </Field>

        <Field
          label="동네"
          error={
            formState.errors.neighborhoodCode?.message ??
            (neighborhoods.isError ? '동네 목록을 불러오지 못했습니다.' : undefined)
          }
        >
          {({ id, describedBy, invalid }) => (
            <>
              <select
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                disabled={!neighborhoods.data}
                className={inputClass(invalid)}
                {...register('neighborhoodCode')}
              >
                <option value="">
                  {neighborhoods.isPending
                    ? '불러오는 중…'
                    : neighborhoods.isError
                      ? '불러오지 못했습니다'
                      : '동네를 선택하세요'}
                </option>
                {neighborhoods.data?.map((n) => (
                  <option key={n.code} value={n.code}>
                    {formatNeighborhood(n)}
                  </option>
                ))}
              </select>
              {neighborhoods.isError && (
                <button
                  type="button"
                  onClick={() => void neighborhoods.refetch()}
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-primary-strong"
                >
                  <ArrowClockwise size={18} />
                  다시 시도
                </button>
              )}
            </>
          )}
        </Field>

        {submitError && (
          <p role="alert" className="text-[14px] text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={complete.isPending}>
          {complete.isPending ? '가입 중…' : '가입 완료'}
        </Button>
      </form>
    </AuthLayout>
  )
}

function BackToLogin() {
  return (
    <Link
      to="/login"
      className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-on-primary transition-colors hover:bg-primary-hover"
    >
      로그인으로 돌아가기
    </Link>
  )
}

function toOAuthExchangeMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 409) {
    return '같은 이메일로 이미 가입된 계정이 있습니다. 이메일·비밀번호로 로그인해 주세요.'
  }
  return toAuthMessage(e)
}
