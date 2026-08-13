import { apiRequest } from '@/lib/api'
import type { PetSearchItem } from '@/features/chat/types'

export type FriendRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELED'
  | 'EXPIRED'

export type FriendRequest = {
  requestId: number
  requesterPet: PetSearchItem
  targetPet: PetSearchItem
  status: FriendRequestStatus
  requestedAt: string
  respondedAt: string | null
  expiresAt: string
  /** 수락되면 물려주는 DIRECT 방. 요청의 전제조건이 아니라 결과다. */
  directRoomId: number | null
}

/** 백엔드 `CursorPage`. 친구 목록·요청 목록이 모두 이 형태로 감싸여 온다. */
export type CursorPage = { nextCursor: string | null; hasNext: boolean }

export type Paged<T> = { items: T[]; page: CursorPage }

function withCursor(path: string, cursor?: string | null, limit?: number) {
  const q = new URLSearchParams()
  if (cursor) q.set('cursor', cursor)
  if (limit) q.set('limit', String(limit))
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

export function sendFriendRequest(targetPetId: number) {
  return apiRequest<FriendRequest>('/friend-requests', {
    method: 'POST',
    body: { targetPetId },
  })
}

export function listReceivedRequests(cursor?: string | null) {
  return apiRequest<Paged<FriendRequest>>(
    withCursor('/friend-requests/received', cursor),
  )
}

export function listSentRequests(cursor?: string | null) {
  return apiRequest<Paged<FriendRequest>>(
    withCursor('/friend-requests/sent', cursor),
  )
}

export function acceptFriendRequest(requestId: number) {
  return apiRequest<FriendRequest>(`/friend-requests/${requestId}/accept`, {
    method: 'POST',
  })
}

export function rejectFriendRequest(requestId: number) {
  return apiRequest<FriendRequest>(`/friend-requests/${requestId}/reject`, {
    method: 'POST',
  })
}

/** 내가 보낸 대기중 요청 취소. */
export function cancelFriendRequest(requestId: number) {
  return apiRequest<void>(`/friend-requests/${requestId}`, { method: 'DELETE' })
}

export function listFriends(
  petId: number,
  cursor?: string | null,
  limit?: number,
) {
  return apiRequest<Paged<PetSearchItem>>(
    withCursor(`/pets/${petId}/friends`, cursor, limit),
  )
}

/*
  친구 삭제(`DELETE /pets/{petId}/friends/{friendPetId}`)는 두지 않는다.
  origin/dev 의 PetFriendController 에는 @GetMapping 하나뿐이라 호출하면 404 다.
  BE-3 가 엔드포인트를 열면 그때 추가할 것. (2026-07-31 확인)
*/
