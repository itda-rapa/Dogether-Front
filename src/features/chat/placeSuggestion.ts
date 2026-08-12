/**
 * 병원/약국 키워드 감지와 방·사용자별 쿨다운.
 *
 * docs 의 M2 흐름 설계 B-2 는 "진짜 병원을 찾는 건가?"를 AI 서버가 판정하게
 * 하지만, 그 백엔드 계약(요청/응답 형태)이 아직 없다. 계약이 나올 때까지는
 * 키워드 일치만으로 판단하고, 오탐은 B-6 쿨다운으로 완화한다.
 */

export type PlaceKeyword = '병원' | '약국'

const KEYWORDS: PlaceKeyword[] = ['병원', '약국']

export function detectPlaceKeyword(body: string): PlaceKeyword | null {
  return KEYWORDS.find((k) => body.includes(k)) ?? null
}

const COOLDOWN_KEY_PREFIX = 'dogether:place-suggestion-dismissed'
/** 팝업을 닫으면 이 시간 동안 같은 방·같은 사용자에게 다시 띄우지 않는다. 기획 확정 전 임시값. */
const COOLDOWN_MS = 3 * 60 * 60 * 1000

function cooldownKey(roomId: number, userId: number) {
  return `${COOLDOWN_KEY_PREFIX}:${roomId}:${userId}`
}

export function isPlaceSuggestionSuppressed(
  roomId: number,
  userId: number,
  now = Date.now(),
) {
  const raw = localStorage.getItem(cooldownKey(roomId, userId))
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return now - dismissedAt < COOLDOWN_MS
}

export function suppressPlaceSuggestion(
  roomId: number,
  userId: number,
  now = Date.now(),
) {
  localStorage.setItem(cooldownKey(roomId, userId), String(now))
}
