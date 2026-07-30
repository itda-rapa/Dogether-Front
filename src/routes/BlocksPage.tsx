import { useQuery } from '@tanstack/react-query'
import { Prohibit } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { EmptyState } from '@/components/ui/EmptyState'
import { listBlocks } from '@/features/moderation/api'
import { ApiError } from '@/lib/api'

export function BlocksPage() {
  const blocks = useQuery({
    queryKey: ['me', 'blocks'],
    queryFn: () => listBlocks({ limit: 50 }),
    retry: false,
  })

  const notImplemented =
    blocks.error instanceof ApiError && blocks.error.status === 404

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">차단 목록</h1>

      {/* 해제 API 가 계약에 없다. 사용자가 헛되이 찾지 않도록 미리 알린다. */}
      <p className="mt-1 text-[14px] text-muted-foreground">
        차단은 앱에서 해제할 수 없습니다. 해제가 필요하면 고객센터로 문의해
        주세요.
      </p>

      {blocks.isPending && (
        <p className="mt-6 text-muted-foreground">불러오는 중…</p>
      )}

      {blocks.data?.items.length === 0 && (
        <div className="mt-6">
          <EmptyState title="차단한 사용자가 없습니다" />
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {blocks.data?.items.map((b) => (
          <li
            key={b.blockId}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <div
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
            >
              <Prohibit size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {b.blockedUserPublicTag ?? `사용자 ${b.blockedUserId}`}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {new Date(b.createdAt).toLocaleDateString('ko-KR')} 차단
              </p>
            </div>
          </li>
        ))}
      </ul>

      {blocks.isError && (
        <div className="mt-6">
          <NotConnected
            endpoint="GET /me/blocks"
            note={
              notImplemented
                ? '백엔드에 아직 구현되지 않았습니다. M1 계약에 차단 해제 API 도 없습니다 — 의도인지 누락인지 확인이 필요합니다.'
                : '차단 목록을 불러오지 못했습니다.'
            }
          />
        </div>
      )}
    </div>
  )
}
