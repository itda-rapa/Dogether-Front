/** 차단·신고 관련 타입. 04_M1_OpenAPI.yaml 및 백엔드 DTO 기준. */

export type Block = {
  blockId: number
  blockedUserId: number
  blockedUserPublicTag: string | null
  createdAt: string
}

export type BlockListResult = {
  items: Block[]
  page: { nextCursor: string | null; hasNext: boolean }
}

/**
 * 신고 사유. 백엔드 `ReportReason` enum 과 정확히 일치해야 한다.
 * M1 은 3종뿐이다. 임의로 늘리지 않는다.
 */
export const REPORT_REASONS = [
  { value: 'HARASSMENT', label: '욕설 또는 괴롭힘' },
  { value: 'SPAM', label: '스팸 또는 광고' },
  { value: 'OTHER', label: '기타' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']

/**
 * 신고 상태. 백엔드 실측값 기준.
 * 접수 직후는 `OPEN` 이다. 관리자 조치로 종결되면 `NO_ACTION`(반려) 또는
 * `ACTIONED`(경고)로 바뀐다 — 이슈 #11 기준.
 */
export const REPORT_STATUSES = ['OPEN', 'ACTIONED', 'NO_ACTION'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: '대기',
  ACTIONED: '경고 처리',
  NO_ACTION: '반려',
}

/**
 * 신고는 M1 에서 **DIRECT 채팅방 단위로만** 접수된다.
 * 셋로그·게시글·펫 신고는 M1 범위가 아니다.
 *
 * 신고자·피신고자는 서버가 방 참여자에서 알아서 채운다. 클라이언트가 보내지 않는다.
 */
export type Report = {
  reportId: number
  roomId: number
  reporterUserId: number
  reportedUserId: number
  reasonCode: ReportReason
  detail: string | null
  status: ReportStatus
  /** 관리자 처리 흔적. 미처리면 전부 null. */
  reviewedByAdminId: number | null
  reviewedAt: string | null
  resolutionNote: string | null
  createdAt: string
}
