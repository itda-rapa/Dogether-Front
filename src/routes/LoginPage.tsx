import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Envelope, Eye, EyeSlash, Lock } from '@phosphor-icons/react'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/features/auth/auth-context'
import { toAuthMessage } from '@/features/auth/error-message'
import { oauthStartUrl } from '@/features/auth/api'
import { cn } from '@/lib/cn'

const schema = z.object({
  email: z.email('이메일 형식이 올바르지 않습니다.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
})

type FormValues = z.input<typeof schema>

export function LoginPage() {
  const { signIn, hasSession, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
  const passwordResetDone = (location.state as { passwordResetDone?: boolean } | null)
    ?.passwordResetDone

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await signIn(values.email, values.password)
      navigate(from, { replace: true })
    } catch (e) {
      setSubmitError(toAuthMessage(e))
    }
  })

  if (!loading && hasSession) return <Navigate to="/" replace />

  return (
    <AuthLayout title="로그인" subtitle="Dogether에 오신 걸 환영합니다" hideTitle>
      {passwordResetDone && (
        <p className="mb-5 rounded-lg border border-border bg-primary-subtle px-4 py-3 text-[14px] text-primary-strong">
          비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="이메일" error={formState.errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <Envelope
                size={20}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-primary-strong"
              />
              <input
                id={id}
                type="email"
                autoComplete="email"
                placeholder="이메일을 입력해주세요"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={cn(inputClass(invalid), 'min-h-[52px] rounded-2xl pl-11')}
                {...register('email')}
              />
            </div>
          )}
        </Field>

        <Field label="비밀번호" error={formState.errors.password?.message}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <Lock
                size={20}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-primary-strong"
              />
              <input
                id={id}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="비밀번호를 입력해주세요"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={cn(inputClass(invalid), 'min-h-[52px] rounded-2xl pl-11 pr-11')}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}
        </Field>

        {submitError && (
          <p role="alert" className="text-[14px] text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={formState.isSubmitting} className="rounded-2xl">
          {formState.isSubmitting ? '로그인 중…' : '로그인'}
        </Button>

        <Link
          to="/reset-password"
          className="self-center text-[13px] font-semibold text-primary-strong underline"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </form>

      <div className="mt-6 flex items-center gap-3 text-[13px] text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        또는
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <a
          href={oauthStartUrl('GOOGLE')}
          className="flex min-h-12 items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface font-semibold transition-colors hover:bg-primary-subtle"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            />
          </svg>
          Google로 계속하기
        </a>
        {/* 네이버 브랜드 가이드 고정 색상(#03C75A) — 디자인 토큰 대상이 아니다. */}
        <a
          href={oauthStartUrl('NAVER')}
          className="flex min-h-12 items-center justify-center gap-2.5 rounded-2xl bg-[#03C75A] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M13.5495 12.3223L8.6249 5H5V19H10.4505V11.6777L15.3751 19H19V5H13.5495V12.3223Z"
            />
          </svg>
          네이버로 계속하기
        </a>
      </div>

      <p className="mt-6 text-center text-[14px] text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="font-semibold text-primary-strong underline">
          회원가입
        </Link>
      </p>
    </AuthLayout>
  )
}
