import { useState } from 'react'
import { SealCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { NotConnected } from '@/components/ui/NotConnected'
import { cn } from '@/lib/cn'

const ID_TYPES = [
  { value: 'REGISTRATION_NUMBER', label: '동물등록번호' },
  { value: 'RFID', label: 'RFID 번호' },
] as const

/**
 * 펫 인증.
 *
 * 동물등록 정보로 실제 소유를 확인한다. 개인정보(소유자 성명·생년월일)를
 * 받으므로 동의 절차가 선행되어야 하며, 시도 횟수에 제한이 있다.
 */
export function PetVerifyPage() {
  const [idType, setIdType] = useState<string>('REGISTRATION_NUMBER')
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />

      <div className="mt-4 flex items-center gap-2">
        <SealCheck size={26} weight="fill" className="text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">펫 인증</h1>
      </div>
      <p className="mt-1 text-[14px] text-muted-foreground">
        동물등록 정보로 인증하면 프로필에 인증 배지가 표시됩니다.
      </p>

      <form className="mt-6 flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
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
                  onChange={(e) => setIdType(e.target.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label={idType === 'RFID' ? 'RFID 번호' : '동물등록번호'}>
          {({ id }) => (
            <input id={id} type="text" inputMode="numeric" className={inputClass(false)} />
          )}
        </Field>

        <Field label="소유자 성명">
          {({ id }) => <input id={id} type="text" className={inputClass(false)} />}
        </Field>

        <Field label="소유자 생년월일">
          {({ id }) => <input id={id} type="date" className={inputClass(false)} />}
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

        {/*
          인증은 2단계다.
          1) POST /pet-registration/attempts        조회·검증 시도 생성
          2) POST /.../attempts/{attemptId}/consume 조회 결과를 특정 Pet 에 적용
          1단계가 성공해도 2단계를 밟지 않으면 펫에 반영되지 않는다.
        */}
        <ol className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-[14px]">
          <li className="flex gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[13px] font-bold text-on-primary">
              1
            </span>
            <span>동물등록 정보를 조회합니다.</span>
          </li>
          <li className="flex gap-2 text-muted-foreground">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[13px] font-bold">
              2
            </span>
            <span>조회된 정보를 어떤 강아지에 적용할지 선택합니다.</span>
          </li>
        </ol>

        <NotConnected
          endpoint="POST /pet-registration/attempts · POST /pet-registration/attempts/{attemptId}/consume"
          note="2단계 API 입니다. 1단계 조회가 성공해도 2단계(consume)를 호출해야 펫에 반영됩니다. 시도 횟수에 일일 제한이 있습니다(429)."
        />

        <Button type="submit" disabled={!agreed}>
          다음
        </Button>
      </form>
    </div>
  )
}
