import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SealCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { applyPetVerification, issuePetVerification } from '@/features/pet/api'
import { PetVerificationLookupForm } from '@/features/pet/components/PetVerificationLookupForm'
import { toVerificationError } from '@/features/pet/verificationErrors'
import {
  SEX_LABEL,
  type PetVerificationIssueResult,
  type PetVerificationLookupFields,
} from '@/features/pet/types'

/**
 * 펫 인증(이미 등록된 펫에 적용하는 경로).
 *
 * 2단계: 1) POST /pet-verifications 로 조회 + 1회용 토큰 발급,
 * 2) POST /pets/{petId}/verification 으로 그 토큰을 이 펫에 적용.
 * 1단계가 성공해도 2단계(적용)를 밟지 않으면 펫에 반영되지 않는다.
 * 적용은 verified 플래그만 세우며, 조회된 정보를 펫 필드에 자동으로 쓰지 않는다.
 *
 * 신규 펫 등록과 동시에 인증하는 경로는 PetNewPage.tsx 에 있다.
 */
export function PetVerifyPage() {
  const { petId = '' } = useParams()
  const petIdNum = Number(petId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [issued, setIssued] = useState<PetVerificationIssueResult | null>(null)

  const issue = useMutation({
    mutationFn: (fields: PetVerificationLookupFields) =>
      issuePetVerification({ flowType: 'EXISTING_PET_VERIFY', petId: petIdNum, ...fields }),
    onSuccess: (result) => setIssued(result),
  })

  const apply = useMutation({
    mutationFn: () => applyPetVerification(petIdNum, issued!.verificationToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pet', petId] }),
        queryClient.invalidateQueries({ queryKey: ['pets', 'me'] }),
      ])
      navigate(`/me/pets/${petId}`, { replace: true })
    },
  })

  if (!Number.isFinite(petIdNum)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <BackLink to="/me" label="마이 페이지" />
        <p className="mt-6 text-destructive">잘못된 펫입니다.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to={`/me/pets/${petId}`} label="펫 정보" />

      <div className="mt-4 flex items-center gap-2">
        <SealCheck size={26} weight="fill" className="text-primary-strong" aria-hidden />
        <h1 className="text-2xl font-bold">펫 인증</h1>
      </div>
      <p className="mt-1 text-[14px] text-muted-foreground">
        동물등록 정보로 인증하면 프로필에 인증 배지가 표시됩니다.
      </p>

      {issued ? (
        <ConfirmStep
          prefill={issued.petPrefill}
          onApply={() => apply.mutate()}
          applying={apply.isPending}
          error={apply.isError ? toVerificationError(apply.error) : null}
          onRetry={() => setIssued(null)}
        />
      ) : (
        <div className="mt-6">
          <PetVerificationLookupForm
            submitting={issue.isPending}
            error={issue.isError ? toVerificationError(issue.error) : null}
            onSubmit={(fields) => issue.mutate(fields)}
          />
        </div>
      )}
    </div>
  )
}

function ConfirmStep({
  prefill,
  onApply,
  applying,
  error,
  onRetry,
}: {
  prefill: PetVerificationIssueResult['petPrefill']
  onApply: () => void
  applying: boolean
  error: string | null
  onRetry: () => void
}) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 font-semibold">이 정보로 확인되었습니다</p>
        <dl className="flex flex-col gap-2 text-[14px]">
          <PrefillRow term="품종" value={prefill.breedName} />
          <PrefillRow term="생일" value={prefill.birthDate} />
          <PrefillRow
            term="성별"
            value={prefill.sex && prefill.sex !== 'UNKNOWN' ? SEX_LABEL[prefill.sex] : null}
          />
          <PrefillRow
            term="중성화"
            value={prefill.neutered === null ? null : prefill.neutered ? '완료' : '안 함'}
          />
        </dl>
        <p className="mt-3 text-[13px] text-muted-foreground">
          실제 프로필 정보와 다르면 적용 후 펫 수정 화면에서 직접 고칠 수 있습니다.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" onClick={onApply} disabled={applying}>
          {applying ? '적용 중…' : '적용하기'}
        </Button>
        <Button type="button" variant="secondary" onClick={onRetry} disabled={applying}>
          다시 조회
        </Button>
      </div>
    </div>
  )
}

function PrefillRow({ term, value }: { term: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd className={value ? 'min-w-0 truncate' : 'text-muted-foreground'}>
        {value ?? '확인 안 됨'}
      </dd>
    </div>
  )
}
