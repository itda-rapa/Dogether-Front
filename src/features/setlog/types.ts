import type { PetSearchItem } from '@/features/chat/types'

/** 04_M1_OpenAPI.yaml 의 Setlog 스키마. */

export const REACTION_TYPES = ['CUTE', 'LIKE'] as const
export type ReactionType = (typeof REACTION_TYPES)[number]

/** CUTE 와 LIKE 는 동시에 존재할 수 있다. 라디오가 아니라 각각 토글이다. */
export const REACTION_LABEL: Record<ReactionType, string> = {
  CUTE: '귀여워요',
  LIKE: '좋아요',
}

/** GET /setlogs 응답. 커서 페이지네이션이지만 M1 은 시드 3건이라 사실상 한 페이지다. */
export type SetlogListResult = {
  items: Setlog[]
  nextCursor: string | null
  hasNext: boolean
}

export type Setlog = {
  setlogId: number
  authorPet: PetSearchItem
  /** 비공개 S3 객체 재생용 Presigned GET URL */
  mediaUrl: string
  /** 만료되면 GET /setlogs 를 다시 호출해 URL 을 갱신해야 한다. */
  mediaUrlExpiresAt: string
  caption: string | null
  cuteCount: number
  likeCount: number
  myReactions: ReactionType[]
  /** L2 이고, 자기 소유가 아니고, 차단 관계가 아닐 때만 true */
  canInteract?: boolean
  createdAt: string
}

/** POST /setlogs/uploads 응답. objectKey 는 표시용이 아니라 서버 대응용이다. */
export type SetlogUploadSession = {
  uploadId: string
  uploadUrl: string
  objectKey: string
  /** 스토리지 PUT 에 그대로 실어야 하는 서명 헤더. 빠뜨리면 서명이 어긋난다. */
  headers: Record<string, string>
  expiresAt: string
}

export type SetlogUploadStage = 'initializing' | 'uploading' | 'completing'

export type SetlogUploadProgress = {
  stage: SetlogUploadStage
  uploadedBytes: number
  totalBytes: number
}

/** PUT·DELETE /setlogs/{id}/reactions/{type} 응답 */
export type SetlogReaction = {
  setlogId: number
  type: ReactionType
  reacted: boolean
  cuteCount: number
  likeCount: number
}

/**
 * POST /setlogs/{id}/greetings 응답.
 *
 * 인사에는 유효기간(expiresAt, 24시간)이 있다. 그 안에 상대가 답하지 않으면
 * 어떻게 되는지는 서버 정책이며 프론트는 roomId 로 방에 들어가기만 한다.
 */
export type Greeting = {
  greetingId: number
  roomId: number
  status: string
  /** 서버가 대신 저장한 고정 문구. 클라이언트가 정하지 않는다. */
  fixedMessage: string
  expiresAt: string
  createdAt: string
}

/**
 * Presigned URL 만료 임박 여부.
 * 재생 직전에 확인해 만료됐으면 목록을 다시 받는다.
 */
export function isMediaExpired(setlog: Setlog, skewMs = 30_000) {
  const t = new Date(setlog.mediaUrlExpiresAt).getTime()
  if (Number.isNaN(t)) return false
  return t - skewMs <= Date.now()
}

/** 낙관적 갱신용. 서버 응답이 오면 그 값으로 덮어쓴다. */
export function applyReaction(
  setlog: Setlog,
  type: ReactionType,
  reacted: boolean,
): Setlog {
  const myReactions = reacted
    ? Array.from(new Set([...setlog.myReactions, type]))
    : setlog.myReactions.filter((r) => r !== type)

  const delta = reacted ? 1 : -1
  return {
    ...setlog,
    myReactions,
    cuteCount:
      type === 'CUTE'
        ? Math.max(0, setlog.cuteCount + delta)
        : setlog.cuteCount,
    likeCount:
      type === 'LIKE'
        ? Math.max(0, setlog.likeCount + delta)
        : setlog.likeCount,
  }
}
