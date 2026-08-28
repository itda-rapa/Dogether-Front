import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChartBar } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { getAdminDashboard } from '@/features/admin/api'
import { RISK_SIGNAL_LABEL, type RiskSignalType } from '@/features/admin/types'

/** Asia/Seoul 날짜 기준. 생략하면 오늘 포함 최근 7일이다(백엔드 기본값). */
export function AdminDashboardPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard', from, to],
    queryFn: () => getAdminDashboard({ from: from || undefined, to: to || undefined }),
    retry: false,
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/admin" label="관리자" />

      <div className="mt-4 flex items-center gap-2">
        <ChartBar size={26} weight="fill" className="text-primary-strong" aria-hidden />
        <h1 className="text-2xl font-bold">서비스 통계</h1>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          시작일
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          종료일
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3"
          />
        </label>
      </div>

      {dashboard.isPending && <p className="mt-6 text-muted-foreground">불러오는 중…</p>}
      {dashboard.isError && (
        <div className="mt-6">
          <ApiErrorNotice
            error={dashboard.error}
            title="통계를 불러오지 못했습니다"
            onRetry={() => void dashboard.refetch()}
          />
        </div>
      )}

      {dashboard.data && (
        <>
          <p className="mt-6 text-[13px] text-muted-foreground">
            {dashboard.data.period.from} ~ {dashboard.data.period.to} ({dashboard.data.period.zoneId})
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="회원" total={dashboard.data.users.total} newInPeriod={dashboard.data.users.newInPeriod} />
            <Stat label="펫" total={dashboard.data.pets.total} newInPeriod={dashboard.data.pets.newInPeriod} />
            <Stat label="셋로그" total={dashboard.data.setlogs.total} newInPeriod={dashboard.data.setlogs.newInPeriod} />
            <Stat label="게시글" total={dashboard.data.boardPosts.total} newInPeriod={dashboard.data.boardPosts.newInPeriod} />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold">신고·안전</h2>
          <dl className="overflow-hidden rounded-xl border border-border bg-surface">
            <Row term="기간 내 신고 접수" value={`${dashboard.data.reports.createdInPeriod}건`} />
            <Row term="현재 OPEN 신고" value={`${dashboard.data.reports.open}건`} />
            <Row term="탐지된 사용자" value={`${dashboard.data.safety.detectedUsers}명`} />
            <Row term="현재 검토 대기 Case" value={`${dashboard.data.safety.openCases}건`} />
          </dl>
          {Object.keys(dashboard.data.safety.signalsByType).length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {Object.entries(dashboard.data.safety.signalsByType).map(([type, count]) => (
                <li key={type} className="rounded-full bg-primary-subtle px-3 py-1 text-[13px] font-medium text-primary-strong">
                  {RISK_SIGNAL_LABEL[type as RiskSignalType] ?? type} {count}건
                </li>
              ))}
            </ul>
          )}

          <h2 className="mb-3 mt-8 text-lg font-bold">스토리지 정리 backlog</h2>
          <dl className="overflow-hidden rounded-xl border border-border bg-surface">
            <Row term="대기" value={`${dashboard.data.storageCleanup.pending}건`} />
            <Row term="재시도" value={`${dashboard.data.storageCleanup.retry}건`} />
            <Row term="실패" value={`${dashboard.data.storageCleanup.failed}건`} />
          </dl>

          <h2 className="mb-3 mt-8 text-lg font-bold">최근 운영 항목</h2>
          <ul className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
            {dashboard.data.recentItems.length === 0 && (
              <li className="py-4 text-center text-muted-foreground">최근 항목이 없습니다.</li>
            )}
            {dashboard.data.recentItems.map((item) => (
              <li key={`${item.source}-${item.id}`} className="text-[14px]">
                <p className="font-medium">
                  {item.source === 'REPORT' ? '신고' : '안전 검토'} #{item.id} · {item.status}
                </p>
                <p className="text-muted-foreground">
                  사용자 #{item.subjectUserId} · {item.reason}
                </p>
                <p className="text-[12px] text-muted-foreground">{new Date(item.createdAt).toLocaleString('ko-KR')}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function Stat({ label, total, newInPeriod }: { label: string; total: number; newInPeriod: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{total}</p>
      <p className="text-[13px] text-muted-foreground">기간 내 +{newInPeriod}</p>
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
