import type { PetSize } from './types'

export type BreedCategory = '순종' | '인기믹스' | '불명'

export type BreedSizeEntry = {
  breed: string
  category: BreedCategory
  minWeight: number | null
  maxWeight: number | null
  avgWeight: number | null
  recommendedSize: PetSize
}

export const MIX_OR_OTHER_BREED = '믹스 · 기타'

/**
 * 같이놀개_견종_크기추천.xlsx 를 그대로 옮긴 더미 데이터.
 * 백엔드 API 계약이 아직 안 나와서 우선 프론트 더미로 둔다.
 * (memory: project_dog_breed_size_recommendation)
 */
export const BREED_SIZE_TABLE: BreedSizeEntry[] = [
  { breed: MIX_OR_OTHER_BREED, category: '불명', minWeight: null, maxWeight: null, avgWeight: null, recommendedSize: null },
  { breed: '치와와', category: '순종', minWeight: 1.5, maxWeight: 3, avgWeight: 2.25, recommendedSize: 'SMALL' },
  { breed: '포메라니안', category: '순종', minWeight: 2, maxWeight: 3, avgWeight: 2.5, recommendedSize: 'SMALL' },
  { breed: '요크셔테리어', category: '순종', minWeight: 2, maxWeight: 3, avgWeight: 2.5, recommendedSize: 'SMALL' },
  { breed: '말티즈', category: '순종', minWeight: 2, maxWeight: 4, avgWeight: 3, recommendedSize: 'SMALL' },
  { breed: '토이푸들', category: '순종', minWeight: 3, maxWeight: 5, avgWeight: 4, recommendedSize: 'SMALL' },
  { breed: '파피용', category: '순종', minWeight: 3, maxWeight: 5, avgWeight: 4, recommendedSize: 'SMALL' },
  { breed: '페키니즈', category: '순종', minWeight: 3, maxWeight: 6, avgWeight: 4.5, recommendedSize: 'SMALL' },
  { breed: '미니어처 핀셔', category: '순종', minWeight: 4, maxWeight: 6, avgWeight: 5, recommendedSize: 'SMALL' },
  { breed: '시츄', category: '순종', minWeight: 4, maxWeight: 7, avgWeight: 5.5, recommendedSize: 'SMALL' },
  { breed: '미니어처 푸들', category: '순종', minWeight: 5, maxWeight: 8, avgWeight: 6.5, recommendedSize: 'SMALL' },
  { breed: '비숑프리제', category: '순종', minWeight: 5, maxWeight: 8, avgWeight: 6.5, recommendedSize: 'SMALL' },
  { breed: '재패니즈 스피츠', category: '순종', minWeight: 5, maxWeight: 8, avgWeight: 6.5, recommendedSize: 'SMALL' },
  { breed: '미니어처 슈나우저', category: '순종', minWeight: 5, maxWeight: 9, avgWeight: 7, recommendedSize: 'SMALL' },
  { breed: '잭러셀테리어', category: '순종', minWeight: 6, maxWeight: 8, avgWeight: 7, recommendedSize: 'SMALL' },
  { breed: '퍼그', category: '순종', minWeight: 6, maxWeight: 8, avgWeight: 7, recommendedSize: 'SMALL' },
  { breed: '화이트테리어', category: '순종', minWeight: 7, maxWeight: 10, avgWeight: 8.5, recommendedSize: 'SMALL' },
  { breed: '보스턴테리어', category: '순종', minWeight: 5, maxWeight: 11, avgWeight: 8, recommendedSize: 'SMALL' },
  { breed: '시바견', category: '순종', minWeight: 8, maxWeight: 11, avgWeight: 9.5, recommendedSize: 'SMALL' },
  { breed: '말티푸', category: '인기믹스', minWeight: 3, maxWeight: 6, avgWeight: 4.5, recommendedSize: 'SMALL' },
  { breed: '폼피츠', category: '인기믹스', minWeight: 3, maxWeight: 7, avgWeight: 5, recommendedSize: 'SMALL' },
  { breed: '시츄푸', category: '인기믹스', minWeight: 4, maxWeight: 8, avgWeight: 6, recommendedSize: 'SMALL' },
  { breed: '코카푸', category: '인기믹스', minWeight: 5, maxWeight: 12, avgWeight: 8.5, recommendedSize: 'SMALL' },
  { breed: '골든두들', category: '인기믹스', minWeight: 20, maxWeight: 45, avgWeight: 32.5, recommendedSize: 'LARGE' },
  { breed: '프렌치 불독', category: '순종', minWeight: 8, maxWeight: 13, avgWeight: 10.5, recommendedSize: 'MEDIUM' },
  { breed: '비글', category: '순종', minWeight: 9, maxWeight: 11, avgWeight: 10, recommendedSize: 'MEDIUM' },
  { breed: '웰시코기 펨브로크', category: '순종', minWeight: 10, maxWeight: 14, avgWeight: 12, recommendedSize: 'MEDIUM' },
  { breed: '코커스패니얼', category: '순종', minWeight: 12, maxWeight: 15, avgWeight: 13.5, recommendedSize: 'MEDIUM' },
  { breed: '웰시코기 카디건', category: '순종', minWeight: 12, maxWeight: 17, avgWeight: 14.5, recommendedSize: 'MEDIUM' },
  { breed: '닥스훈트', category: '순종', minWeight: 7, maxWeight: 15, avgWeight: 11, recommendedSize: 'MEDIUM' },
  { breed: '보더콜리', category: '순종', minWeight: 14, maxWeight: 20, avgWeight: 17, recommendedSize: 'MEDIUM' },
  { breed: '진돗개', category: '순종', minWeight: 15, maxWeight: 23, avgWeight: 19, recommendedSize: 'MEDIUM' },
  { breed: '삽살개', category: '순종', minWeight: 16, maxWeight: 24, avgWeight: 20, recommendedSize: 'MEDIUM' },
  { breed: '시베리안허스키', category: '순종', minWeight: 16, maxWeight: 27, avgWeight: 21.5, recommendedSize: 'MEDIUM' },
  { breed: '사모예드', category: '순종', minWeight: 16, maxWeight: 30, avgWeight: 23, recommendedSize: 'MEDIUM' },
  { breed: '스프링거스패니얼', category: '순종', minWeight: 18, maxWeight: 25, avgWeight: 21.5, recommendedSize: 'MEDIUM' },
  { breed: '스탠다드 푸들', category: '순종', minWeight: 20, maxWeight: 32, avgWeight: 26, recommendedSize: 'LARGE' },
  { breed: '저먼셰퍼드', category: '순종', minWeight: 22, maxWeight: 40, avgWeight: 31, recommendedSize: 'LARGE' },
  { breed: '골든리트리버', category: '순종', minWeight: 25, maxWeight: 34, avgWeight: 29.5, recommendedSize: 'LARGE' },
  { breed: '래브라도리트리버', category: '순종', minWeight: 25, maxWeight: 36, avgWeight: 30.5, recommendedSize: 'LARGE' },
  { breed: '도베르만', category: '순종', minWeight: 30, maxWeight: 45, avgWeight: 37.5, recommendedSize: 'LARGE' },
  { breed: '아키타', category: '순종', minWeight: 32, maxWeight: 45, avgWeight: 38.5, recommendedSize: 'LARGE' },
  { breed: '알래스칸 말라뮤트', category: '순종', minWeight: 34, maxWeight: 39, avgWeight: 36.5, recommendedSize: 'LARGE' },
  { breed: '로트와일러', category: '순종', minWeight: 35, maxWeight: 60, avgWeight: 47.5, recommendedSize: 'LARGE' },
  { breed: '버니즈마운틴독', category: '순종', minWeight: 35, maxWeight: 55, avgWeight: 45, recommendedSize: 'LARGE' },
  { breed: '그레이트피레니즈', category: '순종', minWeight: 40, maxWeight: 55, avgWeight: 47.5, recommendedSize: 'LARGE' },
  { breed: '그레이트데인', category: '순종', minWeight: 50, maxWeight: 90, avgWeight: 70, recommendedSize: 'LARGE' },
  { breed: '세인트버나드', category: '순종', minWeight: 60, maxWeight: 90, avgWeight: 75, recommendedSize: 'LARGE' },
]

/** 몸무게 기준 크기 계산: 10kg 미만 소형, 10~25kg 중형, 25kg 이상 대형. */
export function sizeFromWeight(weightKg: number): PetSize {
  if (weightKg < 10) return 'SMALL'
  if (weightKg < 25) return 'MEDIUM'
  return 'LARGE'
}

/** 목록에 있는 견종과 정확히 일치하는 항목을 찾는다 (믹스·기타, DB에 없는 견종은 undefined). */
export function findBreedEntry(breedName: string): BreedSizeEntry | undefined {
  const normalized = breedName.trim()
  if (!normalized) return undefined
  return BREED_SIZE_TABLE.find((entry) => entry.breed === normalized)
}

/** 부분 일치 검색. 믹스·기타는 항상 최상단에 고정 노출한다. */
export function searchBreeds(query: string): BreedSizeEntry[] {
  const q = query.trim()
  if (!q) return BREED_SIZE_TABLE
  const matches = BREED_SIZE_TABLE.filter((entry) => entry.breed.includes(q))
  const mix = BREED_SIZE_TABLE[0]
  return matches.includes(mix) ? matches : [mix, ...matches]
}
