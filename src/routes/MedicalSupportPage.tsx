import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CaretRight, FirstAidKit, WarningCircle, ArrowClockwise } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { ApiError } from '@/lib/api'
import { listMedicalSupportPrograms } from '@/features/medicalSupport/api'
import { PROGRAM_STATUS_LABEL } from '@/features/medicalSupport/types'

/** 내 동네 기준으로 검증된 반려동물 의료비 지원사업 목록. */
export function MedicalSupportPage() {
  const programs = useQuery({
    queryKey: ['medical-support', 'programs'],
    queryFn: listMedicalSupportPrograms,
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">반려동물 의료비 지원사업</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        내 동네를 기준으로 검증된 지원사업만 보여줍니다.
      </p>

      <div className="mt-6">
        {programs.isPending && (
          <p className="text-muted-foreground">불러오는 중…</p>
        )}

        {programs.isError && (
          <FeatureNotice
            endpoint="GET /medical-support/programs"
            error={programs.error}
            onRetry={() => void programs.refetch()}
          />
        )}

        {programs.isSuccess && programs.data.length === 0 && (
          <EmptyState
            title="해당 지역에 등록된 지원사업이 없습니다"
            description="검증이 완료되는 대로 이곳에 표시됩니다."
          />
        )}

        {programs.isSuccess && programs.data.length > 0 && (
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {programs.data.map((p, i) => (
              <li key={p.programId} className={i > 0 ? 'border-t border-border' : ''}>
                <Link
                  to={`/me/medical-support/${p.programId}`}
                  className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-primary-subtle"
                >
                  <div
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary-strong"
                  >
                    <FirstAidKit size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.programName}</p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {p.region} · {PROGRAM_STATUS_LABEL[p.status]}
                    </p>
                  </div>
                  <CaretRight size={18} className="shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * 아직 배포 전인 API 를 구분해 알린다(BE PR #160 미병합).
 * 404 는 엔드포인트 자체가 아직 없다는 뜻이라 재시도해도 소용없다.
 */
export function FeatureNotice({
  endpoint,
  error,
  onRetry,
}: {
  endpoint: string
  error: unknown
  onRetry: () => void
}) {
  const notImplemented = error instanceof ApiError && error.status === 404

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <WarningCircle
        size={22}
        weight="fill"
        className="mt-0.5 shrink-0 text-destructive"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {notImplemented
            ? '아직 준비되지 않은 기능입니다'
            : '정보를 불러오지 못했습니다'}
        </p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {notImplemented
            ? `백엔드에 ${endpoint} 가 아직 배포되지 않았습니다.`
            : '잠시 후 다시 시도해 주세요.'}
        </p>
        {!notImplemented && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary-strong"
          >
            <ArrowClockwise size={18} />
            다시 시도
          </button>
        )}
      </div>
    </div>
  )
}
