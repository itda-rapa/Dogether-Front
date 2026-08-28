import { apiRequest } from '@/lib/api'
import type {
  Pet,
  PetPublicProfile,
  PetSex,
  PetSize,
  PetVerificationIssueBody,
  PetVerificationIssueResult,
} from './types'
import type { PetSearchItem } from '@/features/chat/types'

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
 *
 * `petVerificationToken` 은 `issuePetVerification({flowType:'PET_CREATE'})`으로
 * 미리 발급받은 토큰이다 — 실으면 등록과 동시에 인증(verified=true)까지
 * 한 트랜잭션으로 처리된다. 없으면 지금까지처럼 미인증 상태로 등록된다.
 */
export function createPet(
  body: PetWriteBody & { nickname: string; petVerificationToken?: string },
) {
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
 * 위 PATCH /pets/{petId} 전체 수정과 별개로, 사진 하나만 다루는 전용
 * 엔드포인트다. `mediaId` 는 features/media/api 의 `uploadMedia` 로 저장을
 * 먼저 끝낸 미디어의 id. 백엔드가 POST 로 구현했다(PetController
 * @PostMapping) — docs/handover/profile-avatar-be.md 의 PATCH 제안은
 * 최종 계약이 아니었다.
 */
export function updatePetProfileImage(petId: number, mediaId: number) {
  return apiRequest<Pet>(`/pets/${petId}/profile-image`, {
    method: 'POST',
    body: { mediaId },
  })
}

/**
 * 프로필 사진 교체. 이미 사진이 설정된 펫에만 쓴다(없으면 POST 가 최초 설정).
 * `If-Match` 는 큰따옴표로 감싼 현재 `version` 하나만 허용한다. stale version 은
 * 409 CONCURRENT_UPDATE_CONFLICT.
 */
export function replacePetProfileImage(petId: number, mediaId: number, version: number) {
  return apiRequest<Pet>(`/pets/${petId}/profile-image`, {
    method: 'PUT',
    body: { mediaId },
    headers: { 'If-Match': `"${version}"` },
  })
}

/** 프로필 사진 제거. Media row 는 그대로 두고 Pet 의 link 만 지운다. */
export function deletePetProfileImage(petId: number, version: number) {
  return apiRequest<void>(`/pets/${petId}/profile-image`, {
    method: 'DELETE',
    headers: { 'If-Match': `"${version}"` },
  })
}

/**
 * 공개 프로필 조회. 관리용 `getPet`(내 펫만 허용)과 달리 다른 사람 펫도 조회할 수 있다.
 * 대상이 비공개 상태이거나 양방향 차단이면 서버가 404 PET_NOT_FOUND 로 숨긴다.
 */
export function getPetPublicProfile(petId: number) {
  return apiRequest<PetPublicProfile>(`/pets/${petId}/profile`)
}

/**
 * 공개 태그로 상대 펫을 찾는다. 친구 요청의 진입점이다.
 * 결과 없음/자기 자신/차단 관계는 서버가 404 가 아니라 data: null 로 돌려준다.
 */
export function searchPetByPublicTag(publicTag: string) {
  return apiRequest<PetSearchItem | null>(
    `/pets/search?publicTag=${encodeURIComponent(publicTag)}`,
  )
}

/**
 * 동물등록 정보 조회 + 1회용 적용 토큰 발급.
 * `flowType`으로 기존 펫에 적용할지(petId 필요), 신규 등록과 함께 인증할지를 가른다.
 */
export function issuePetVerification(body: PetVerificationIssueBody) {
  return apiRequest<PetVerificationIssueResult>('/pet-verifications', {
    method: 'POST',
    body,
  })
}

/**
 * 발급받은 토큰을 실제 펫에 적용한다.
 *
 * 이 호출은 Pet 의 닉네임·품종·생일 등을 자동으로 덮어쓰지 않는다 —
 * `verified`/`verifiedAt` 만 갱신된다. 조회 시 받은 petPrefill 이 실제 값과
 * 다르면 사용자가 펫 수정 화면에서 따로 고쳐야 한다.
 */
export function applyPetVerification(petId: number, petVerificationToken: string) {
  return apiRequest<Pet>(`/pets/${petId}/verification`, {
    method: 'POST',
    body: { petVerificationToken },
  })
}
