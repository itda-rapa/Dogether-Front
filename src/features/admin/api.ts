import { apiRequest } from '@/lib/api'
import type {
  AdminDashboard,
  RiskSignalType,
  SafetyActionType,
  SafetyCase,
  SafetyCaseDetail,
  SafetyCasePage,
  SafetyCaseStatus,
  SafetyEvidencePage,
} from './types'

/** Asia/Seoul 날짜 기준. from/to 생략 시 오늘 포함 최근 7일, 최대 90일. */
export function getAdminDashboard(params: { from?: string; to?: string } = {}) {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  const qs = q.toString()
  return apiRequest<AdminDashboard>(`/admin/dashboard${qs ? `?${qs}` : ''}`)
}

export type ListSafetyCasesParams = {
  status?: SafetyCaseStatus
  signalType?: RiskSignalType
  subjectUserId?: number
  targetUserId?: number
  cursor?: string
  size?: number
}

/** 생성 시각 기반 cursor 조회. status 기본값은 OPEN(백엔드 defaultValue). */
export function listSafetyCases(params: ListSafetyCasesParams = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.signalType) q.set('signalType', params.signalType)
  if (params.subjectUserId != null) q.set('subjectUserId', String(params.subjectUserId))
  if (params.targetUserId != null) q.set('targetUserId', String(params.targetUserId))
  if (params.cursor) q.set('cursor', params.cursor)
  if (params.size) q.set('size', String(params.size))
  const qs = q.toString()
  return apiRequest<SafetyCasePage>(`/admin/safety/cases${qs ? `?${qs}` : ''}`)
}

export function getSafetyCase(caseId: number) {
  return apiRequest<SafetyCaseDetail>(`/admin/safety/cases/${caseId}`)
}

/** OPEN/REVIEWING 만 처리 가능. append-only — 한번 처리하면 되돌릴 수 없다. */
export function resolveSafetyCase(
  caseId: number,
  body: { actionType: SafetyActionType; reason: string },
) {
  return apiRequest<SafetyCase>(`/admin/safety/cases/${caseId}/actions`, {
    method: 'POST',
    body,
  })
}

/**
 * USER_BLOCK/GREETING 원천의 안전한 요약만 반환한다. 채팅 원문·Media URL 은
 * 절대 오지 않는다. 조회 시도 자체가 감사 로그에 남으므로 `purpose`(조회 사유)가
 * 필수다.
 */
export function getSafetyEvidence(
  caseId: number,
  params: { purpose: string; cursor?: string; size?: number },
) {
  const q = new URLSearchParams({ purpose: params.purpose })
  if (params.cursor) q.set('cursor', params.cursor)
  if (params.size) q.set('size', String(params.size))
  return apiRequest<SafetyEvidencePage>(`/admin/safety/cases/${caseId}/evidence?${q.toString()}`)
}
