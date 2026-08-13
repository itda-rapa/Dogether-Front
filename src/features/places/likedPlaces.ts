/**
 * 지도에서 누른 하트. 서버에 저장할 계약(POST /me/places 등)이 아직 없어서
 * hiddenSetlogs 와 같은 패턴으로 이 브라우저(localStorage)에만 사용자별로 둔다.
 */

const LIKED_KEY_PREFIX = 'dogether:liked-places'

function storageKey(userId: number) {
  return `${LIKED_KEY_PREFIX}:${userId}`
}

function readLiked(userId: number): number[] {
  const raw = localStorage.getItem(storageKey(userId))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isPlaceLiked(userId: number, placeId: number): boolean {
  return readLiked(userId).includes(placeId)
}

export function listLikedPlaceIds(userId: number): number[] {
  return readLiked(userId)
}

export function setPlaceLiked(userId: number, placeId: number, liked: boolean): void {
  const ids = new Set(readLiked(userId))
  if (liked) ids.add(placeId)
  else ids.delete(placeId)
  localStorage.setItem(storageKey(userId), JSON.stringify([...ids]))
}
