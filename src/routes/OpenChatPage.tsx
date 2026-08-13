import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChatCircleDots, Plus, UsersThree } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { EmptyState } from '@/components/ui/EmptyState'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { listOpenChatRooms } from '@/features/chat/api'

export function OpenChatPage() {
  const rooms = useQuery({
    queryKey: ['chat', 'open', 'rooms'],
    queryFn: () => listOpenChatRooms(),
    retry: false,
  })

  return (
    <Page
      title="오픈채팅"
      description="관심사가 맞는 이웃과 자유롭게 대화해 보세요."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          to="/chat/open/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          <Plus size={19} weight="bold" />
          방 만들기
        </Link>
        <Link
          to="/chat"
          className="inline-flex min-h-11 items-center rounded-lg border-2 border-primary px-5 font-semibold text-primary-strong transition-colors hover:bg-primary-subtle"
        >
          1:1 채팅
        </Link>
      </div>

      {rooms.isPending && <RoomSkeleton />}
      {rooms.isError && (
        <ApiErrorNotice
          error={rooms.error}
          title="오픈채팅방을 불러오지 못했습니다"
          onRetry={() => void rooms.refetch()}
        />
      )}
      {rooms.data?.content.length === 0 && (
        <EmptyState
          title="아직 공개된 방이 없습니다"
          description="첫 번째 오픈채팅방을 만들어 보세요."
          action={
            <Link to="/chat/open/new" className="font-semibold text-primary-strong">
              방 만들기
            </Link>
          }
        />
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {rooms.data?.content.map((room) => (
          <li key={room.roomId}>
            <Link
              to={`/chat/open/${room.roomId}`}
              className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary-strong">
                  <ChatCircleDots size={23} weight="fill" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{room.title}</h2>
                  <p className="mt-1 line-clamp-2 text-[14px] text-muted-foreground">
                    {room.description ?? '함께 이야기할 이웃을 기다리고 있어요.'}
                  </p>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <UsersThree size={17} /> 최대 {room.maxParticipants}명
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  )
}

function RoomSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-32 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  )
}
