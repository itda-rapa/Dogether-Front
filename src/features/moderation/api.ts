import { apiRequest } from '@/lib/api'
import type {
  Block,
  BlockListResult,
  Report,
  ReportActionBody,
  ReportDetail,
  ReportListResult,
  ReportReason,
  ReportStatus,
} from './types'

/**
 * 차단.
 *
 * 펫을 지정하면 서버가 소유 User 를 찾아 **User 단위 차단**으로 확장한다.
 * 친구관계 삭제, 양방향 대기중 요청 취소, 상호작용·노출 차단이 함께 일어난다.
 * 되돌릴 수 없는 동작이므로 UI 에서 반드시 확인을 받는다.
 *
 * ⚠️ M1 계약에 **차단 해제 API 가 없다.** 의도인지 누락인지 확인이 필요하다.
 */
export function createBlock(targetPetId: number) {
  return apiRequest<Block>('/me/blocks', {
    method: 'POST',
    body: { targetPetId },
  })
}

export function listBlocks(params?: { cursor?: string; limit?: number }) {
  const q = new URLSearchParams()
  if (params?.cursor) q.set('cursor', params.cursor)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiRequest<BlockListResult>(`/me/blocks${qs ? `?${qs}` : ''}`)
}

export type CreateReportBody = {
  /** 신고는 DIRECT 방 단위로만 접수된다. 셋로그·게시글 신고는 M1 범위가 아니다. */
  roomId: number
  reasonCode: ReportReason
  detail?: string
}

export function createReport(body: CreateReportBody) {
  return apiRequest<Report>('/reports', { method: 'POST', body })
}

export type CreateSetlogReportBody = {
  setlogId: number
  reasonCode: ReportReason
  detail?: string
}

/**
 * 셋로그 단위 신고. M1 계약에 없다 — 엔드포인트·바디 모양 모두 백엔드 협의 전
 * 임시 추정치다. `SETLOG_REPORT_ENABLED`(ModerationMenu.tsx)로 UI 자체를
 * 숨겨뒀으니, 협의가 끝나면 이 함수부터 실제 계약에 맞게 고칠 것.
 */
export function createSetlogReport(body: CreateSetlogReportBody) {
  return apiRequest<Report>('/reports/setlogs', { method: 'POST', body })
}

/** 관리자 신고 큐. 최신 신고순, 같은 시각이면 ID 내림차순으로 서버가 정렬해서 준다. */
export function listAdminReports(params: {
  status?: ReportStatus
  page: number
  size: number
}) {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  q.set('page', String(params.page))
  q.set('size', String(params.size))
  return apiRequest<ReportListResult>(`/admin/reports?${q.toString()}`)
}

/** 신고 상세 + 증거(신고자·피신고자·방·전체 메시지). */
export function getAdminReport(reportId: number | string) {
  return apiRequest<ReportDetail>(`/admin/reports/${reportId}`)
}

/**
 * 신고 처리. DISMISSED → NO_ACTION, WARNING → ACTIONED.
 * 이미 종결됐거나 다른 관리자가 동시에 처리하면 409 다 — 호출부에서 상세를
 * 재조회해 최신 상태를 보여줘야 한다.
 */
export function actOnReport(reportId: number | string, body: ReportActionBody) {
  return apiRequest<Report>(`/admin/reports/${reportId}/actions`, {
    method: 'POST',
    body,
  })
}
