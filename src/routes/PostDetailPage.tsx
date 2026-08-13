import { useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, SealCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { addBoardPostLike, getBoardPost, listBoards, removeBoardPostLike } from '@/features/board/api'
import { formatBoardPostTime } from '@/features/board/format'
import type { BoardPost } from '@/features/board/types'
import { cn } from '@/lib/cn'

export function PostDetailPage() {
  const { postId = '' } = useParams()
  const id = Number(postId)
  const queryClient = useQueryClient()
  const post = useQuery({ queryKey: ['board-post', id], queryFn: () => getBoardPost(id), enabled: Number.isSafeInteger(id) && id > 0, retry: false })
  const boards = useQuery({ queryKey: ['boards'], queryFn: listBoards, retry: false })
  const like = useMutation({
    mutationFn: (reacted: boolean) => reacted ? removeBoardPostLike(id) : addBoardPostLike(id),
    onSuccess: (result) => queryClient.setQueryData<BoardPost>(['board-post', id], (current) => current ? { ...current, reactedByMe: result.reacted, reactionCount: result.reactionCount } : current),
  })

  if (!Number.isSafeInteger(id) || id <= 0) return <div className="mx-auto w-full max-w-3xl px-4 py-6"><BackLink to="/board" label="게시판" /><div className="mt-6"><EmptyState title="존재하지 않는 게시글입니다" /></div></div>
  const boardName = boards.data?.find((board) => board.boardId === post.data?.boardId)?.name ?? '게시판'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/board" label="게시판" />
      {post.isPending && <p className="mt-6 text-muted-foreground">게시글을 불러오는 중…</p>}
      {post.isError && <div className="mt-6"><ApiErrorNotice error={post.error} title="게시글을 불러오지 못했습니다" onRetry={() => void post.refetch()} /></div>}
      {post.data && (
        <article className="mt-4">
          <p className="text-[13px] font-medium text-primary-strong">{boardName}</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{post.data.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            {post.data.authorPet.profileUrl ? <img src={post.data.authorPet.profileUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" /> : <div aria-hidden className="size-9 shrink-0 rounded-full bg-muted" />}
            <div className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate font-medium"><span className="truncate">{post.data.authorPet.nickname}</span>{post.data.authorPet.verified && <SealCheck size={15} weight="fill" aria-label="인증된 펫" />}</p><time dateTime={post.data.createdAt} className="text-[13px] text-muted-foreground">{formatBoardPostTime(post.data.createdAt)}</time></div>
          </div>
          <p className="mt-5 whitespace-pre-wrap leading-relaxed">{post.data.content}</p>
          {post.data.images.length > 0 && <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">{post.data.images.map((image) => <li key={image.mediaId} className="overflow-hidden rounded-xl bg-muted"><img src={image.url} alt="게시글 첨부 이미지" className="aspect-square w-full object-cover" /></li>)}</ul>}
          <div className="mt-5 flex items-center gap-2 border-y border-border py-2">
            <button type="button" aria-pressed={post.data.reactedByMe} aria-label={post.data.reactedByMe ? '좋아요 취소' : '좋아요'} disabled={like.isPending} onClick={() => like.mutate(post.data.reactedByMe)} className={cn('inline-flex min-h-11 items-center gap-1 rounded-lg px-2 transition-colors hover:bg-primary-subtle disabled:opacity-50', post.data.reactedByMe ? 'text-like' : 'text-muted-foreground')}>
              <Heart size={19} weight={post.data.reactedByMe ? 'fill' : 'regular'} /><span className="tabular-nums">{post.data.reactionCount}</span>
            </button>
          </div>
          {like.isError && <p role="alert" className="mt-3 text-[14px] text-destructive">좋아요를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
        </article>
      )}
    </div>
  )
}
