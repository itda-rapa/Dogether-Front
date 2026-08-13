import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Heart, PencilSimple, SealCheck } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { listBoardPosts, listBoards } from '@/features/board/api'
import { formatBoardPostTime } from '@/features/board/format'
import type { Board, BoardPost } from '@/features/board/types'
import { cn } from '@/lib/cn'

export function BoardPage() {
  const [params, setParams] = useSearchParams()
  const boards = useQuery({ queryKey: ['boards'], queryFn: listBoards, retry: false })
  const selectedBoard = selectBoard(boards.data ?? [], params)

  const posts = useQuery({
    queryKey: ['board-posts', selectedBoard?.boardId],
    queryFn: () => listBoardPosts(selectedBoard!.boardId),
    enabled: selectedBoard !== undefined,
    retry: false,
  })

  return (
    <Page title="게시판">
      {boards.isPending && <p className="mb-6 text-muted-foreground">게시판을 불러오는 중…</p>}
      {boards.isError && <ApiErrorNotice error={boards.error} title="게시판 목록을 불러오지 못했습니다" onRetry={() => void boards.refetch()} />}
      {boards.data && boards.data.length === 0 && <EmptyState title="이용할 수 있는 게시판이 없습니다" />}

      {boards.data && boards.data.length > 0 && selectedBoard && (
        <>
          <div role="tablist" aria-label="게시판 분류" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
            {boards.data.map((board) => (
              <button
                key={board.boardId}
                role="tab"
                aria-selected={selectedBoard.boardId === board.boardId}
                onClick={() => setParams({ boardId: String(board.boardId) })}
                className={cn(
                  'min-h-11 shrink-0 rounded-full border px-4 font-medium transition-colors',
                  selectedBoard.boardId === board.boardId
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
                )}
              >
                {board.name}
              </button>
            ))}
          </div>

          {posts.isPending && <PostListSkeleton />}
          {posts.isError && <ApiErrorNotice error={posts.error} title="게시글을 불러오지 못했습니다" onRetry={() => void posts.refetch()} />}
          {posts.data?.items.length === 0 && <EmptyState title="아직 게시글이 없습니다" description={`${selectedBoard.name} 게시판의 첫 글을 작성해 보세요.`} />}
          {posts.data && posts.data.items.length > 0 && (
            <ul className="mb-6 flex flex-col gap-2">
              {posts.data.items.map((post) => <li key={post.postId}><PostRow post={post} boardName={selectedBoard.name} /></li>)}
            </ul>
          )}

          <Link to={`/board/new?boardId=${selectedBoard.boardId}`} className="fixed bottom-20 right-4 inline-flex min-h-14 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-on-primary shadow-md transition-colors hover:bg-primary-hover md:bottom-6">
            <PencilSimple size={20} weight="bold" />
            글쓰기
          </Link>
        </>
      )}
    </Page>
  )
}

function selectBoard(boards: Board[], params: URLSearchParams) {
  const boardId = Number(params.get('boardId'))
  if (Number.isSafeInteger(boardId) && boardId > 0) {
    const selected = boards.find((board) => board.boardId === boardId)
    if (selected) return selected
  }
  // 기존 공유 링크의 category=자유도 서버가 준 이름과 일치하면 계속 열린다.
  const legacyCategory = params.get('category')
  return boards.find((board) => board.name === legacyCategory) ?? boards[0]
}

function PostRow({ post, boardName }: { post: BoardPost; boardName: string }) {
  return (
    <Link to={`/board/${post.postId}`} className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle">
      <p className="text-[13px] font-medium text-primary-strong">{boardName}</p>
      <p className="mt-1 font-semibold">{post.title}</p>
      <p className="mt-1 line-clamp-2 text-[14px] text-muted-foreground">{post.content}</p>
      <div className="mt-3 flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1 truncate"><span className="truncate">{post.authorPet.nickname}</span>{post.authorPet.verified && <SealCheck size={14} weight="fill" aria-label="인증된 펫" />}</span>
        <span>·</span>
        <time dateTime={post.createdAt} className="shrink-0">{formatBoardPostTime(post.createdAt)}</time>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1"><Heart size={15} weight={post.reactedByMe ? 'fill' : 'regular'} /><span className="tabular-nums">{post.reactionCount}</span></span>
      </div>
    </Link>
  )
}

function PostListSkeleton() {
  return <ul className="flex flex-col gap-2" aria-busy="true">{[0, 1].map((index) => <li key={index} className="h-36 rounded-xl border border-border bg-surface" />)}</ul>
}
