import { apiRequest } from '@/lib/api'
import type {
  Board,
  BoardPost,
  BoardPostCommentListResult,
  BoardPostCommentMutation,
  BoardPostFeed,
  BoardPostReaction,
  BoardPostReactionType,
  CommentReaction,
  CreateBoardPostBody,
  EnsureDirectRoomResult,
  UpdateBoardPostBody,
} from './types'

export function listBoards() {
  return apiRequest<Board[]>('/boards')
}

/** 관리자 전용. 게시판 이름은 30자 이내, 서버가 중복 이름을 409 BOARD_NAME_DUPLICATED로 거절한다. */
export function createBoard(name: string) {
  return apiRequest<Board>('/admin/boards', { method: 'POST', body: { name } })
}

/**
 * 관리자 전용. strict PATCH — name·version 둘 다 필수다.
 * version이 최신이 아니면 409 CONCURRENT_UPDATE_CONFLICT.
 */
export function updateBoard(boardId: number, body: { name: string; version: number }) {
  return apiRequest<Board>(`/admin/boards/${boardId}`, { method: 'PATCH', body })
}

/** 관리자 전용. 게시글이 하나라도 있는 게시판은 409 BOARD_NOT_EMPTY로 거절된다. */
export function deleteBoard(boardId: number) {
  return apiRequest<void>(`/admin/boards/${boardId}`, { method: 'DELETE' })
}

export function listBoardPosts(
  boardId: number,
  params: { cursor?: string; size?: number } = {},
) {
  const query = new URLSearchParams()
  if (params.cursor) query.set('cursor', params.cursor)
  if (params.size) query.set('size', String(params.size))
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<BoardPostFeed>(`/boards/${boardId}/posts${suffix}`)
}

export function getBoardPost(postId: number) {
  return apiRequest<BoardPost>(`/posts/${postId}`)
}

export function createBoardPost(boardId: number, body: CreateBoardPostBody) {
  return apiRequest<BoardPost>(`/boards/${boardId}/posts`, { method: 'POST', body })
}

/**
 * 게시글 부분 수정. `version` 이 최신이 아니면 409 CONCURRENT_UPDATE_CONFLICT —
 * 호출부가 상세를 다시 불러와 최신 version 으로 재시도해야 한다.
 */
export function updateBoardPost(postId: number, body: UpdateBoardPostBody) {
  return apiRequest<BoardPost>(`/posts/${postId}`, { method: 'PATCH', body })
}

/** 게시글 soft delete. 되돌릴 수 없으므로 UI 에서 반드시 확인을 받는다. */
export function deleteBoardPost(postId: number) {
  return apiRequest<void>(`/posts/${postId}`, { method: 'DELETE' })
}

export function addBoardPostReaction(postId: number, type: BoardPostReactionType) {
  return apiRequest<BoardPostReaction>(`/posts/${postId}/reactions/${type}`, {
    method: 'PUT',
  })
}

export function removeBoardPostReaction(postId: number, type: BoardPostReactionType) {
  return apiRequest<BoardPostReaction>(`/posts/${postId}/reactions/${type}`, {
    method: 'DELETE',
  })
}

export function addBoardPostLike(postId: number) {
  return addBoardPostReaction(postId, 'LIKE')
}

export function removeBoardPostLike(postId: number) {
  return removeBoardPostReaction(postId, 'LIKE')
}

/** Root cursor 기반 중첩 댓글 목록. size 는 Root thread 수 기준(기본 20, 최대 100). */
export function listBoardPostComments(
  postId: number,
  params: { cursor?: string; size?: number } = {},
) {
  const query = new URLSearchParams()
  if (params.cursor) query.set('cursor', params.cursor)
  if (params.size) query.set('size', String(params.size))
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<BoardPostCommentListResult>(`/posts/${postId}/comments${suffix}`)
}

/** Root 댓글 생성. strict body — content 만 허용한다. */
export function createBoardPostComment(postId: number, content: string) {
  return apiRequest<BoardPostCommentMutation>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { content },
  })
}

/** 대댓글 생성. 부모가 depth 3이면 409 COMMENT_DEPTH_EXCEEDED. */
export function createBoardPostCommentReply(parentCommentId: number, content: string) {
  return apiRequest<BoardPostCommentMutation>(`/comments/${parentCommentId}/replies`, {
    method: 'POST',
    body: { content },
  })
}

export function updateBoardPostComment(commentId: number, content: string) {
  return apiRequest<BoardPostCommentMutation>(`/comments/${commentId}`, {
    method: 'PATCH',
    body: { content },
  })
}

/** soft delete. 본인 댓글만 가능하다. */
export function deleteBoardPostComment(commentId: number) {
  return apiRequest<void>(`/comments/${commentId}`, { method: 'DELETE' })
}

/** 댓글·대댓글 HELPFUL 표시. LIKE 는 댓글에서 지원하지 않는다. */
export function addBoardPostCommentHelpful(commentId: number) {
  return apiRequest<CommentReaction>(`/comments/${commentId}/reactions/HELPFUL`, {
    method: 'PUT',
  })
}

export function removeBoardPostCommentHelpful(commentId: number) {
  return apiRequest<CommentReaction>(`/comments/${commentId}/reactions/HELPFUL`, {
    method: 'DELETE',
  })
}

/**
 * 게시글 작성 Pet과 Root 댓글 작성 Pet 사이 DIRECT 채팅방을 조회·생성한다.
 * 호출자의 Active Pet 이 둘 중 하나여야 한다. Reply(depth>0)는 대상이 될 수 없다.
 */
export function ensureDirectRoomFromComment(postId: number, commentId: number) {
  return apiRequest<EnsureDirectRoomResult>(
    `/posts/${postId}/comments/${commentId}/direct-room`,
    { method: 'POST' },
  )
}
