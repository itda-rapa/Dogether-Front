/** 04_M1_OpenAPI.yaml 의 Pet 스키마. */

export type PetSex = 'MALE' | 'FEMALE' | 'UNKNOWN' | null
export type PetSize = 'SMALL' | 'MEDIUM' | 'LARGE' | null

export type Pet = {
  petId: number
  ownerUserId: number
  /** `닉네임#A7K2` 형태. 친구 검색의 키다. */
  publicTag: string
  ownerPublicTag?: string
  nickname: string
  breedName: string | null
  sex: PetSex
  neutered: boolean | null
  /** YYYY-MM-DD */
  birthDate: string | null
  weightKg: number | null
  sizeCode: PetSize
  bio: string | null
  personalityTags?: string[]
  careNote: string | null
  /** M1 사용자 등록 Pet 은 항상 null 이라 클라이언트가 기본 이미지를 보여준다. */
  profileUrl: string | null
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED'
  deletedAt: string | null
  verified: boolean
  verifiedAt?: string | null
  active: boolean
}

export const SEX_LABEL: Record<'MALE' | 'FEMALE' | 'UNKNOWN', string> = {
  MALE: '수컷',
  FEMALE: '암컷',
  UNKNOWN: '모름',
}

export const SIZE_LABEL: Record<'SMALL' | 'MEDIUM' | 'LARGE', string> = {
  SMALL: '소형견',
  MEDIUM: '중형견',
  LARGE: '대형견',
}

export type PetVerificationIdentifierType = 'REGISTRATION_NUMBER' | 'RFID'
export type PetVerificationFlowType = 'EXISTING_PET_VERIFY' | 'PET_CREATE'

export type PetVerificationLookupFields = {
  identifierType: PetVerificationIdentifierType
  identifier: string
  ownerName?: string
  ownerBirthDate?: string
}

/**
 * POST /pet-verifications 요청. 기존 펫에 적용할 땐 petId 가 필요하고(어떤
 * 펫에 적용할지 조회 시점부터 알아야 하는 계약), 신규 등록과 동시에 인증할
 * 땐 아직 펫이 없으니 petId 가 없다.
 */
export type PetVerificationIssueBody =
  | ({ flowType: 'EXISTING_PET_VERIFY'; petId: number } & PetVerificationLookupFields)
  | ({ flowType: 'PET_CREATE' } & PetVerificationLookupFields)

/** 조회 결과. 확인용 표시일 뿐이며 적용(POST /pets/{petId}/verification)이나
 *  등록(POST /pets)이 이 값을 Pet 필드에 자동으로 쓰진 않는다 — 사용자가 폼에서
 *  직접 확인·수정해야 한다. */
export type PetVerificationPrefill = {
  nickname: string | null
  breedName: string | null
  birthDate: string | null
  sex: PetSex
  neutered: boolean | null
}

export type PetVerificationIssueResult = {
  verificationToken: string
  expiresAt: string
  petPrefill: PetVerificationPrefill
}

/** 생년월일에서 나이를 계산한다. 없으면 null. */
export function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const monthDiff = now.getMonth() - born.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1
  return age >= 0 ? age : null
}
