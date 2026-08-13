import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SealCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { createPet, issuePetVerification, type PetWriteBody } from '@/features/pet/api'
import { BreedSizeField } from '@/features/pet/components/BreedSizeField'
import { PetVerificationLookupForm } from '@/features/pet/components/PetVerificationLookupForm'
import { toVerificationError } from '@/features/pet/verificationErrors'
import type {
  PetSex,
  PetSize,
  PetVerificationIssueResult,
  PetVerificationLookupFields,
} from '@/features/pet/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

// 제약은 OpenAPI PetCreateRequest 를 그대로 옮긴 것이다.
const schema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, '이름을 입력해 주세요.')
    .max(30, '이름은 30자 이내로 입력해 주세요.'),
  breedName: z.string().trim().max(100).optional(),
  sex: z.string().optional(),
  neutered: z.string().optional(),
  birthDate: z.string().optional(),
  weightKg: z.string().optional(),
  sizeCode: z.string().optional(),
  bio: z.string().trim().max(500, '소개는 500자 이내로 입력해 주세요.').optional(),
  careNote: z
    .string()
    .trim()
    .max(500, '특별 관리 사항은 500자 이내로 입력해 주세요.')
    .optional(),
})

type FormValues = z.input<typeof schema>

const SEX = [
  { value: 'MALE', label: '수컷' },
  { value: 'FEMALE', label: '암컷' },
  { value: 'UNKNOWN', label: '모름' },
]

/**
 * 등록 화면의 세 가지 모드.
 * - plain: 지금까지처럼 직접 입력.
 * - lookup: 동물등록번호 조회 폼(PET_CREATE flowType, petId 없음 — 아직 펫이 없다).
 * - verified: 조회 성공, 등록 폼에 결과를 채워 보여준다. 생일은 잠근다(PetEditPage
 *   와 같은 이유 — 인증된 값을 사용자가 뒤에서 바꿔치기하지 못하게).
 */
type Mode = 'plain' | 'lookup' | 'verified'

