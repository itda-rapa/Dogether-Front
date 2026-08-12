/**
 * "이 영상만 내 피드에서 숨기기." 차단·신고와 달리 작성자·서버에는 아무 영향이
 * 없다 — 계약도 없어서 이 브라우저(localStorage)에만 사용자별로 기억해 둔다.
 */

const HIDDEN_KEY_PREFIX = 'dogether:hidden-setlogs'

function storageKey(userId: number) {
  return `${HIDDEN_KEY_PREFIX}:${userId}`
}

function readHidden(userId: number): number[] {
  const raw = localStorage.getItem(storageKey(userId))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isSetlogHidden(userId: number, setlogId: number): boolean {
  return readHidden(userId).includes(setlogId)
}

export function hideSetlog(userId: number, setlogId: number): void {
  const hidden = new Set(readHidden(userId))
  hidden.add(setlogId)
  localStorage.setItem(storageKey(userId), JSON.stringify([...hidden]))
}

export function listHiddenSetlogIds(userId: number): number[] {
  return readHidden(userId)
}

export function unhideSetlog(userId: number, setlogId: number): void {
  const hidden = new Set(readHidden(userId))
  hidden.delete(setlogId)
  localStorage.setItem(storageKey(userId), JSON.stringify([...hidden]))
}
