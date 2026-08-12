import { useState } from 'react'
import { Link, Navigate, Outlet, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CaretLeft,
  CaretRight,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/input-class'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { getAdminReport, listAdminReports, actOnReport } from '@/features/moderation/api'
import {
  REPORT_ACTION_LABEL,
  REPORT_ACTION_TYPES,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_STATUS_LABEL,
  type PartyEvidence,
  type ReportActionType,
  type ReportDetail,
  type ReportStatus,
} from '@/features/moderation/types'
import type { ChatMessage } from '@/features/chat/types'

const PAGE_SIZE = 20

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

/*
  실측값 기준. 접수 직후는 OPEN 이고, 관리자 조치로 ACTIONED(경고) 또는
  NO_ACTION(반려)으로 종결된다. PENDING/RESOLVED/REJECTED 는 존재하지 않는다.
*/
const STATUSES = REPORT_STATUSES

export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus>('OPEN')
  const [page, setPage] = useState(0)

  const reports = useQuery({
    queryKey: ['admin', 'reports', status, page],
    queryFn: () => listAdminReports({ status, page, size: PAGE_SIZE }),
    retry: false,
  })

  const totalPages = reports.data?.page.totalPages ?? 0

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
            onClick={() => {
              setStatus(s)
              setPage(0)
            }}
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
                  대화방 #{r.roomId} · {new Date(r.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <CaretRight size={18} className="shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {reports.data && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="grid size-11 place-items-center rounded-lg transition-colors hover:bg-primary-subtle disabled:pointer-events-none disabled:opacity-40"
          >
            <CaretLeft size={18} />
          </button>
          <span className="text-[14px] text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="grid size-11 place-items-center rounded-lg transition-colors hover:bg-primary-subtle disabled:pointer-events-none disabled:opacity-40"
          >
            <CaretRight size={18} />
          </button>
        </div>
      )}

      {reports.isError && (
        <div className="mt-6">
          <ApiErrorNotice
            error={reports.error}
            title="신고 목록을 불러오지 못했습니다"
            onRetry={() => void reports.refetch()}
          />
        </div>
      )}
    </div>
  )
}

