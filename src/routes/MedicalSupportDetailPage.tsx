import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '@/components/ui/BackLink'
import { getMedicalSupportProgram } from '@/features/medicalSupport/api'
import {
  HOSPITAL_POLICY_LABEL,
  PROGRAM_STATUS_LABEL,
  type MedicalSupportProgram,
} from '@/features/medicalSupport/types'
import { FeatureNotice } from '@/routes/MedicalSupportPage'

export function MedicalSupportDetailPage() {
  const { programId = '' } = useParams()

  const program = useQuery({
    queryKey: ['medical-support', 'programs', programId],
    queryFn: () => getMedicalSupportProgram(Number(programId)),
    enabled: programId !== '',
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me/medical-support" label="의료비 지원사업" />

      {program.isPending && (
        <p className="mt-4 text-muted-foreground">불러오는 중…</p>
      )}

      {program.isError && (
        <div className="mt-4">
          <FeatureNotice
            endpoint={`GET /medical-support/programs/${programId}`}
            error={program.error}
            onRetry={() => void program.refetch()}
          />
        </div>
      )}

      {program.data && <ProgramDetail program={program.data} />}
    </div>
  )
}

function ProgramDetail({ program: p }: { program: MedicalSupportProgram }) {
  return (
    <article className="mt-4">
      <h1 className="text-2xl font-bold leading-tight">{p.programName}</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        {p.region} · {p.programYear}년 · {PROGRAM_STATUS_LABEL[p.status]}
      </p>

      {p.summary && (
        <p className="mt-4 whitespace-pre-wrap leading-relaxed">{p.summary}</p>
      )}

      <dl className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-[14px]">
        <DetailRow term="지원 금액" desc={p.supportAmount} />
        <DetailRow term="신청 기간" desc={p.applicationPeriod} />
        <DetailRow term="지원 대상" desc={p.supportTarget} />
        <DetailRow term="지원 항목" desc={p.supportItems} />
        <DetailRow term="신청 방법" desc={p.applicationMethod} />
        <DetailRow term="동물등록 조건" desc={p.animalRegistrationCondition} />
        <DetailRow term="소득/복지 조건" desc={p.incomeWelfareCondition} />
        <DetailRow term="문의처" desc={p.contact} />
      </dl>

      <div className="mt-6">
        <h2 className="mb-2 font-bold">{HOSPITAL_POLICY_LABEL[p.hospitalPolicy]}</h2>
        {p.hospitalPolicy === 'DESIGNATED_LIST' && p.designatedHospitals.length > 0 && (
          <ul className="flex flex-col gap-2">
            {p.designatedHospitals.map((h, i) => (
              <li key={i} className="rounded-lg border border-border p-3 text-[14px]">
                <p className="font-medium">{h.name}</p>
                {h.address && <p className="text-muted-foreground">{h.address}</p>}
                {h.phone && <p className="text-muted-foreground">{h.phone}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-[13px] text-muted-foreground">
        <a
          href={p.officialSource}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          공식 원문 보기
        </a>
        {' · '}최종 검증 {new Date(p.lastVerifiedAt).toLocaleDateString('ko-KR')}
      </p>
    </article>
  )
}

function DetailRow({ term, desc }: { term: string; desc: string | null }) {
  if (!desc) return null
  return (
    <div>
      <dt className="font-medium text-muted-foreground">{term}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap">{desc}</dd>
    </div>
  )
}
