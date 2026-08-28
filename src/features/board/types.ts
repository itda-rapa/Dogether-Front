/** 게시판 API 계약: GET /boards, GET·POST /boards/{boardId}/posts. */
export type Board = {
  boardId: number
  name: string
  version: number
}

export type BoardPostAuthorPet = {
  petId: number
  publicTag: string
  nickname: string
  profileUrl: string | null
  verified: boolean
}

export type BoardPostImage = {
  mediaId: number
  url: string
  displayOrder: number
}

export type BoardPost = {
  postId: number
  boardId: number
  authorPet: BoardPostAuthorPet
  title: string
  content: string
  images: BoardPostImage[]
  reactionCount: number
  reactedByMe: boolean
  /** HELPFUL 은 LIKE 와 별개 집계다. 둘 다 동시에 누를 수 있다. */
  helpfulCount: number
  helpfulByMe: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export type BoardPostFeed = {
  items: BoardPost[]
  page: { nextCursor: string | null; hasNext: boolean }
}

export type BoardPostReactionType = 'LIKE' | 'HELPFUL'

export type BoardPostReaction = {
  postId: number
  type: BoardPostReactionType
  reacted: boolean
  reactionCount: number
}

export type CreateBoardPostBody = {
  title: string
  content: string
  /** 이미지 업로드 흐름이 연결되기 전에는 생략한다. */
  mediaIds?: number[]
}

/**
 * PATCH /posts/{postId}. strict JSON — 이 네 필드만 허용한다.
 * `version` 은 필수(낙관적 동시성), 나머지 셋 중 하나 이상이 필요하다.
 * `mediaIds` 생략은 기존 이미지 유지, `[]` 는 전체 제거, 값 배열은 순서대로 전체 교체다.
 */
export type UpdateBoardPostBody = {
  title?: string
  content?: string
  mediaIds?: number[]
  version: number
}

/**
 * 댓글·대댓글. 계약 원본: dogether(백엔드) docs/spec/M3/02_M3_API_계약.md §3.
 * 최대 3-depth(depth 0~3). soft delete·차단 subtree 는 `deleted=true` 이고
 * 나머지 필드는 tombstone 으로 null 이지만 `replies` 는 계속 내려온다.
 */
export type BoardPostComment = {
  commentId: number
  postId: number
  parentCommentId: number | null
  depth: number
  deleted: boolean
  authorPet: BoardPostAuthorPet | null
  content: string | null
  version: number | null
  createdAt: string | null
  updatedAt: string | null
  helpfulCount: number | null
  helpfulByMe: boolean | null
  replies: BoardPostComment[]
}

export type CommentCursorPage = { nextCursor: string | null; hasNext: boolean }

/** GET /posts/{postId}/comments 응답. size 는 댓글 행 수가 아니라 Root thread 수다. */
export type BoardPostCommentListResult = {
  items: BoardPostComment[]
  page: CommentCursorPage
}

/**
 * POST(생성)·PATCH(수정) 응답. 트리 조회용 CommentTreeResponse 와 달리
 * helpfulCount/helpfulByMe 를 포함하지 않는다 — 방금 쓴 댓글은 반응이 없다.
 */
export type BoardPostCommentMutation = {
  commentId: number
  postId: number
  parentCommentId: number | null
  depth: number
  authorPet: BoardPostAuthorPet
  content: string
  version: number
  createdAt: string
  updatedAt: string
}

export type CommentReaction = {
  commentId: number
  type: 'HELPFUL'
  reacted: boolean
  reactionCount: number
}

/** POST /posts/{postId}/comments/{commentId}/direct-room 응답. */
export type EnsureDirectRoomResult = {
  roomId: number
  isNew: boolean
}
