import { apiRequest } from '@/lib/api'
import type { MedicalSupportProgram } from './types'

/**
 * 거주 지역(내 동네)의 검증(VERIFIED)된 반려동물 의료비 지원사업 목록.
 * BE PR #160(Dogether-BackEnd, 아직 미병합) 계약 — 병합 전이라 바뀔 수 있다.
 */
export function listMedicalSupportPrograms() {
  return apiRequest<MedicalSupportProgram[]>('/medical-support/programs')
}

/** 상세 조회. 목록에는 없는 지원 대상/방법/지정병원 목록까지 채워서 온다. */
export function getMedicalSupportProgram(programId: number) {
  return apiRequest<MedicalSupportProgram>(`/medical-support/programs/${programId}`)
}
