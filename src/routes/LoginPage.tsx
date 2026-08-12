import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/features/auth/auth-context'
import { toAuthMessage } from '@/features/auth/error-message'

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
    <AuthLayout title="로그인" subtitle="Dogether에 오신 걸 환영합니다">
      {passwordResetDone && (
        <p className="mb-5 rounded-lg border border-border bg-primary-subtle px-4 py-3 text-[14px] text-primary-strong">
          비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="이메일" error={formState.errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={inputClass(invalid)}
              {...register('email')}
            />
          )}
        </Field>

        <Field label="비밀번호" error={formState.errors.password?.message}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="password"
              autoComplete="current-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={inputClass(invalid)}
              {...register('password')}
            />
          )}
        </Field>

        <Link
          to="/reset-password"
          className="self-end text-[13px] font-semibold text-primary-strong"
        >
          비밀번호를 잊으셨나요?
        </Link>

        {submitError && (
          <p role="alert" className="text-[14px] text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? '로그인 중…' : '로그인'}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="font-semibold text-primary-strong">
          회원가입
        </Link>
      </p>
    </AuthLayout>
  )
}
