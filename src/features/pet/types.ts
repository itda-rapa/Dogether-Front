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
  breedCode: string | null
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
