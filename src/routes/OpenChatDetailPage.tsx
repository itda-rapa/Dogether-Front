import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChatCircleDots, LockOpen, UsersThree } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { getOpenChatRoom, joinOpenChatRoom } from '@/features/chat/api'

export function OpenChatDetailPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { roomId = '' } = useParams()
  const roomIdNumber = Number(roomId)
  const valid = Number.isInteger(roomIdNumber) && roomIdNumber > 0

  const room = useQuery({
    queryKey: ['chat', 'open', 'room', roomIdNumber],
    queryFn: () => getOpenChatRoom(roomIdNumber),
    enabled: valid,
    retry: false,
  })
  const join = useMutation({
    mutationFn: () => joinOpenChatRoom(roomIdNumber),
    onSuccess: (joinedRoom) => {
      queryClient.setQueryData(
        ['chat', 'open', 'room', roomIdNumber],
        joinedRoom,
      )
      navigate(`/chat/open/${roomIdNumber}/room`)
    },
  })

  if (!valid) {
    return <div className="p-6 text-center text-muted-foreground">잘못된 채팅방입니다.</div>
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/chat/open" label="오픈채팅" />
      {room.isPending && <div className="mt-4 h-64 animate-pulse rounded-xl bg-surface" />}
      {room.isError && (
        <div className="mt-4">
          <ApiErrorNotice
            error={room.error}
            title="채팅방을 불러오지 못했습니다"
            onRetry={() => void room.refetch()}
          />
        </div>
      )}
      {room.data && (
        <article className="mt-4 rounded-2xl border border-border bg-surface p-6">
          <span className="grid size-14 place-items-center rounded-full bg-primary-subtle text-primary-strong">
            <ChatCircleDots size={30} weight="fill" />
          </span>
          <h1 className="mt-5 text-2xl font-bold">{room.data.title}</h1>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">
            {room.data.description ?? '방 설명이 없습니다.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-[14px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UsersThree size={19} /> 최대 {room.data.maxParticipants}명
            </span>
            <span className="flex items-center gap-1.5">
              <LockOpen size={19} /> 공개방
            </span>
          </div>

          {join.isError && (
            <div className="mt-5">
              <ApiErrorNotice error={join.error} title="채팅방에 입장하지 못했습니다" />
            </div>
          )}
          <Button
            className="mt-6 w-full sm:w-auto"
            disabled={join.isPending}
            onClick={() => join.mutate()}
          >
            {join.isPending ? '입장하는 중…' : '채팅방 입장하기'}
          </Button>
        </article>
      )}
    </div>
  )
}
