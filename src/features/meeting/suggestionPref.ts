/**
 * "AI 약속 제안 그만 띄우기." 서버·상대방에는 아무 영향이 없다 — 약속카드 발행
 * 자체는 그대로 되고, 내 화면에 제안 스트립을 띄울지만 정한다. 계약이 없어서
 * 이 브라우저(localStorage)에만 사용자별로 기억해 둔다.
 */

const KEY_PREFIX = 'dogether:meeting-suggestion-off'

function storageKey(userId: number) {
  return `${KEY_PREFIX}:${userId}`
}

export function isMeetingSuggestionOff(userId: number): boolean {
  return localStorage.getItem(storageKey(userId)) === '1'
}

export function setMeetingSuggestionOff(userId: number, off: boolean): void {
  if (off) localStorage.setItem(storageKey(userId), '1')
  else localStorage.removeItem(storageKey(userId))
}
