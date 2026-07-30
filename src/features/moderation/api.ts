import { apiRequest } from '@/lib/api'
import type { Block, BlockListResult, Report, ReportReason } from './types'

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
