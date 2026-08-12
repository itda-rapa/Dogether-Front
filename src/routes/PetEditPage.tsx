import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BackLink } from '@/components/ui/BackLink'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { getPet, updatePet, type PetWriteBody } from '@/features/pet/api'
import { BreedSizeField } from '@/features/pet/components/BreedSizeField'
import { ageFrom, type Pet, type PetSex, type PetSize } from '@/features/pet/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

// 생일은 여기 없다 — 펫 인증(동물등록 조회)이 채운 값을 사용자가 뒤에서 바꿀 수
// 없게, 편집 화면 자체에 입력 필드를 두지 않는다. 읽기 전용으로만 보여준다.
const schema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, '이름을 입력해 주세요.')
    .max(30, '이름은 30자 이내로 입력해 주세요.'),
  breedName: z.string().trim().max(100).optional(),
  sex: z.string().optional(),
  neutered: z.string().optional(),
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

export function PetEditPage() {
  const { petId = '' } = useParams()
  const petIdNum = Number(petId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const pet = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(petIdNum),
    enabled: Number.isFinite(petIdNum),
    retry: false,
  })

  const { register, handleSubmit, formState, watch, setValue, reset } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      mode: 'onTouched',
      defaultValues: { nickname: '', breedName: '', bio: '', careNote: '' },
    })

  useEffect(() => {
    if (pet.data) reset(toFormValues(pet.data))
  }, [pet.data, reset])

  const update = useMutation({
    mutationFn: (body: PetWriteBody) => updatePet(petIdNum, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pet', petId] }),
        queryClient.invalidateQueries({ queryKey: ['pets', 'me'] }),
      ])
      navigate(`/me/pets/${petId}`, { replace: true })
    },
  })

  const onSubmit = handleSubmit((values) => {
    update.mutate(toWriteBody(values))
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to={`/me/pets/${petId}`} label="펫 정보" />
      <h1 className="mt-4 text-2xl font-bold">강아지 정보 수정</h1>

      {pet.isPending && <p className="mt-6 text-muted-foreground">불러오는 중…</p>}

      {pet.isError && (
        <p role="alert" className="mt-6 text-destructive">
          펫 정보를 불러오지 못했습니다.
        </p>
      )}

      {pet.data && (
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

          {/* 생일은 인증 정보와 엮여 있어 수정할 수 없다. 읽기 전용으로만 보여준다. */}
          <Field label="생일" hint="펫 인증에 쓰이는 정보라 수정할 수 없습니다.">
            {({ id }) => (
              <p id={id} className="min-h-11 rounded-lg border border-border bg-muted px-4 py-2.5 text-muted-foreground">
                {pet.data.birthDate ?? '미입력'}
                {pet.data.birthDate && ` · ${ageFrom(pet.data.birthDate)}살`}
              </p>
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

          {update.isError && (
            <p role="alert" className="text-[14px] text-destructive">
              {toUpdateError(update.error)}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? '저장 중…' : '저장'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={update.isPending}
            >
              취소
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function toFormValues(pet: Pet): FormValues {
  return {
    nickname: pet.nickname,
    breedName: pet.breedName ?? '',
    sex: pet.sex ?? '',
    neutered: pet.neutered === null ? '' : String(pet.neutered),
    weightKg: pet.weightKg != null ? String(pet.weightKg) : '',
    sizeCode: pet.sizeCode ?? '',
    bio: pet.bio ?? '',
    careNote: pet.careNote ?? '',
  }
}

function toWriteBody(values: FormValues): PetWriteBody {
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
    weightKg: values.weightKg ? Number(values.weightKg) : null,
    sizeCode: (values.sizeCode || null) as PetSize,
    bio: optionalText(values.bio),
    careNote: optionalText(values.careNote),
  }
}

function toUpdateError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return '저장하지 못했습니다. 네트워크 연결을 확인해 주세요.'
  }
  if (error.code === 'VALIDATION_FAILED') {
    return '입력한 정보를 다시 확인해 주세요.'
  }
  return error.message || '저장하지 못했습니다.'
}
