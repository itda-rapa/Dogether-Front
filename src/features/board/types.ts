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
  version: number
  createdAt: string
  updatedAt: string
}

export type BoardPostFeed = {
  items: BoardPost[]
  page: { nextCursor: string | null; hasNext: boolean }
}

export type BoardPostReaction = {
  postId: number
  type: 'LIKE'
  reacted: boolean
  reactionCount: number
}

export type CreateBoardPostBody = {
  title: string
  content: string
  /** 이미지 업로드 흐름이 연결되기 전에는 생략한다. */
  mediaIds?: number[]
}
