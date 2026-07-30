import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BackLink } from '@/components/ui/BackLink'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { NotConnected } from '@/components/ui/NotConnected'
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

const SIZE = [
  { value: 'SMALL', label: '소형견' },
  { value: 'MEDIUM', label: '중형견' },
  { value: 'LARGE', label: '대형견' },
]

export function PetNewPage() {
  const navigate = useNavigate()

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { nickname: '', breedName: '', bio: '', careNote: '' },
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
        // TODO: POST /pets 연동
        onSubmit={handleSubmit(() => navigate('/me'))}
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

        <Field label="품종" error={formState.errors.breedName?.message}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              placeholder="예: 푸들"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={inputClass(invalid)}
              {...register('breedName')}
            />
          )}
        </Field>

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

        <Field label="크기">
          {({ id }) => (
            <select id={id} className={inputClass(false)} {...register('sizeCode')}>
              <option value="">선택 안 함</option>
              {SIZE.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="몸무게" hint="kg">
          {({ id }) => (
            <input
              id={id}
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              inputMode="decimal"
              className={inputClass(false)}
              {...register('weightKg')}
            />
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

        <NotConnected
          endpoint="POST /pets"
          note="한 사용자당 미삭제 펫은 최대 5마리입니다. 첫 펫은 자동으로 대표 강아지가 됩니다."
        />

        <div className="flex gap-3">
          <Button type="submit">등록</Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            취소
          </Button>
        </div>
      </form>
    </div>
  )
}
