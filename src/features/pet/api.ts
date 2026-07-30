import { apiRequest } from '@/lib/api'
import type { Pet, PetSex, PetSize } from './types'

/** Active Pet 이 먼저, 나머지는 createdAt ASC 로 온다. */
export function listMyPets() {
  return apiRequest<Pet[]>('/pets/me')
}

export function getPet(petId: number) {
  return apiRequest<Pet>(`/pets/${petId}`)
}

export type PetWriteBody = {
  nickname?: string
  breedName?: string | null
  sex?: PetSex
  neutered?: boolean | null
  birthDate?: string | null
  weightKg?: number | null
  sizeCode?: PetSize
  bio?: string | null
  personalityTags?: string[]
  careNote?: string | null
}

/**
 * 펫 등록.
 * 한 사용자당 미삭제 펫은 최대 5마리(409 PET_LIMIT_EXCEEDED).
 * 첫 펫은 서버가 자동으로 Active 로 지정한다.
 */
export function createPet(body: PetWriteBody & { nickname: string }) {
  return apiRequest<{ pet: Pet; activeAssignmentStatus: string }>('/pets', {
    method: 'POST',
    body,
  })
}

/*
  PATCH /pets/{petId} 와 DELETE /pets/{petId} 는 M1 계약에 없다.
  화면도 만들지 않는다. 필요해지면 계약부터 추가해야 한다.
*/

/**
 * 공개 태그로 상대 펫을 찾는다. 친구 요청의 진입점이다(OpenAPI 계약에 존재).
 * 컨트롤러는 아직 없어 404 가 온다 — 친구 기능은 BE-3 로 이관됐다.
 */
export function searchPetByPublicTag(publicTag: string) {
  return apiRequest<Pet | null>(
    `/pets/search?publicTag=${encodeURIComponent(publicTag)}`,
  )
}
