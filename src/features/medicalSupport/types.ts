/**
 * BE PR #160 (Dogether-BackEnd, "서울·성남 반려동물 의료지원사업 Pilot foundation")
 * 계약 기준. 이 PR은 아직 미병합(OPEN) 상태라 병합 리뷰 과정에서 필드/경로가
 * 바뀔 수 있다 — 바뀌면 이 파일과 api.ts 를 함께 고친다.
 */

export type MedicalSupportRegionScope = 'SIDO' | 'SIGUNGU'

export type MedicalSupportProgramStatus =
  | 'SCHEDULED'
  | 'OPEN'
  | 'CLOSED'
  | 'BUDGET_EXHAUSTED'
  | 'UNKNOWN'

export type MedicalSupportHospitalPolicy =
  | 'DESIGNATED_LIST'
  | 'REGIONAL_ELIGIBLE_PROVIDER'
  | 'NOT_PUBLISHED'

export type MedicalSupportHospital = {
  name: string
  address: string | null
  phone: string | null
  sidoName: string | null
  sigunguName: string | null
}

/**
 * GET /medical-support/programs, GET /medical-support/programs/{programId} 공용 응답.
 * 목록 항목은 상세 필드(supportTarget 이하)와 designatedHospitals 가 비어 온다
 * (BE MedicalSupportProgramResponse.list()) — 상세 화면에서 다시 조회해야 채워진다.
 */
export type MedicalSupportProgram = {
  programId: number
  programName: string
  /** canonical 적용 범위. `region` 은 표시용 snapshot일 뿐이라 판단 기준으로 쓰지 않는다. */
  regionScope: MedicalSupportRegionScope
  regionCode: string
  region: string
  programYear: number
  summary: string | null
  supportAmount: string | null
  applicationPeriod: string | null
  status: MedicalSupportProgramStatus
  hospitalPolicy: MedicalSupportHospitalPolicy
  officialSource: string
  lastVerifiedAt: string
  supportTarget: string | null
  supportItems: string | null
  applicationMethod: string | null
  animalRegistrationCondition: string | null
  incomeWelfareCondition: string | null
  contact: string | null
  designatedHospitals: MedicalSupportHospital[]
}

export const PROGRAM_STATUS_LABEL: Record<MedicalSupportProgramStatus, string> = {
  SCHEDULED: '시행 예정',
  OPEN: '접수 중',
  CLOSED: '접수 마감',
  BUDGET_EXHAUSTED: '예산 소진',
  UNKNOWN: '확인 필요',
}

export const HOSPITAL_POLICY_LABEL: Record<MedicalSupportHospitalPolicy, string> = {
  DESIGNATED_LIST: '지정병원 이용',
  REGIONAL_ELIGIBLE_PROVIDER: '지역 내 병원 이용 가능',
  NOT_PUBLISHED: '지정병원 정보 미공개',
}
