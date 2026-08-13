import { apiRequest } from '@/lib/api'
import type {
  Board,
  BoardPost,
  BoardPostFeed,
  BoardPostReaction,
  CreateBoardPostBody,
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

export function addBoardPostLike(postId: number) {
  return apiRequest<BoardPostReaction>(`/posts/${postId}/reactions/LIKE`, {
    method: 'PUT',
  })
}

export function removeBoardPostLike(postId: number) {
  return apiRequest<BoardPostReaction>(`/posts/${postId}/reactions/LIKE`, {
    method: 'DELETE',
  })
}
