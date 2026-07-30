import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { ArrowClockwise } from '@phosphor-icons/react'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/features/auth/auth-context'
import { toAuthMessage } from '@/features/auth/error-message'
import { listNeighborhoods } from '@/features/auth/api'
import { formatNeighborhood } from '@/features/auth/types'

// 제약은 OpenAPI SignupRequest 를 그대로 옮긴 것이다. 임의로 완화하지 않는다.
const schema = z.object({
  email: z.email('이메일 형식이 올바르지 않습니다.').max(254),
  password: z
    .string()
    .min(10, '비밀번호는 10자 이상이어야 합니다.')
    .max(128, '비밀번호는 128자 이하여야 합니다.'),
  nickname: z
    .string()
    .trim()
    .min(2, '닉네임은 2자 이상이어야 합니다.')
    .max(20, '닉네임은 20자 이하여야 합니다.'),
  neighborhoodCode: z.string().min(1, '동네를 선택해 주세요.'),
})

type FormValues = z.input<typeof schema>

export function SignupPage() {
  const { signUp, hasSession, loading } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 동네 목록은 공개 API 라 로그인 전에 부를 수 있다.
  const neighborhoods = useQuery({
    queryKey: ['neighborhoods'],
    queryFn: listNeighborhoods,
    staleTime: 60 * 60 * 1000,
  })

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '', nickname: '', neighborhoodCode: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await signUp(values)
      navigate('/', { replace: true })
    } catch (e) {
      setSubmitError(toAuthMessage(e))
    }
  })

  if (!loading && hasSession) return <Navigate to="/" replace />

  return (
    <AuthLayout title="회원가입" subtitle="동네를 선택하고 시작하세요">
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

        <Field
          label="비밀번호"
          hint="10자 이상"
          error={formState.errors.password?.message}
        >
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="password"
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={inputClass(invalid)}
              {...register('password')}
            />
          )}
        </Field>

        <Field
          label="닉네임"
          hint="2~20자"
          error={formState.errors.nickname?.message}
        >
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

              {/* 실패했을 때 사용자가 스스로 벗어날 수 있는 길을 반드시 남긴다. */}
              {neighborhoods.isError && (
                <button
                  type="button"
                  onClick={() => void neighborhoods.refetch()}
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-primary"
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

        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? '가입 중…' : '가입하기'}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted-foreground">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-semibold text-primary">
          로그인
        </Link>
      </p>
    </AuthLayout>
  )
}
