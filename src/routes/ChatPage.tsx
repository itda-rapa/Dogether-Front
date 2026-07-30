import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { SealCheck, Dog, WarningCircle, ArrowClockwise } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { listChatRooms } from '@/features/chat/api'
import { formatTime, type ChatRoom } from '@/features/chat/types'
import { ApiError } from '@/lib/api'

/** 방 목록 폴링 주기. 상세 화면보다 느슨하게 둔다. */
const ROOMS_POLL_MS = 5000

export function ChatPage() {
  const rooms = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: () => listChatRooms({ limit: 30 }),
    refetchInterval: ROOMS_POLL_MS,
    retry: false,
  })

  return (
    <Page title="채팅">
      {rooms.isPending && <p className="text-muted-foreground">불러오는 중…</p>}

      {rooms.isError && <RoomsError error={rooms.error} onRetry={() => void rooms.refetch()} />}

      {rooms.data?.items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          아직 대화 중인 상대가 없습니다.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {rooms.data?.items.map((room) => (
          <li key={room.roomId}>
            <RoomRow room={room} />
          </li>
        ))}
      </ul>
    </Page>
  )
}

function RoomRow({ room }: { room: ChatRoom }) {
  const pet = room.counterpartPet

  return (
    <Link
      to={`/chat/${room.roomId}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle"
    >
      <div
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
      >
        <Dog size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-semibold">
          <span className="truncate">{pet.nickname}</span>
          {pet.verified && (
            <SealCheck
              size={15}
              weight="fill"
              className="shrink-0 text-primary"
              aria-label="인증된 펫"
            />
          )}
          {room.status === 'ARCHIVED' && (
            <span className="shrink-0 rounded-full border border-border px-2 text-[13px] font-normal text-muted-foreground">
              보관됨
            </span>
          )}
        </p>
        <p className="truncate text-[14px] text-muted-foreground">
          {room.lastMessage?.body ?? '아직 메시지가 없습니다'}
        </p>
      </div>

      {room.lastMessageAt && (
        <span className="shrink-0 self-start text-[13px] tabular-nums text-muted-foreground">
          {formatTime(room.lastMessageAt)}
        </span>
      )}
    </Link>
  )
}

function RoomsError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const api = error instanceof ApiError ? error : null

  // 403 은 Active Pet 이 없어 채팅 자체를 쓸 수 없는 상태다. 재시도해도 소용없다.
  const needsActivePet = api?.status === 403
  const notImplemented = api?.status === 404

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {needsActivePet
            ? '대표 강아지가 필요합니다'
            : notImplemented
              ? '아직 준비되지 않은 기능입니다'
              : '채팅 목록을 불러오지 못했습니다'}
        </p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {needsActivePet
            ? '마이 페이지에서 대표 강아지를 지정하면 채팅을 쓸 수 있습니다.'
            : notImplemented
              ? '백엔드에 GET /chat/rooms 가 아직 구현되지 않았습니다.'
              : '잠시 후 다시 시도해 주세요.'}
        </p>
        {needsActivePet ? (
          <Link to="/me" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary">
            마이 페이지로
          </Link>
        ) : (
          !notImplemented && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary"
            >
              <ArrowClockwise size={18} />
              다시 시도
            </button>
          )
        )}
      </div>
    </div>
  )
}
