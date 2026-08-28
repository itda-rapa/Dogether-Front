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

export function keywordFromPlaceType(placeType: CulturalFacilityCategory | null): PlaceKeyword | null {
  return (Object.entries(FACILITY_KEYWORDS) as [PlaceKeyword, CulturalFacilityCategory][])
    .find(([, category]) => category === placeType)?.[0] ?? null
}

export function placeTypeFromKeyword(keyword: PlaceKeyword): CulturalFacilityCategory {
  return FACILITY_KEYWORDS[keyword]
}

/**
 * 장소 키워드가 담긴 메시지의 동의 흐름을 새로고침 너머로 기억해 둔다.
 * OPEN·DIRECT 채팅 둘 다 같은 키 형식을 쓴다.
 */
export function placeConsentStorageKey(roomId: number, activePetId: number) {
  return `chat:map-consent:${roomId}:pet:${activePetId}`
}
