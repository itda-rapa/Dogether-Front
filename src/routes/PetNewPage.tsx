import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BackLink } from '@/components/ui/BackLink'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { createPet, type PetWriteBody } from '@/features/pet/api'
import { BreedSizeField } from '@/features/pet/components/BreedSizeField'
import type { PetSex, PetSize } from '@/features/pet/types'
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

export function PetNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { nickname: '', breedName: '', bio: '', careNote: '' },
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
    create.mutate(toCreateBody(values))
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">강아지 등록</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        이름만 필수입니다. 나머지는 나중에 채워도 됩니다.
      </p>

      <form
        className="mt-6 flex flex-col gap-6"
        noValidate
        onSubmit={onSubmit}
      >
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
    return '입력한 정보를 다시 확인해 주세요.'
  }
  return error.message || '강아지를 등록하지 못했습니다.'
}
