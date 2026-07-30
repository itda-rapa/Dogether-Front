import { apiRequest } from '@/lib/api'
import type { PetSearchItem } from '@/features/chat/types'

export type FriendRequest = {
  requestId: number
  fromPet: PetSearchItem
  toPet: PetSearchItem
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED'
  createdAt: string
}

export type FriendRequestListResult = {
  items: FriendRequest[]
  page: { nextCursor: string | null; hasNext: boolean }
}

export function sendFriendRequest(toPetId: number) {
  return apiRequest<FriendRequest>('/friend-requests', {
    method: 'POST',
    body: { toPetId },
  })
}

export function listReceivedRequests() {
  return apiRequest<FriendRequestListResult>('/friend-requests/received')
}

export function listSentRequests() {
  return apiRequest<FriendRequestListResult>('/friend-requests/sent')
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

export function listFriends(petId: number) {
  return apiRequest<PetSearchItem[]>(`/pets/${petId}/friends`)
}

/** 친구 삭제. 차단과 달리 되돌릴 수 있으므로 확인 문구를 가볍게 둔다. */
export function removeFriend(petId: number, friendPetId: number) {
  return apiRequest<void>(`/pets/${petId}/friends/${friendPetId}`, {
    method: 'DELETE',
  })
}
