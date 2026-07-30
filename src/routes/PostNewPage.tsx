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

const CATEGORIES = ['자유', '약국', '병원', '고민', '카페', '호텔'] as const

// 길이 제한은 백엔드 계약이 나오면 맞춰야 한다. 지금은 보수적으로 잡아둔다.
const schema = z.object({
  category: z
    .string()
    .refine((v) => (CATEGORIES as readonly string[]).includes(v), {
      message: '분류를 선택해 주세요.',
    }),
  title: z
    .string()
    .trim()
    .min(2, '제목을 2자 이상 입력해 주세요.')
    .max(100, '제목은 100자 이내로 입력해 주세요.'),
  body: z
    .string()
    .trim()
    .min(1, '내용을 입력해 주세요.')
    .max(5000, '내용은 5000자 이내로 입력해 주세요.'),
})

type FormValues = z.input<typeof schema>

export function PostNewPage() {
  const navigate = useNavigate()

  const { register, handleSubmit, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { category: '자유', title: '', body: '' },
  })

  const category = watch('category')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/board" label="게시판" />
      <h1 className="mt-4 text-2xl font-bold">글쓰기</h1>

      <form
        className="mt-6 flex flex-col gap-6"
        noValidate
        // TODO: POST /posts 연동. 지금은 저장 없이 목록으로만 돌아간다.
        onSubmit={handleSubmit(() => navigate('/board'))}
      >
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 font-medium">분류</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label
                key={c}
                className={cn(
                  'min-h-11 cursor-pointer rounded-full border px-4 py-2.5 font-medium transition-colors',
                  category === c
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
                )}
              >
                <input
                  type="radio"
                  value={c}
                  className="sr-only"
                  {...register('category')}
                />
                {c}
              </label>
            ))}
          </div>
          {formState.errors.category && (
            <p role="alert" className="text-[13px] text-destructive">
              {formState.errors.category.message}
            </p>
          )}
        </fieldset>

        <Field label="제목" error={formState.errors.title?.message}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={inputClass(invalid)}
              {...register('title')}
            />
          )}
        </Field>

        <Field label="내용" error={formState.errors.body?.message}>
          {({ id, describedBy, invalid }) => (
            <textarea
              id={id}
              rows={12}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={cn(inputClass(invalid), 'resize-y py-3 leading-relaxed')}
              {...register('body')}
            />
          )}
        </Field>

        <NotConnected
          endpoint="POST /posts"
          note="지금은 저장되지 않고 목록으로만 돌아갑니다. 제목·내용 길이 제한은 계약 확정 후 맞춰야 합니다."
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
