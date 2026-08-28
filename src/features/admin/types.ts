/**
 * 관리자 Safety Queue·Dashboard 계약. 원본: dogether(백엔드)
 * docs/spec/M3/02_M3_API_계약.md §5, itda.safety.dto / itda.dashboard.dto.
 */

export type SafetyCaseStatus = 'OPEN' | 'REVIEWING' | 'DISMISSED' | 'WARNING_RECORDED'
export type SafetyActionType = 'DISMISSED' | 'WARNING_RECORDED'
export type RiskSignalType = 'USER_BLOCKED' | 'GREETING_EXPIRED'
export type RiskSourceType = 'USER_BLOCK' | 'GREETING'

export const SAFETY_STATUS_LABEL: Record<SafetyCaseStatus, string> = {
  OPEN: '대기',
  REVIEWING: '검토 중',
  DISMISSED: '오탐 처리',
  WARNING_RECORDED: '경고 기록',
}

export const RISK_SIGNAL_LABEL: Record<RiskSignalType, string> = {
  USER_BLOCKED: '차단당함',
  GREETING_EXPIRED: '인사 무응답',
}

export type SafetyUser = {
  userId: number
  publicTag: string
}

export type SafetyCase = {
  caseId: number
  subject: SafetyUser
  target: SafetyUser
  status: SafetyCaseStatus
  totalScore: number
  signalCount: number
  primarySignalType: string
  evaluationPolicyVersion: number
  firstDetectedAt: string
  lastDetectedAt: string
  evaluatedAt: string
  version: number
  createdAt: string
  updatedAt: string
}

export type CursorPage = { nextCursor: string | null; hasNext: boolean }

export type SafetyCasePage = {
  items: SafetyCase[]
  page: CursorPage
}

export type SafetySignal = {
  signalId: number
  eventId: string
  sourceType: RiskSourceType
  sourceId: number
  signalType: RiskSignalType
  score: number
  scorePolicyVersion: number
  occurredAt: string
}

export type SafetyCaseAction = {
  actionId: number
  adminUserId: number
  actionType: SafetyActionType
  reason: string
  createdAt: string
}

export type SafetyCaseDetail = {
  safetyCase: SafetyCase
  recentSignals: SafetySignal[]
  hasMoreSignals: boolean
  actions: SafetyCaseAction[]
}

export type SafetyEvidenceAccessStatus = 'AVAILABLE' | 'SOURCE_NOT_FOUND' | 'UNSUPPORTED'

export type SafetyEvidence = {
  signalId: number
  signalType: RiskSignalType
  sourceType: RiskSourceType
  sourceId: number
  occurredAt: string
  accessStatus: SafetyEvidenceAccessStatus
  source: {
    subjectPublicTag: string
    targetPublicTag: string
    sourceStatus: string
    sourceOccurredAt: string
  } | null
}

export type SafetyEvidencePage = {
  items: SafetyEvidence[]
  page: CursorPage
}

export type AdminEntityCount = { total: number; newInPeriod: number }

export type AdminDashboardRecentItem = {
  source: 'REPORT' | 'SAFETY_CASE'
  id: number
  status: string
  subjectUserId: number
  reason: string
  createdAt: string
}

export type AdminDashboard = {
  period: { from: string; to: string; zoneId: string }
  users: AdminEntityCount
  pets: AdminEntityCount
  setlogs: AdminEntityCount
  boardPosts: AdminEntityCount
  reports: { createdInPeriod: number; open: number }
  safety: {
    detectedUsers: number
    openCases: number
    signalsByType: Record<string, number>
  }
  storageCleanup: { pending: number; retry: number; failed: number }
  recentItems: AdminDashboardRecentItem[]
}
