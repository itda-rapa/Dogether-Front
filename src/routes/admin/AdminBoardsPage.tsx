import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilSimple, Plus, Stack, Trash, X } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { inputClass } from '@/components/ui/input-class'
import { createBoard, deleteBoard, listBoards, updateBoard } from '@/features/board/api'
import type { Board } from '@/features/board/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

export function AdminBoardsPage() {
  const queryClient = useQueryClient()
  const boards = useQuery({ queryKey: ['boards'], queryFn: listBoards })

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['boards'] })

  const create = useMutation({
    mutationFn: (name: string) => createBoard(name),
    onSuccess: async () => {
      setNewName('')
      await invalidate()
    },
  })

  const remove = useMutation({
    mutationFn: (boardId: number) => deleteBoard(boardId),
    onSuccess: async () => {
      setDeleteError(null)
      await invalidate()
    },
    onError: (error, boardId) => {
      setDeleteError({
        id: boardId,
        message:
          error instanceof ApiError && error.status === 409
            ? '게시글이 있는 게시판은 삭제할 수 없습니다.'
            : '삭제하지 못했습니다. 네트워크 연결을 확인해 주세요.',
      })
    },
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/admin" label="관리자" />

      <div className="mt-4 flex items-center gap-2">
        <Stack size={26} weight="fill" className="text-primary-strong" aria-hidden />
        <h1 className="text-2xl font-bold">게시판 관리</h1>
      </div>

      <form
        className="mt-6 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = newName.trim()
          if (trimmed) create.mutate(trimmed)
        }}
      >
        <input
          aria-label="새 게시판 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={30}
          placeholder="새 게시판 이름 (예: 자유게시판)"
          className={inputClass(create.isError)}
        />
        <Button
          type="submit"
          disabled={newName.trim().length === 0 || create.isPending}
          className="shrink-0"
        >
          <Plus size={18} />
          {create.isPending ? '추가 중…' : '추가'}
        </Button>
      </form>

      {create.isError && (
        <p role="alert" className="mt-2 text-[14px] text-destructive">
          {create.error instanceof ApiError && create.error.status === 409
            ? '이미 등록된 게시판 이름입니다.'
            : create.error instanceof ApiError
              ? create.error.message
              : '추가하지 못했습니다. 네트워크 연결을 확인해 주세요.'}
        </p>
      )}

      {boards.isPending && <p className="mt-6 text-muted-foreground">불러오는 중…</p>}

      {boards.isError && (
        <div className="mt-6">
          <ApiErrorNotice
            error={boards.error}
            title="게시판 목록을 불러오지 못했습니다"
            onRetry={() => void boards.refetch()}
          />
        </div>
      )}

      {boards.data?.length === 0 && (
        <div className="mt-6">
          <EmptyState title="등록된 게시판이 없습니다" />
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {boards.data?.map((board) => (
          <li key={board.boardId}>
            {editingId === board.boardId ? (
              <BoardEditRow
                board={board}
                onDone={() => setEditingId(null)}
                onSaved={invalidate}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                <span className="min-w-0 flex-1 truncate font-semibold">{board.name}</span>
                <button
                  type="button"
                  aria-label={`${board.name} 이름 수정`}
                  onClick={() => setEditingId(board.boardId)}
                  className="grid size-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-primary-subtle"
                >
                  <PencilSimple size={18} />
                </button>
                <button
                  type="button"
                  aria-label={`${board.name} 삭제`}
                  disabled={remove.isPending && remove.variables === board.boardId}
                  onClick={() => {
                    setDeleteError(null)
                    remove.mutate(board.boardId)
                  }}
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-destructive transition-colors hover:bg-primary-subtle disabled:pointer-events-none disabled:opacity-50"
                >
                  <Trash size={18} />
                </button>
              </div>
            )}
            {deleteError?.id === board.boardId && (
              <p role="alert" className="mt-1 px-1 text-[13px] text-destructive">
                {deleteError.message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function BoardEditRow({
  board,
  onDone,
  onSaved,
}: {
  board: Board
  onDone: () => void
  onSaved: () => Promise<unknown>
}) {
  const [name, setName] = useState(board.name)

  const save = useMutation({
    mutationFn: () => updateBoard(board.boardId, { name: name.trim(), version: board.version }),
    onSuccess: async () => {
      await onSaved()
      onDone()
    },
  })

  return (
    <div className="rounded-xl border border-primary bg-surface p-4">
      <div className="flex gap-3">
        <input
          aria-label={`${board.name} 새 이름`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
          className={inputClass(save.isError)}
        />
        <Button
          onClick={() => {
            const trimmed = name.trim()
            if (trimmed && trimmed !== board.name) save.mutate()
            else if (trimmed === board.name) onDone()
          }}
          disabled={name.trim().length === 0 || save.isPending}
          className="shrink-0"
        >
          {save.isPending ? '저장 중…' : '저장'}
        </Button>
        <button
          type="button"
          aria-label="취소"
          onClick={onDone}
          className="grid size-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-primary-subtle"
        >
          <X size={18} />
        </button>
      </div>

      {save.isError && (
        <p role="alert" className={cn('mt-2 text-[14px] text-destructive')}>
          {save.error instanceof ApiError && save.error.status === 409
            ? save.error.code === 'BOARD_NAME_DUPLICATED'
              ? '이미 등록된 게시판 이름입니다.'
              : '다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요.'
            : save.error instanceof ApiError
              ? save.error.message
              : '저장하지 못했습니다. 네트워크 연결을 확인해 주세요.'}
        </p>
      )}
    </div>
  )
}
