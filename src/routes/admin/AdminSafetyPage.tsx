import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CaretRight, ShieldWarning, WarningCircle } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/input-class'
import {
  getSafetyCase,
  getSafetyEvidence,
  listSafetyCases,
  resolveSafetyCase,
} from '@/features/admin/api'
import {
  RISK_SIGNAL_LABEL,
  SAFETY_STATUS_LABEL,
  type RiskSignalType,
  type SafetyActionType,
  type SafetyCaseStatus,
} from '@/features/admin/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

const STATUSES: SafetyCaseStatus[] = ['OPEN', 'REVIEWING', 'DISMISSED', 'WARNING_RECORDED']

export function AdminSafetyPage() {
  const [status, setStatus] = useState<SafetyCaseStatus>('OPEN')

  const cases = useQuery({
    queryKey: ['admin', 'safety-cases', status],
    queryFn: () => listSafetyCases({ status, size: 50 }),
    retry: false,
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/admin" label="관리자" />

      <div className="mt-4 flex items-center gap-2">
        <ShieldWarning size={26} weight="fill" className="text-primary-strong" aria-hidden />
        <h1 className="text-2xl font-bold">안전 검토 Queue</h1>
      </div>

      <div role="tablist" aria-label="검토 상태" className="mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-4 font-medium transition-colors',
              status === s
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
            )}
          >
            {SAFETY_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {cases.isPending && <p className="mt-6 text-muted-foreground">불러오는 중…</p>}
      {cases.isError && (
        <div className="mt-6">
          <ApiErrorNotice error={cases.error} title="검토 목록을 불러오지 못했습니다" onRetry={() => void cases.refetch()} />
        </div>
      )}
      {cases.data?.items.length === 0 && (
        <div className="mt-6">
          <EmptyState title="해당 상태의 안전 검토 건이 없습니다" />
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {cases.data?.items.map((c) => (
          <li key={c.caseId}>
            <Link
              to={`/admin/safety/${c.caseId}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {c.subject.publicTag} → {c.target.publicTag}
                </p>
                <p className="truncate text-[14px] text-muted-foreground">
                  {RISK_SIGNAL_LABEL[c.primarySignalType as RiskSignalType] ?? c.primarySignalType} · 점수 {c.totalScore} · 신호 {c.signalCount}건
                </p>
              </div>
              <CaretRight size={18} className="shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ACTION_TYPES: SafetyActionType[] = ['DISMISSED', 'WARNING_RECORDED']
const ACTION_LABEL: Record<SafetyActionType, string> = {
  DISMISSED: '오탐 처리',
  WARNING_RECORDED: '경고 기록',
}

export function AdminSafetyCaseDetailPage() {
  const { caseId = '' } = useParams()
  const id = Number(caseId)
  const queryClient = useQueryClient()
  const [activeAction, setActiveAction] = useState<SafetyActionType | null>(null)
  const [reason, setReason] = useState('')
  const [conflictNotice, setConflictNotice] = useState(false)
  const [evidencePurpose, setEvidencePurpose] = useState('')
  /**
   * 실제로 "조회" 버튼을 눌러 제출한 사유만 조회 키로 쓴다. `evidencePurpose`(입력
   * 중인 텍스트)를 그대로 queryKey에 넣으면 결과를 본 뒤 오타를 고치는 것만으로도
   * 감사 로그에 남는 Evidence 조회가 매 키 입력마다 다시 실행돼 버린다.
   */
  const [submittedPurpose, setSubmittedPurpose] = useState<string | null>(null)

  const detail = useQuery({
    queryKey: ['admin', 'safety-case', id],
    queryFn: () => getSafetyCase(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    retry: false,
  })

  const evidence = useQuery({
    queryKey: ['admin', 'safety-case', id, 'evidence', submittedPurpose],
    queryFn: () => getSafetyEvidence(id, { purpose: submittedPurpose!, size: 20 }),
    enabled: submittedPurpose !== null,
    retry: false,
  })

  const resolve = useMutation({
    mutationFn: (actionType: SafetyActionType) => resolveSafetyCase(id, { actionType, reason: reason.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'safety-case', id] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'safety-cases'] })
      setActiveAction(null)
      setReason('')
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) {
        setConflictNotice(true)
        setActiveAction(null)
        void detail.refetch()
      }
    },
  })

  const safetyCase = detail.data?.safetyCase
  const canResolve = safetyCase?.status === 'OPEN' || safetyCase?.status === 'REVIEWING'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/admin/safety" label="안전 검토 Queue" />
      <h1 className="mt-4 text-2xl font-bold">검토 상세</h1>

      {conflictNotice && (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
          <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">이미 처리된 건입니다.</p>
            <p className="mt-1 text-[14px] text-muted-foreground">최신 상태로 다시 불러왔습니다.</p>
          </div>
          <button type="button" aria-label="닫기" onClick={() => setConflictNotice(false)} className="shrink-0 text-[13px] text-muted-foreground underline">
            닫기
          </button>
        </div>
      )}

      {detail.isPending && <p className="mt-6 text-muted-foreground">불러오는 중…</p>}
      {detail.isError && (
        <div className="mt-6">
          <ApiErrorNotice error={detail.error} title="검토 상세를 불러오지 못했습니다" onRetry={() => void detail.refetch()} />
        </div>
      )}

      {safetyCase && detail.data && (
        <>
          <dl className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
            <Row term="대상" value={`${safetyCase.subject.publicTag} → ${safetyCase.target.publicTag}`} />
            <Row term="상태" value={SAFETY_STATUS_LABEL[safetyCase.status]} />
            <Row term="주요 신호" value={RISK_SIGNAL_LABEL[safetyCase.primarySignalType as RiskSignalType] ?? safetyCase.primarySignalType} />
            <Row term="누적 점수" value={String(safetyCase.totalScore)} />
            <Row term="신호 수" value={`${safetyCase.signalCount}건`} />
            <Row term="최초 탐지" value={new Date(safetyCase.firstDetectedAt).toLocaleString('ko-KR')} />
            <Row term="최근 탐지" value={new Date(safetyCase.lastDetectedAt).toLocaleString('ko-KR')} />
          </dl>

          <h2 className="mb-3 mt-8 text-lg font-bold">최근 신호</h2>
          <ul className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
            {detail.data.recentSignals.length === 0 && (
              <li className="py-4 text-center text-muted-foreground">신호가 없습니다.</li>
            )}
            {detail.data.recentSignals.map((s) => (
              <li key={s.signalId} className="flex items-center justify-between text-[14px]">
                <span>{RISK_SIGNAL_LABEL[s.signalType] ?? s.signalType}</span>
                <span className="text-muted-foreground">
                  점수 {s.score} · {new Date(s.occurredAt).toLocaleString('ko-KR')}
                </span>
              </li>
            ))}
          </ul>
          {detail.data.hasMoreSignals && (
            <p className="mt-2 text-[13px] text-muted-foreground">더 많은 신호가 있습니다.</p>
          )}

          <h2 className="mb-3 mt-8 text-lg font-bold">처리 이력</h2>
          <ul className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
            {detail.data.actions.length === 0 && (
              <li className="py-4 text-center text-muted-foreground">아직 처리 이력이 없습니다.</li>
            )}
            {detail.data.actions.map((a) => (
              <li key={a.actionId} className="text-[14px]">
                <p className="font-medium">{ACTION_LABEL[a.actionType]}</p>
                <p className="text-muted-foreground">{a.reason}</p>
                <p className="text-[12px] text-muted-foreground">{new Date(a.createdAt).toLocaleString('ko-KR')}</p>
              </li>
            ))}
          </ul>

          <h2 className="mb-3 mt-8 text-lg font-bold">Evidence</h2>
          <p className="text-[13px] text-muted-foreground">
            조회 사유를 남기면 원천 이벤트의 안전한 요약(당사자 태그·상태)만 조회됩니다. 조회 시도는 감사 로그에 남습니다.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              aria-label="조회 사유"
              placeholder="조회 사유 (필수)"
              value={evidencePurpose}
              onChange={(e) => setEvidencePurpose(e.target.value)}
              maxLength={500}
              className={cn(inputClass(false), 'flex-1')}
            />
            <Button
              type="button"
              disabled={evidencePurpose.trim() === ''}
              onClick={() => setSubmittedPurpose(evidencePurpose.trim())}
            >
              조회
            </Button>
          </div>
          {submittedPurpose !== null && (
            <div className="mt-3">
              {evidence.isPending && <p className="text-muted-foreground">불러오는 중…</p>}
              {evidence.isError && <ApiErrorNotice error={evidence.error} title="Evidence 를 불러오지 못했습니다" />}
              {evidence.data && (
                <ul className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
                  {evidence.data.items.length === 0 && (
                    <li className="py-4 text-center text-muted-foreground">Evidence 가 없습니다.</li>
                  )}
                  {evidence.data.items.map((e) => (
                    <li key={e.signalId} className="text-[14px]">
                      <p className="font-medium">{RISK_SIGNAL_LABEL[e.signalType] ?? e.signalType}</p>
                      {e.accessStatus === 'AVAILABLE' && e.source ? (
                        <p className="text-muted-foreground">
                          {e.source.subjectPublicTag} → {e.source.targetPublicTag} · {e.source.sourceStatus}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          {e.accessStatus === 'SOURCE_NOT_FOUND' ? '원천 데이터를 찾을 수 없습니다.' : '지원하지 않는 원천입니다.'}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <h2 className="mb-3 mt-8 text-lg font-bold">조치</h2>
          {canResolve ? (
            <>
              <div className="flex flex-wrap gap-3">
                {ACTION_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant={type === 'DISMISSED' ? 'ghost' : 'secondary'}
                    onClick={() => {
                      setActiveAction(type)
                      setConflictNotice(false)
                    }}
                  >
                    {ACTION_LABEL[type]}
                  </Button>
                ))}
              </div>

              {activeAction && (
                <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                  <label htmlFor="safety-action-reason" className="block font-medium">
                    {ACTION_LABEL[activeAction]} 사유
                  </label>
                  <textarea
                    id="safety-action-reason"
                    rows={3}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="처리 사유를 입력하세요 (1~500자)"
                    className={cn(inputClass(false), 'mt-1.5 resize-y py-3')}
                  />

                  {resolve.isError && !(resolve.error instanceof ApiError && resolve.error.status === 409) && (
                    <p role="alert" className="mt-2 text-[14px] text-destructive">
                      처리하지 못했습니다. 잠시 후 다시 시도해 주세요.
                    </p>
                  )}

                  <div className="mt-3 flex gap-3">
                    <Button onClick={() => resolve.mutate(activeAction)} disabled={reason.trim().length === 0 || resolve.isPending}>
                      {resolve.isPending ? '처리 중…' : '처리 확정'}
                    </Button>
                    <Button variant="secondary" onClick={() => { setActiveAction(null); setReason('') }}>
                      취소
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[14px] text-muted-foreground">이미 처리가 종결된 건입니다.</p>
          )}
        </>
      )}
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