export function PetNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('plain')
  const [issued, setIssued] = useState<PetVerificationIssueResult | null>(null)

  const { register, handleSubmit, formState, watch, setValue, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { nickname: '', breedName: '', bio: '', careNote: '' },
  })

  const issue = useMutation({
    mutationFn: (fields: PetVerificationLookupFields) =>
      issuePetVerification({ flowType: 'PET_CREATE', ...fields }),
    onSuccess: (result) => {
      setIssued(result)
      setMode('verified')
      reset({
        nickname: result.petPrefill.nickname ?? '',
        breedName: result.petPrefill.breedName ?? '',
        sex: result.petPrefill.sex ?? '',
        neutered: result.petPrefill.neutered === null ? '' : String(result.petPrefill.neutered),
        birthDate: result.petPrefill.birthDate ?? '',
        bio: '',
        careNote: '',
      })
    },
  })

  const create = useMutation({
    mutationFn: createPet,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['pets', 'me'] }),
      ])
      navigate('/me', { replace: true })
    },
  })

  const onSubmit = handleSubmit((values) => {
    create.mutate({
      ...toCreateBody(values),
      ...(mode === 'verified' && issued
        ? { petVerificationToken: issued.verificationToken }
        : {}),
    })
  })

  const cancelVerification = () => {
    setMode('plain')
    setIssued(null)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">강아지 등록</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        이름만 필수입니다. 나머지는 나중에 채워도 됩니다.
      </p>

      {mode === 'plain' && (
        <button
          type="button"
          onClick={() => setMode('lookup')}
          className="mt-4 flex w-full items-center gap-2 rounded-xl border border-dashed border-border p-4 text-left transition-colors hover:bg-primary-subtle"
        >
          <SealCheck size={20} weight="bold" className="shrink-0 text-primary-strong" />
          <span className="text-[14px]">
            <span className="font-semibold text-primary-strong">동물등록번호로 인증하며 등록</span>
            <span className="text-muted-foreground"> — 조회된 정보를 미리 채워 드려요</span>
          </span>
        </button>
      )}

      {mode === 'lookup' && (
        <div className="mt-6">
          <PetVerificationLookupForm
            submitLabel="조회"
            submitting={issue.isPending}
            error={issue.isError ? toVerificationError(issue.error) : null}
            onSubmit={(fields) => issue.mutate(fields)}
          />
          <button
            type="button"
            onClick={cancelVerification}
            className="mt-3 min-h-11 font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            취소하고 직접 입력
          </button>
        </div>
      )}

      {mode === 'verified' && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary bg-primary-subtle p-4">
          <SealCheck size={20} weight="fill" className="mt-0.5 shrink-0 text-primary-strong" />
          <div className="text-[14px]">
            <p className="font-semibold text-primary-strong">동물등록 정보로 확인되었습니다</p>
            <p className="mt-0.5 text-muted-foreground">
              아래 내용을 확인하고 필요하면 고친 뒤 등록해 주세요. 생일은 인증된 값이라 여기서
              바꿀 수 없습니다.
            </p>
            <button
              type="button"
              onClick={cancelVerification}
              className="mt-1 font-medium underline-offset-2 hover:underline"
            >
              인증 취소하고 직접 입력
            </button>
          </div>
        </div>
      )}

      {mode !== 'lookup' && (
        <form className="mt-6 flex flex-col gap-6" noValidate onSubmit={onSubmit}>
          <Field label="이름" error={formState.errors.nickname?.message}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="text"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={inputClass(invalid)}
                {...register('nickname')}
              />
            )}
          </Field>

          <BreedSizeField
            breedName={watch('breedName') ?? ''}
            weightKg={watch('weightKg') ?? ''}
            sizeCode={watch('sizeCode') ?? ''}
            onBreedNameChange={(v) => setValue('breedName', v, { shouldValidate: true })}
            onWeightKgChange={(v) => setValue('weightKg', v)}
            onSizeCodeChange={(v) => setValue('sizeCode', v)}
            breedError={formState.errors.breedName?.message}
          />

          {mode === 'verified' ? (
            <Field label="생일" hint="인증된 정보라 수정할 수 없습니다.">
              {({ id }) => (
                <p
                  id={id}
                  className="min-h-11 rounded-lg border border-border bg-muted px-4 py-2.5 text-muted-foreground"
                >
                  {watch('birthDate') || '확인 안 됨'}
                </p>
              )}
            </Field>
          ) : (
            <Field label="생일">
              {({ id }) => (
                <input
                  id={id}
                  type="date"
                  className={inputClass(false)}
                  {...register('birthDate')}
                />
              )}
            </Field>
          )}

          <Field label="성별">
            {({ id }) => (
              <select id={id} className={inputClass(false)} {...register('sex')}>
                <option value="">선택 안 함</option>
                {SEX.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="중성화">
            {({ id }) => (
              <select id={id} className={inputClass(false)} {...register('neutered')}>
                <option value="">선택 안 함</option>
                <option value="true">완료</option>
                <option value="false">안 함</option>
              </select>
            )}
          </Field>

          <Field label="소개" error={formState.errors.bio?.message}>
            {({ id, describedBy, invalid }) => (
              <textarea
                id={id}
                rows={3}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={cn(inputClass(invalid), 'resize-y py-3')}
                {...register('bio')}
              />
            )}
          </Field>

          <Field
            label="특별 관리 사항"
            hint="알레르기, 복용 중인 약, 주의할 점 등"
            error={formState.errors.careNote?.message}
          >
            {({ id, describedBy, invalid }) => (
              <textarea
                id={id}
                rows={3}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={cn(inputClass(invalid), 'resize-y py-3')}
                {...register('careNote')}
              />
            )}
          </Field>

          <p className="text-[13px] text-muted-foreground">
            한 사용자당 최대 5마리까지 등록할 수 있습니다. 첫 강아지는 자동으로
            대표 강아지가 됩니다.
          </p>

          {create.isError && (
            <p role="alert" className="text-[14px] text-destructive">
              {toCreateError(create.error)}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? '등록 중…' : '등록'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={create.isPending}
            >
              취소
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function toCreateBody(values: FormValues): PetWriteBody & { nickname: string } {
  const optionalText = (value: string | undefined) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
  }

  return {
    nickname: values.nickname.trim(),
    breedName: optionalText(values.breedName),
    sex: (values.sex || null) as PetSex,
    neutered:
      values.neutered === '' || values.neutered === undefined
        ? null
        : values.neutered === 'true',
    birthDate: values.birthDate || null,
    weightKg: values.weightKg ? Number(values.weightKg) : null,
    sizeCode: (values.sizeCode || null) as PetSize,
    bio: optionalText(values.bio),
    personalityTags: [],
    careNote: optionalText(values.careNote),
  }
}

function toCreateError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '강아지를 등록하지 못했습니다. 네트워크 연결을 확인해 주세요.'
  }
  if (error.code === 'PET_LIMIT_EXCEEDED') {
    return '강아지는 최대 5마리까지 등록할 수 있습니다.'
  }
  if (error.code === 'VALIDATION_FAILED') {
    return error.message || '입력한 정보를 다시 확인해 주세요.'
  }
  return error.message || '강아지를 등록하지 못했습니다.'
}
