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
