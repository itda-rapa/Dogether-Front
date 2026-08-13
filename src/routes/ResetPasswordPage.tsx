import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowClockwise, CheckCircle, PencilSimple } from '@phosphor-icons/react'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/features/auth/auth-context'
import { toAuthMessage, isEmailVerificationExpired } from '@/features/auth/error-message'
import {
  confirmEmailVerification,
  requestEmailVerification,
  resetPassword,
} from '@/features/auth/api'
import type {
  EmailVerificationChallenge,
  EmailVerificationConfirmed,
} from '@/features/auth/types'
import { useCountdown } from '@/features/auth/useCountdown'

const emailSchema = z.object({
  email: z.email('이메일 형식이 올바르지 않습니다.').max(254),
})

const codeSchema = z.object({
  code: z.string().regex(/^[0-9]{6}$/, '6자리 숫자를 입력해 주세요.'),
})

// 제약은 SignupRequest.password 와 동일하게 맞춘다. 임의로 완화하지 않는다.
const passwordSchema = z
  .object({
    password: z
      .string()
      .min(10, '비밀번호는 10자 이상이어야 합니다.')
      .max(128, '비밀번호는 128자 이하여야 합니다.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })

type EmailValues = z.input<typeof emailSchema>
type CodeValues = z.input<typeof codeSchema>
type PasswordValues = z.input<typeof passwordSchema>

type Step = 'email' | 'code' | 'password'

export function ResetPasswordPage() {
  const { hasSession, loading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [challenge, setChallenge] = useState<EmailVerificationChallenge | null>(null)
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null)
  const [verification, setVerification] = useState<EmailVerificationConfirmed | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  })

  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    mode: 'onTouched',
    defaultValues: { code: '' },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  })

  const codeExpiresIn = useCountdown(challenge?.expiresAt ?? null)
  const resendIn = useCountdown(resendAvailableAt)

  const startChallenge = async (targetEmail: string) => {
    const result = await requestEmailVerification({
      email: targetEmail,
      purpose: 'PASSWORD_RESET',
    })
    setChallenge(result)
    setResendAvailableAt(new Date(Date.now() + result.resendAfterSeconds * 1000).toISOString())
  }

  const backToEmail = (opts?: { keepError?: boolean }) => {
    setChallenge(null)
    setVerification(null)
    setResendAvailableAt(null)
    if (!opts?.keepError) setSubmitError(null)
    codeForm.reset({ code: '' })
    setStep('email')
  }

  const onSubmitEmail = emailForm.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await startChallenge(values.email)
      setEmail(values.email)
      setStep('code')
    } catch (e) {
      setSubmitError(toAuthMessage(e))
    }
  })

  const onResend = async () => {
    setSubmitError(null)
    try {
      await startChallenge(email)
    } catch (e) {
      setSubmitError(toAuthMessage(e))
    }
  }

  const onSubmitCode = codeForm.handleSubmit(async (values) => {
    if (!challenge) return
    setSubmitError(null)
    try {
      const result = await confirmEmailVerification({
        challengeId: challenge.challengeId,
        code: values.code,
      })
      setVerification(result)
      setStep('password')
    } catch (e) {
      setSubmitError(toAuthMessage(e))
      if (isEmailVerificationExpired(e)) backToEmail({ keepError: true })
    }
  })

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    if (!verification) return
    setSubmitError(null)
    try {
      await resetPassword({
        email,
        verificationToken: verification.verificationToken,
        newPassword: values.password,
      })
      navigate('/login', { replace: true, state: { passwordResetDone: true } })
    } catch (e) {
      setSubmitError(toAuthMessage(e))
      if (isEmailVerificationExpired(e)) backToEmail({ keepError: true })
    }
  })

  if (!loading && hasSession) return <Navigate to="/" replace />

  return (
    <AuthLayout title="비밀번호 재설정" subtitle="이메일을 인증하고 새 비밀번호를 설정하세요">
      {step === 'email' && (
        <form onSubmit={onSubmitEmail} className="flex flex-col gap-5" noValidate>
          <Field label="이메일" error={emailForm.formState.errors.email?.message}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="email"
                autoComplete="email"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={inputClass(invalid)}
                {...emailForm.register('email')}
              />
            )}
          </Field>

          {submitError && (
            <p role="alert" className="text-[14px] text-destructive">
              {submitError}
            </p>
          )}

          <Button type="submit" disabled={emailForm.formState.isSubmitting}>
            {emailForm.formState.isSubmitting ? '전송 중…' : '인증코드 받기'}
          </Button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={onSubmitCode} className="flex flex-col gap-5" noValidate>
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
            <span className="truncate text-[14px]">{email}</span>
            <button
              type="button"
              onClick={() => backToEmail()}
              className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary-strong"
            >
              <PencilSimple size={14} />
              변경
            </button>
          </div>

          <Field
            label="인증코드"
            hint={
              codeExpiresIn > 0
                ? `남은 시간 ${formatMMSS(codeExpiresIn)}`
                : '인증코드가 만료되었습니다. 다시 받아주세요.'
            }
            error={codeForm.formState.errors.code?.message}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={inputClass(invalid)}
                {...codeForm.register('code')}
              />
            )}
          </Field>

          <button
            type="button"
            onClick={() => void onResend()}
            disabled={resendIn > 0}
            className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-primary-strong disabled:pointer-events-none disabled:opacity-50"
          >
            <ArrowClockwise size={18} />
            {resendIn > 0 ? `인증코드 재전송 (${resendIn}초)` : '인증코드 재전송'}
          </button>

          {submitError && (
            <p role="alert" className="text-[14px] text-destructive">
              {submitError}
            </p>
          )}

          <Button type="submit" disabled={codeForm.formState.isSubmitting || codeExpiresIn <= 0}>
            {codeForm.formState.isSubmitting ? '확인 중…' : '확인'}
          </Button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={onSubmitPassword} className="flex flex-col gap-5" noValidate>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-[14px]">
            <CheckCircle size={18} weight="fill" className="shrink-0 text-primary-strong" />
            <span className="truncate">{email}</span>
            <span className="ml-auto shrink-0 font-medium text-primary-strong">인증됨</span>
          </div>

          <Field
            label="새 비밀번호"
            hint="10자 이상"
            error={passwordForm.formState.errors.password?.message}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={inputClass(invalid)}
                {...passwordForm.register('password')}
              />
            )}
          </Field>

          <Field
            label="새 비밀번호 확인"
            error={passwordForm.formState.errors.confirmPassword?.message}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={inputClass(invalid)}
                {...passwordForm.register('confirmPassword')}
              />
            )}
          </Field>

          {submitError && (
            <p role="alert" className="text-[14px] text-destructive">
              {submitError}
            </p>
          )}

          <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
            {passwordForm.formState.isSubmitting ? '변경 중…' : '비밀번호 변경'}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-[14px] text-muted-foreground">
        <Link to="/login" className="font-semibold text-primary-strong">
          로그인으로 돌아가기
        </Link>
      </p>
    </AuthLayout>
  )
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
