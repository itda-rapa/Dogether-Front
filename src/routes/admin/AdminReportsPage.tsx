import { useState } from 'react'
import { Link, Navigate, Outlet, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CaretRight, ShieldCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/auth-context'
import { apiRequest } from '@/lib/api'
import { cn } from '@/lib/cn'
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_STATUS_LABEL,
  type Report,
  type ReportStatus,
} from '@/features/moderation/types'

/**
 * 관리자 전용 구역 가드.
 *
 * role 은 서버가 준 값을 그대로 믿는다. 클라이언트 가드는 화면을 감추는
 * 편의일 뿐이고 실제 권한 검사는 서버가 한다.
 */
export function RequireAdmin() {
  const { me, meStatus } = useAuth()

  if (meStatus === 'pending') {
    return (
      <div className="grid min-h-[50dvh] place-items-center text-muted-foreground">
        불러오는 중…
      </div>
    )
  }

  if (!me || (me.role !== 'ADMIN' && me.role !== 'SUPER_ADMIN')) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

type ReportListResult = {
  items: Report[]
  page: { page: number; size: number; totalElements: number; totalPages: number }
}

/*
  실측값 기준. 접수 직후는 OPEN 이고, 관리자 조치로 ACTIONED(경고) 또는
  NO_ACTION(반려)으로 종결된다. PENDING/RESOLVED/REJECTED 는 존재하지 않는다.
*/
const STATUSES = REPORT_STATUSES

export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus>('OPEN')

  const reports = useQuery({
    queryKey: ['admin', 'reports', status],
    queryFn: () => apiRequest<ReportListResult>(`/admin/reports?status=${status}`),
    retry: false,
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />

      <div className="mt-4 flex items-center gap-2">
        <ShieldCheck size={26} weight="fill" className="text-primary-strong" aria-hidden />
        <h1 className="text-2xl font-bold">신고 처리</h1>
      </div>

      <div role="tablist" aria-label="신고 상태" className="mt-6 flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              'min-h-11 flex-1 rounded-full border px-4 font-medium transition-colors',
              status === s
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
            )}
          >
            {REPORT_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {reports.isPending && (
        <p className="mt-6 text-muted-foreground">불러오는 중…</p>
      )}

      {reports.data?.items.length === 0 && (
        <div className="mt-6">
          <EmptyState title="해당 상태의 신고가 없습니다" />
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {reports.data?.items.map((r) => (
          <li key={r.reportId}>
            <Link
              to={`/admin/reports/${r.reportId}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {reasonLabel(r.reasonCode)}
                </p>
                <p className="truncate text-[14px] text-muted-foreground">
                  대화방 #{r.roomId}
                </p>
              </div>
              <CaretRight size={18} className="shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {reports.isError && (
        <div className="mt-6">
          <NotConnected endpoint="GET /admin/reports" />
        </div>
      )}
    </div>
  )
}

export function AdminReportDetailPage() {
  const { reportId = '' } = useParams()

  const report = useQuery({
    queryKey: ['admin', 'report', reportId],
    queryFn: () => apiRequest<Report>(`/admin/reports/${reportId}`),
    retry: false,
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/admin/reports" label="신고 처리" />
      <h1 className="mt-4 text-2xl font-bold">신고 상세</h1>

      {report.isPending && (
        <p className="mt-6 text-muted-foreground">불러오는 중…</p>
      )}

      {report.data && (
        <dl className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          <Row term="사유" value={reasonLabel(report.data.reasonCode)} />
          <Row term="대상" value={`대화방 #${report.data.roomId}`} />
          <Row term="상태" value={REPORT_STATUS_LABEL[report.data.status]} />
          <Row term="신고자" value={`사용자 #${report.data.reporterUserId}`} />
          <Row term="피신고자" value={`사용자 #${report.data.reportedUserId}`} />
          <Row term="상세" value={report.data.detail ?? '없음'} />
          {report.data.reviewedAt && (
            <Row
              term="처리 기록"
              value={`관리자 #${report.data.reviewedByAdminId} · ${new Date(report.data.reviewedAt).toLocaleString('ko-KR')}`}
            />
          )}
        </dl>
      )}

      {/*
        조치는 2종뿐이다(이슈 #11).
        WARNING  → ACTIONED 로 종결. 계정 상태는 바꾸지 않고 경고 이력만 남긴다.
        DISMISSED → NO_ACTION 으로 종결.
        이미 종결된 신고에 다시 조치하면 409 다.
      */}
      <h2 className="mb-3 mt-8 text-lg font-bold">조치</h2>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary">경고 (WARNING)</Button>
        <Button variant="ghost">반려 (DISMISSED)</Button>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">
        경고는 계정 상태를 바꾸지 않고 이력만 남깁니다. 종결된 신고는 다시 조치할
        수 없습니다.
      </p>

      <div className="mt-8">
        <NotConnected
          endpoint={`GET /admin/reports/${reportId} · POST /admin/reports/${reportId}/actions`}
          note="상세 조회는 신고자·피신고자·양쪽 Pet·방·전체 메시지를 담은 관리자 전용 Evidence DTO 를 받아 대화 전문을 띄워야 합니다. 아직 그 영역이 없습니다."
        />
      </div>
    </div>
  )
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd className="ml-auto min-w-0 text-right">{value}</dd>
    </div>
  )
}

function reasonLabel(reason: string) {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason
}
