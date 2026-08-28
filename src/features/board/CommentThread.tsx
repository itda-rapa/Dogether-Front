import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChatCircleDots, HandHeart, PencilSimple, Trash } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/auth-context'
import {
  addBoardPostCommentHelpful,
  createBoardPostCommentReply,
  deleteBoardPostComment,
  ensureDirectRoomFromComment,
  removeBoardPostCommentHelpful,
  updateBoardPostComment,
} from './api'
import type { BoardPostComment } from './types'
import { formatBoardPostTime } from './format'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

const MAX_DEPTH = 3

export function CommentThread({
  postId,
  comment,
  postAuthorPetId,
}: {
  postId: number
  comment: BoardPostComment
  postAuthorPetId: number
}) {
  const { me } = useAuth()
  const myPetId = me?.activePetId ?? null
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['board-post-comments', postId] })

  const helpful = useMutation({
    mutationFn: () =>
      comment.helpfulByMe
        ? removeBoardPostCommentHelpful(comment.commentId)
        : addBoardPostCommentHelpful(comment.commentId),
    onSuccess: invalidate,
    onError: (e) =>
      setError(
        e instanceof ApiError && e.status === 403
          ? '본인 콘텐츠에는 반응할 수 없습니다.'
          : '반응을 변경하지 못했습니다.',
      ),
  })

  const remove = useMutation({
    mutationFn: () => deleteBoardPostComment(comment.commentId),
    onSuccess: invalidate,
    onError: () => setError('댓글을 삭제하지 못했습니다.'),
  })

  const chat = useMutation({
    mutationFn: () => ensureDirectRoomFromComment(postId, comment.commentId),
    onSuccess: (result) => navigate(`/chat/${result.roomId}`),
    onError: (e) =>
      setError(e instanceof ApiError && e.status === 404 ? '채팅을 시작할 수 없습니다.' : '채팅방을 열지 못했습니다.'),
  })

  if (comment.deleted) {
    return (
      <div>
        <p className="py-2 text-[14px] text-muted-foreground">삭제된 댓글입니다.</p>
        {comment.replies.length > 0 && (
          <ul className="ml-4 flex flex-col gap-2 border-l border-border pl-4">
            {comment.replies.map((reply) => (
              <li key={reply.commentId}>
                <CommentThread postId={postId} comment={reply} postAuthorPetId={postAuthorPetId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const mine = myPetId !== null && comment.authorPet?.petId === myPetId
  const isRoot = comment.depth === 0
  // 게시글 작성자가 남의 Root 댓글에, 또는 내가 쓴 Root 댓글에서 작성자에게.
  const canChat =
    isRoot &&
    myPetId !== null &&
    comment.authorPet !== null &&
    postAuthorPetId !== comment.authorPet.petId &&
    (myPetId === postAuthorPetId || myPetId === comment.authorPet.petId)

  return (
    <div>
      <div className="flex items-start gap-2">
        {comment.authorPet?.profileUrl ? (
          <img src={comment.authorPet.profileUrl} alt="" className="mt-0.5 size-7 shrink-0 rounded-full object-cover" />
        ) : (
          <div aria-hidden className="mt-0.5 size-7 shrink-0 rounded-full bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px]">
            <span className="font-medium">{comment.authorPet?.nickname ?? '알 수 없음'}</span>
            <time className="text-muted-foreground">
              {comment.createdAt ? formatBoardPostTime(comment.createdAt) : ''}
            </time>
          </p>

          {editing ? (
            <EditForm
              initial={comment.content ?? ''}
              onCancel={() => setEditing(false)}
              onSave={async (content) => {
                await updateBoardPostComment(comment.commentId, content)
                setEditing(false)
                invalidate()
              }}
            />
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap text-[14px]">{comment.content}</p>
          )}

          <div className="mt-1 flex items-center gap-3 text-[13px] text-muted-foreground">
            <button
              type="button"
              aria-pressed={comment.helpfulByMe ?? false}
              onClick={() => helpful.mutate()}
              disabled={helpful.isPending || myPetId === null || mine}
              className={cn(
                'inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 transition-colors hover:bg-primary-subtle disabled:opacity-40',
                comment.helpfulByMe && 'text-primary-strong',
              )}
            >
              <HandHeart size={16} weight={comment.helpfulByMe ? 'fill' : 'regular'} />
              도움돼요 {comment.helpfulCount ?? 0}
            </button>

            {comment.depth < MAX_DEPTH && (
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                className="min-h-8 rounded-lg px-1.5 transition-colors hover:bg-primary-subtle"
              >
                답글
              </button>
            )}

            {canChat && (
              <button
                type="button"
                onClick={() => chat.mutate()}
                disabled={chat.isPending}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 transition-colors hover:bg-primary-subtle disabled:opacity-50"
              >
                <ChatCircleDots size={16} />
                채팅하기
              </button>
            )}

            {mine && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 transition-colors hover:bg-primary-subtle"
                >
                  <PencilSimple size={16} />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('댓글을 삭제하시겠습니까?')) remove.mutate()
                  }}
                  disabled={remove.isPending}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-destructive transition-colors hover:bg-primary-subtle disabled:opacity-50"
                >
                  <Trash size={16} />
                  삭제
                </button>
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-1 text-[13px] text-destructive">
              {error}
            </p>
          )}

          {replying && (
            <ReplyForm
              onCancel={() => setReplying(false)}
              onSubmit={async (content) => {
                await createBoardPostCommentReply(comment.commentId, content)
                setReplying(false)
                invalidate()
              }}
            />
          )}
        </div>
      </div>

      {comment.replies.length > 0 && (
        <ul className="ml-9 mt-2 flex flex-col gap-2 border-l border-border pl-4">
          {comment.replies.map((reply) => (
            <li key={reply.commentId}>
              <CommentThread postId={postId} comment={reply} postAuthorPetId={postAuthorPetId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReplyForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (content: string) => Promise<void>
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const content = value.trim()
    if (!content) return
    setPending(true)
    setError(null)
    try {
      await onSubmit(content)
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'COMMENT_DEPTH_EXCEEDED' ? '더 이상 답글을 달 수 없습니다.' : '답글을 등록하지 못했습니다.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <textarea
        aria-label="답글 입력"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={1000}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
      />
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || value.trim() === ''}
          className="min-h-8 rounded-lg bg-primary px-3 text-[13px] font-medium text-on-primary disabled:opacity-50"
        >
          {pending ? '등록 중…' : '등록'}
        </button>
        <button type="button" onClick={onCancel} className="min-h-8 rounded-lg px-3 text-[13px] text-muted-foreground">
          취소
        </button>
      </div>
    </div>
  )
}

function EditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (content: string) => Promise<void>
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <textarea
        aria-label="댓글 수정"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={1000}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
      />
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || value.trim() === ''}
          onClick={async () => {
            setPending(true)
            setError(null)
            try {
              await onSave(value.trim())
            } catch {
              setError('댓글을 수정하지 못했습니다.')
            } finally {
              setPending(false)
            }
          }}
          className="min-h-8 rounded-lg bg-primary px-3 text-[13px] font-medium text-on-primary disabled:opacity-50"
        >
          저장
        </button>
        <button type="button" onClick={onCancel} className="min-h-8 rounded-lg px-3 text-[13px] text-muted-foreground">
          취소
        </button>
      </div>
    </div>
  )
}
