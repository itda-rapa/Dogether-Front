import { useState } from 'react'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import type {
  PetVerificationIdentifierType,
  PetVerificationLookupFields,
} from '@/features/pet/types'
import { cn } from '@/lib/cn'

const ID_TYPES: { value: PetVerificationIdentifierType; label: string }[] = [
  { value: 'REGISTRATION_NUMBER', label: '동물등록번호' },
  { value: 'RFID', label: 'RFID 번호' },
]

/**
 * 동물등록 정보 조회 1단계 폼. 기존 펫 인증(PetVerifyPage)과 강아지 등록 시
 * 인증(PetNewPage) 양쪽에서 같은 입력을 받으므로 여기 하나로 뺐다.
 * `flowType`·`petId` 는 호출부가 결정해 `onSubmit` 결과에 덧붙인다.
 */
export function PetVerificationLookupForm({
  onSubmit,
  submitting,
  error,
  submitLabel = '다음',
}: {
  onSubmit: (fields: PetVerificationLookupFields) => void
  submitting: boolean
  error: string | null
  submitLabel?: string
}) {
  const [idType, setIdType] = useState<PetVerificationIdentifierType>(
    'REGISTRATION_NUMBER',
  )
  const [identifier, setIdentifier] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerBirthDate, setOwnerBirthDate] = useState('')
  const [agreed, setAgreed] = useState(false)

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          identifierType: idType,
          identifier: identifier.trim(),
          ownerName: ownerName.trim() || undefined,
          ownerBirthDate: ownerBirthDate || undefined,
        })
      }}
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-medium">인증 수단</legend>
        <div className="flex gap-2">
          {ID_TYPES.map((t) => (
            <label
              key={t.value}
              className={cn(
                'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-3 font-medium transition-colors',
                idType === t.value
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
              )}
            >
              <input
                type="radio"
                name="identifierType"
                value={t.value}
                checked={idType === t.value}
                onChange={() => setIdType(t.value)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={idType === 'RFID' ? 'RFID 번호' : '동물등록번호'}>
        {({ id }) => (
          <input
            id={id}
            type="text"
            inputMode="numeric"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={inputClass(false)}
          />
        )}
      </Field>

      <Field label="소유자 성명" hint="선택 입력">
        {({ id }) => (
          <input
            id={id}
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={inputClass(false)}
          />
        )}
      </Field>

      <Field label="소유자 생년월일" hint="선택 입력">
        {({ id }) => (
          <input
            id={id}
            type="date"
            value={ownerBirthDate}
            onChange={(e) => setOwnerBirthDate(e.target.value)}
            className={inputClass(false)}
          />
        )}
      </Field>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[var(--dg-primary)]"
        />
        <span className="text-[14px]">
          동물등록 정보 조회를 위해 입력한 개인정보가 사용되는 것에 동의합니다.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!agreed || !identifier.trim() || submitting}>
        {submitting ? '조회 중…' : submitLabel}
      </Button>
    </form>
  )
}
