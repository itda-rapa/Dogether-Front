/**
 * 네이버 지역검색 API 연동 전까지 쓰는 임시 데이터.
 * 백엔드 계약(REST vs Kafka 푸시 등)이 아직 안 정해져서, 실제 연동 시
 * 이 파일과 아래를 참조하는 화면들을 다시 맞출 것 — 지금은 자리만 채운다.
 */

export const PLACE_CATEGORIES = ['약국', '병원', '카페', '호텔'] as const
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]

export type PlaceholderPlace = {
  id: number
  name: string
  category: PlaceCategory
  address: string
  distance: string
  hours: string
  phone: string
}

export const PLACEHOLDER_PLACES: PlaceholderPlace[] = [
  {
    id: 1,
    name: '시흥동물병원',
    category: '병원',
    address: '경기 성남시 수정구 시흥동 12-3',
    distance: '320m',
    hours: '09:00 - 19:00',
    phone: '031-000-0000',
  },
  {
    id: 2,
    name: '멍멍약국',
    category: '약국',
    address: '경기 성남시 수정구 시흥동 45-1',
    distance: '540m',
    hours: '09:00 - 21:00',
    phone: '031-000-0001',
  },
  {
    id: 3,
    name: '펫프렌들리 카페',
    category: '카페',
    address: '경기 성남시 수정구 금토동 8',
    distance: '1.2km',
    hours: '10:00 - 20:00',
    phone: '031-000-0002',
  },
]

export function findPlaceholderPlace(id: number): PlaceholderPlace | undefined {
  return PLACEHOLDER_PLACES.find((p) => p.id === id)
}
