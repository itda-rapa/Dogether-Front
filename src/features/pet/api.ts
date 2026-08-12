import { apiRequest } from '@/lib/api'
import type { Pet, PetSex, PetSize } from './types'

export type ActivePetAssignmentStatus =
  | 'ASSIGNED'
  | 'RETRY_REQUIRED'
  | 'NOT_APPLICABLE'

export type PetCreateResponse = {
  pet: Pet
  activeAssignmentStatus: ActivePetAssignmentStatus
}

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
  return apiRequest<PetCreateResponse>('/pets', {
    method: 'POST',
    body,
  })
}

/**
 * 펫 정보 부분 수정.
 *
 * `birthDate` 는 계약상 수정 가능하지만, 펫 인증(동물등록 조회)이 채워준 값을
 * 사용자가 뒤에서 바꿔치기할 수 있으면 인증 배지의 신뢰도가 깨진다. 그래서
 * `PetWriteBody` 를 그대로 받되, 편집 화면([PetEditPage.tsx](../../routes/PetEditPage.tsx))
 * 이 애초에 생일 입력 필드를 두지 않는 방식으로 막는다 — 여기 API 레벨에서
 * 강제하진 않는다.
 *
 * DELETE /pets/{petId} 는 아직 계약에 없다.
 */
export function updatePet(petId: number, body: PetWriteBody) {
  return apiRequest<Pet>(`/pets/${petId}`, { method: 'PATCH', body })
}

/**
 * 펫 프로필 사진 등록/교체.
 *
 * ⚠️ 제안 단계 엔드포인트, M1 계약에 없다. 위 PATCH /pets/{petId} 전체 수정과
 * 별개로, 사진 하나만 다루도록 좁혀서 새로 제안한다. `mediaId` 는
 * features/media/api 의 `uploadMedia` 로 저장을 먼저 끝낸 미디어의 id.
 * docs/handover/profile-avatar-be.md 참고. "사진 AI 완전 폐기"(v13 D-01)는
 * AI 분석·인증 파이프라인 폐기였지, 단순 이미지 저장까지 막는 결정은 아니었다.
 */
export function updatePetProfileImage(petId: number, mediaId: number) {
  return apiRequest<Pet>(`/pets/${petId}/profile-image`, {
    method: 'PATCH',
    body: { mediaId },
  })
}

/**
 * 공개 태그로 상대 펫을 찾는다. 친구 요청의 진입점이다(OpenAPI 계약에 존재).
 * 컨트롤러는 아직 없어 404 가 온다 — 친구 기능은 BE-3 로 이관됐다.
 */
export function searchPetByPublicTag(publicTag: string) {
  return apiRequest<Pet | null>(
    `/pets/search?publicTag=${encodeURIComponent(publicTag)}`,
  )
}
