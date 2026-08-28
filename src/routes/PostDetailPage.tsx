import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, HandHeart, PencilSimple, SealCheck, Trash } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/auth-context'
import {
  addBoardPostReaction,
  createBoardPostComment,
  deleteBoardPost,
  getBoardPost,
  listBoardPostComments,
  listBoards,
  removeBoardPostReaction,
} from '@/features/board/api'
import { CommentThread } from '@/features/board/CommentThread'
import { formatBoardPostTime } from '@/features/board/format'
import type { BoardPost, BoardPostReactionType } from '@/features/board/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

export function PostDetailPage() {
  const { postId = '' } = useParams()
  const id = Number(postId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { me } = useAuth()
  /** 내 활성 펫. /me 가 아직 안 왔거나 실패했으면 null 이다 — 소유 판단을 미룬다. */
  const myPetId = me?.activePetId ?? null
  const post = useQuery({ queryKey: ['board-post', id], queryFn: () => getBoardPost(id), enabled: Number.isSafeInteger(id) && id > 0, retry: false })
  const boards = useQuery({ queryKey: ['boards'], queryFn: listBoards, retry: false })
  const comments = useQuery({
    queryKey: ['board-post-comments', id],
    queryFn: () => listBoardPostComments(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    retry: false,
  })

  const react = useMutation({
    mutationFn: ({ type, active }: { type: BoardPostReactionType; active: boolean }) =>
      active ? removeBoardPostReaction(id, type) : addBoardPostReaction(id, type),
    onSuccess: (result) =>
      queryClient.setQueryData<BoardPost>(['board-post', id], (current) =>
        current
          ? result.type === 'LIKE'
            ? { ...current, reactedByMe: result.reacted, reactionCount: result.reactionCount }
            : { ...current, helpfulByMe: result.reacted, helpfulCount: result.reactionCount }
          : current,
      ),
  })

  const [deleteError, setDeleteError] = useState<string | null>(null)
  const removePost = useMutation({
    mutationFn: () => deleteBoardPost(id),
    onSuccess: () => navigate('/board'),
    onError: () => setDeleteError('게시글을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
  })

  const [commentDraft, setCommentDraft] = useState('')
  const createComment = useMutation({
    mutationFn: (content: string) => createBoardPostComment(id, content),
    onSuccess: () => {
      setCommentDraft('')
      void queryClient.invalidateQueries({ queryKey: ['board-post-comments', id] })
    },
  })

  if (!Number.isSafeInteger(id) || id <= 0) return <div className="mx-auto w-full max-w-3xl px-4 py-6"><BackLink to="/board" label="게시판" /><div className="mt-6"><EmptyState title="존재하지 않는 게시글입니다" /></div></div>
  const boardName = boards.data?.find((board) => board.boardId === post.data?.boardId)?.name ?? '게시판'
  const mine = myPetId !== null && post.data?.authorPet.petId === myPetId

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/board" label="게시판" />
      {post.isPending && <p className="mt-6 text-muted-foreground">게시글을 불러오는 중…</p>}
      {post.isError && <div className="mt-6"><ApiErrorNotice error={post.error} title="게시글을 불러오지 못했습니다" onRetry={() => void post.refetch()} /></div>}
      {post.data && (
        <article className="mt-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-primary-strong">{boardName}</p>
            {mine && (
              <div className="flex shrink-0 gap-1">
                <Link
                  to={`/board/${id}/edit`}
                  aria-label="게시글 수정"
                  className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-subtle"
                >
                  <PencilSimple size={18} />
                </Link>
                <button
                  type="button"
                  aria-label="게시글 삭제"
                  disabled={removePost.isPending}
                  onClick={() => {
                    if (confirm('게시글을 삭제하시겠습니까? 되돌릴 수 없습니다.')) removePost.mutate()
                  }}
                  className="grid size-9 place-items-center rounded-lg text-destructive transition-colors hover:bg-primary-subtle disabled:opacity-50"
                >
                  <Trash size={18} />
                </button>
              </div>
            )}
          </div>
          {deleteError && (
            <p role="alert" className="mt-2 text-[14px] text-destructive">
              {deleteError}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold leading-tight">{post.data.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            {post.data.authorPet.profileUrl ? <img src={post.data.authorPet.profileUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" /> : <div aria-hidden className="size-9 shrink-0 rounded-full bg-muted" />}
            <div className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate font-medium"><span className="truncate">{post.data.authorPet.nickname}</span>{post.data.authorPet.verified && <SealCheck size={15} weight="fill" aria-label="인증된 펫" />}</p><time dateTime={post.data.createdAt} className="text-[13px] text-muted-foreground">{formatBoardPostTime(post.data.createdAt)}</time></div>
          </div>
          <p className="mt-5 whitespace-pre-wrap leading-relaxed">{post.data.content}</p>
          {post.data.images.length > 0 && <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">{post.data.images.map((image) => <li key={image.mediaId} className="overflow-hidden rounded-xl bg-muted"><img src={image.url} alt="게시글 첨부 이미지" className="aspect-square w-full object-cover" /></li>)}</ul>}
          {/*
            본인 글엔 좋아요를 못 누른다(백엔드 BOARD_POST_SELF_REACTION_FORBIDDEN) — 버튼 자체를 비활성 표시로 바꿔 에러가 날 여지를 없앤다.
            단 /me 는 세션과 별개 질의라 로딩 중이거나 실패하면 me 가 null 이다. 그때는 내 글인지 알 수 없으므로
            열어두지 말고 잠근다(fail-closed). 열어두면 내 글에도 하트가 떠서 결국 403 이 난다.
          */}
          <div className="mt-5 flex items-center gap-2 border-y border-border py-2">
            {mine ? (
              <>
                <span aria-label="내 글의 좋아요 수" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-muted-foreground">
                  <Heart size={19} /><span className="tabular-nums">{post.data.reactionCount}</span>
                </span>
                <span aria-label="내 글의 도움돼요 수" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-muted-foreground">
                  <HandHeart size={19} /><span className="tabular-nums">{post.data.helpfulCount}</span>
                </span>
              </>
            ) : (
              <>
                <button type="button" aria-pressed={post.data.reactedByMe} aria-label={post.data.reactedByMe ? '좋아요 취소' : '좋아요'} disabled={react.isPending || myPetId === null} onClick={() => react.mutate({ type: 'LIKE', active: post.data!.reactedByMe })} className={cn('inline-flex min-h-11 items-center gap-1 rounded-lg px-2 transition-colors hover:bg-primary-subtle disabled:opacity-50', post.data.reactedByMe ? 'text-like' : 'text-muted-foreground')}>
                  <Heart size={19} weight={post.data.reactedByMe ? 'fill' : 'regular'} /><span className="tabular-nums">{post.data.reactionCount}</span>
                </button>
                <button type="button" aria-pressed={post.data.helpfulByMe} aria-label={post.data.helpfulByMe ? '도움돼요 취소' : '도움돼요'} disabled={react.isPending || myPetId === null} onClick={() => react.mutate({ type: 'HELPFUL', active: post.data!.helpfulByMe })} className={cn('inline-flex min-h-11 items-center gap-1 rounded-lg px-2 transition-colors hover:bg-primary-subtle disabled:opacity-50', post.data.helpfulByMe ? 'text-primary-strong' : 'text-muted-foreground')}>
                  <HandHeart size={19} weight={post.data.helpfulByMe ? 'fill' : 'regular'} /><span className="tabular-nums">{post.data.helpfulCount}</span>
                </button>
              </>
            )}
          </div>
          {react.isError && <p role="alert" className="mt-3 text-[14px] text-destructive">반응을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}

          <section className="mt-6">
            <h2 className="font-semibold">댓글</h2>

            <form
              className="mt-3 flex flex-col gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                const content = commentDraft.trim()
                if (!content || createComment.isPending) return
                createComment.mutate(content)
              }}
            >
              <textarea
                aria-label="댓글 입력"
                rows={2}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                maxLength={1000}
                placeholder="댓글을 남겨보세요"
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={createComment.isPending || commentDraft.trim() === ''}
                  className="min-h-9 rounded-lg bg-primary px-3 text-[13px] font-medium text-on-primary disabled:opacity-50"
                >
                  {createComment.isPending ? '등록 중…' : '댓글 등록'}
                </button>
                {createComment.isError && (
                  <p role="alert" className="text-[13px] text-destructive">
                    {toCommentErrorMessage(createComment.error)}
                  </p>
                )}
              </div>
            </form>

            <div className="mt-4">
              {comments.isPending && <p className="text-[14px] text-muted-foreground">댓글을 불러오는 중…</p>}
              {comments.isError && <ApiErrorNotice error={comments.error} title="댓글을 불러오지 못했습니다" onRetry={() => void comments.refetch()} />}
              {comments.data && comments.data.items.length === 0 && (
                <p className="py-4 text-center text-[14px] text-muted-foreground">첫 댓글을 남겨보세요.</p>
              )}
              {comments.data && comments.data.items.length > 0 && (
                <ul className="flex flex-col gap-4">
                  {comments.data.items.map((comment) => (
                    <li key={comment.commentId}>
                      <CommentThread postId={id} comment={comment} postAuthorPetId={post.data!.authorPet.petId} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </article>
      )}
    </div>
  )
}

function toCommentErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 404) return '게시글을 찾을 수 없습니다.'
  return '댓글을 등록하지 못했습니다.'
}