export function AdminReportDetailPage() {
  const { reportId = '' } = useParams()
  const queryClient = useQueryClient()
  const [activeAction, setActiveAction] = useState<ReportActionType | null>(null)
  const [reason, setReason] = useState('')
  const [conflictNotice, setConflictNotice] = useState(false)

  const detail = useQuery({
    queryKey: ['admin', 'report', reportId],
    queryFn: () => getAdminReport(reportId),
    retry: false,
  })

  const listKey = ['admin', 'reports']

  const submit = useMutation({
    mutationFn: (actionType: ReportActionType) =>
      actOnReport(reportId, { actionType, reason: reason.trim() }),
    onSuccess: async (updated) => {
      queryClient.setQueryData<ReportDetail>(['admin', 'report', reportId], (prev) =>
        prev ? { ...prev, report: updated } : prev,
      )
      await queryClient.invalidateQueries({ queryKey: listKey })
      setActiveAction(null)
      setReason('')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setConflictNotice(true)
        setActiveAction(null)
        void detail.refetch()
      }
    },
  })

  const report = detail.data?.report

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/admin/reports" label="신고 처리" />
      <h1 className="mt-4 text-2xl font-bold">신고 상세</h1>

      {conflictNotice && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <WarningCircle
            size={20}
            weight="fill"
            className="mt-0.5 shrink-0 text-destructive"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">다른 관리자가 이미 처리했습니다.</p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              최신 상태로 다시 불러왔습니다.
            </p>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setConflictNotice(false)}
            className="shrink-0 text-[13px] text-muted-foreground underline"
          >
            닫기
          </button>
        </div>
      )}

      {detail.isPending && (
        <p className="mt-6 text-muted-foreground">불러오는 중…</p>
      )}

      {detail.isError && (
        <div className="mt-6">
          <ApiErrorNotice
            error={detail.error}
            title="신고 상세를 불러오지 못했습니다"
            onRetry={() => void detail.refetch()}
          />
        </div>
      )}

      {report && detail.data && (
        <>
          <dl className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
            <Row term="사유" value={reasonLabel(report.reasonCode)} />
            <Row term="대상" value={`대화방 #${report.roomId}`} />
            <Row term="상태" value={REPORT_STATUS_LABEL[report.status]} />
            <Row term="상세" value={report.detail ?? '없음'} />
            <Row
              term="접수 시각"
              value={new Date(report.createdAt).toLocaleString('ko-KR')}
            />
          </dl>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PartyCard title="신고자" party={detail.data.reporter} />
            <PartyCard title="피신고자" party={detail.data.reported} />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold">대화 전문</h2>
          <p className="mb-3 text-[13px] text-muted-foreground">
            대화방 #{detail.data.room.roomId} ·{' '}
            {detail.data.room.status === 'ACTIVE' ? '진행 중' : '보관됨'}
          </p>
          <ul className="flex max-h-[480px] flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-surface p-4">
            {detail.data.messages.length === 0 && (
              <li className="py-6 text-center text-muted-foreground">
                메시지가 없습니다.
              </li>
            )}
            {detail.data.messages.map((m) => (
              <li key={m.messageId}>
                <MessageEvidenceRow
                  message={m}
                  reporterPetId={detail.data.reporter.petId}
                  reportedPetId={detail.data.reported.petId}
                  reporterNickname={detail.data.reporter.petNickname}
                  reportedNickname={detail.data.reported.petNickname}
                />
              </li>
            ))}
          </ul>

          {/* 조치는 2종뿐이다(이슈 #11). WARNING → ACTIONED, DISMISSED → NO_ACTION. */}
          <h2 className="mb-3 mt-8 text-lg font-bold">조치</h2>

          {report.status === 'OPEN' ? (
            <>
              <div className="flex flex-wrap gap-3">
                {REPORT_ACTION_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant={type === 'DISMISSED' ? 'ghost' : 'secondary'}
                    onClick={() => {
                      setActiveAction(type)
                      setConflictNotice(false)
                    }}
                  >
                    {REPORT_ACTION_LABEL[type]} ({type})
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                경고는 계정 상태를 바꾸지 않고 이력만 남깁니다. 처리 사유는
                필수입니다.
              </p>

              {activeAction && (
                <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                  <label htmlFor="action-reason" className="block font-medium">
                    {REPORT_ACTION_LABEL[activeAction]} 사유
                  </label>
                  <textarea
                    id="action-reason"
                    rows={3}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="처리 사유를 입력하세요 (1~500자)"
                    className={cn(inputClass(false), 'mt-1.5 resize-y py-3')}
                  />

                  {submit.isError &&
                    !(submit.error instanceof ApiError && submit.error.status === 409) && (
                      <p role="alert" className="mt-2 text-[14px] text-destructive">
                        {submit.error instanceof ApiError
                          ? submit.error.message
                          : '처리하지 못했습니다. 네트워크 연결을 확인해 주세요.'}
                      </p>
                    )}

                  <div className="mt-3 flex gap-3">
                    <Button
                      onClick={() => submit.mutate(activeAction)}
                      disabled={reason.trim().length === 0 || submit.isPending}
                    >
                      {submit.isPending ? '처리 중…' : '처리 확정'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActiveAction(null)
                        setReason('')
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <dl className="overflow-hidden rounded-xl border border-border bg-surface">
              <Row
                term="처리 관리자"
                value={
                  report.reviewedByAdminId != null
                    ? `#${report.reviewedByAdminId}`
                    : '알 수 없음'
                }
              />
              <Row
                term="처리 시각"
                value={
                  report.reviewedAt
                    ? new Date(report.reviewedAt).toLocaleString('ko-KR')
                    : '알 수 없음'
                }
              />
              <Row term="처리 사유" value={report.resolutionNote ?? '없음'} />
            </dl>
          )}
        </>
      )}
    </div>
  )
}

function PartyCard({ title, party }: { title: string; party: PartyEvidence }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[13px] text-muted-foreground">{title}</p>
      <p className="mt-1 truncate font-semibold">{party.petNickname}</p>
      <p className="truncate text-[13px] text-muted-foreground">
        {party.petPublicTag}
      </p>
      <p className="mt-2 truncate text-[13px] text-muted-foreground">
        보호자 {party.userNickname} ({party.userPublicTag})
      </p>
    </div>
  )
}

function MessageEvidenceRow({
  message,
  reporterPetId,
  reportedPetId,
  reporterNickname,
  reportedNickname,
}: {
  message: ChatMessage
  reporterPetId: number
  reportedPetId: number
  reporterNickname: string
  reportedNickname: string
}) {
  if (message.senderType === 'SYSTEM' || message.type === 'SYSTEM') {
    return (
      <p className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">
        {message.body ?? '시스템 메시지'}
      </p>
    )
  }

  const fromReported = message.senderPetId === reportedPetId
  const senderLabel =
    message.senderPetId === reporterPetId
      ? reporterNickname
      : message.senderPetId === reportedPetId
        ? reportedNickname
        : `펫 #${message.senderPetId}`

  return (
    <div className={cn('flex flex-col', fromReported ? 'items-end' : 'items-start')}>
      <span className="mb-0.5 text-[12px] text-muted-foreground">{senderLabel}</span>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          message.type === 'CARD'
            ? 'border-2 border-primary bg-surface'
            : fromReported
              ? 'bg-primary text-on-primary'
              : 'border border-border bg-background',
        )}
      >
        {message.type === 'CARD' ? (
          <p className="text-[14px] font-medium text-primary-strong">
            약속 카드 · {message.body ?? '약속이 잡혔습니다.'}
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        )}
      </div>
      <span className="mt-0.5 text-[11px] text-muted-foreground">
        {new Date(message.createdAt).toLocaleString('ko-KR')}
      </span>
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
