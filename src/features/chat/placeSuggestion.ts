import type { CulturalFacilityCategory } from '@/features/map/types'

export const FACILITY_KEYWORDS = {
  동물병원: 'HOSPITAL', 동물약국: 'PHARMACY', 문예회관: 'ART_CENTER',
  미술관: 'ART_GALLERY', 미용: 'BEAUTY', 박물관: 'MUSEUM',
  반려동물용품: 'SHOP', 식당: 'RESTAURANT', 여행지: 'TOUR_SPOT',
  위탁관리: 'OUTSOURCE', 카페: 'CAFE', 펜션: 'RENTAL_HOUSE', 호텔: 'HOTEL',
} as const satisfies Record<string, CulturalFacilityCategory>

export type PlaceKeyword = keyof typeof FACILITY_KEYWORDS

export function detectPlaceKeyword(body: string): PlaceKeyword | null {
  return (Object.keys(FACILITY_KEYWORDS) as PlaceKeyword[]).find((keyword) => body.includes(keyword)) ?? null
}

/** 1:1 채팅의 기존 지도 이동 기능은 의료 시설만 유지한다. */
export function detectMedicalPlaceKeyword(body: string): PlaceKeyword | null {
  return (['동물병원', '동물약국'] as PlaceKeyword[]).find((keyword) => body.includes(keyword)) ?? null
}

export function keywordFromPlaceType(placeType: CulturalFacilityCategory | null): PlaceKeyword | null {
  return (Object.entries(FACILITY_KEYWORDS) as [PlaceKeyword, CulturalFacilityCategory][])
    .find(([, category]) => category === placeType)?.[0] ?? null
}

export function placeTypeFromKeyword(keyword: PlaceKeyword): CulturalFacilityCategory {
  return FACILITY_KEYWORDS[keyword]
}

const COOLDOWN_KEY_PREFIX = 'dogether:facility-map-dismissed'
const COOLDOWN_MS = 3 * 60 * 60 * 1000
function cooldownKey(roomId: number, userId: number, category: CulturalFacilityCategory) {
  return `${COOLDOWN_KEY_PREFIX}:${roomId}:${userId}:${category}`
}

export function isPlaceSuggestionSuppressed(roomId: number, userId: number, category: CulturalFacilityCategory, now = Date.now()) {
  const dismissedAt = Number(localStorage.getItem(cooldownKey(roomId, userId, category)))
  return Number.isFinite(dismissedAt) && dismissedAt > 0 && now - dismissedAt < COOLDOWN_MS
}

export function suppressPlaceSuggestion(roomId: number, userId: number, category: CulturalFacilityCategory, now = Date.now()) {
  localStorage.setItem(cooldownKey(roomId, userId, category), String(now))
}
