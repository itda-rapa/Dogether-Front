import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarPlus,
  PaperPlaneRight,
  SealCheck,
  WarningCircle,
} from '@phosphor-icons/react'
import {
  getChatRoom,
  listChatMessages,
  sendChatMessage,
} from '@/features/chat/api'
import {
  SEND_BLOCKED_MESSAGE,
  canDraftMeeting,
  formatTime,
  mergeMessages,
  type ChatMessage,
} from '@/features/chat/types'
import { ModerationMenu } from '@/components/ModerationMenu'
import { MeetingSuggestions } from '@/features/meeting/MeetingSuggestions'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

/** 메시지 폴링 주기. 방 목록보다 촘촘하게 둔다. */
const MESSAGES_POLL_MS = 3000

export function ChatRoomPage() {
  const { roomId = '' } = useParams()
  const roomIdNum = Number(roomId)
  const valid = Number.isFinite(roomIdNum)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)

  /** 다음 폴링에 넘길 커서. 렌더와 무관하게 즉시 읽혀야 해서 ref 로 둔다. */
  const afterRef = useRef<number | null>(null)
  /** 재시도 시 같은 값을 보내야 서버 멱등성이 동작하므로 보관한다. */
  const clientMessageIdRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const room = useQuery({
    queryKey: ['chat', 'room', roomId],
    queryFn: () => getChatRoom(roomIdNum),
    enabled: valid,
    retry: false,
  })

  // 폴링 자체는 useQuery 가 돌리고, 받은 항목은 로컬 목록에 누적한다.
  const poll = useQuery({
    queryKey: ['chat', 'messages', roomId],
    queryFn: () => listChatMessages(roomIdNum, afterRef.current),
    enabled: valid && room.isSuccess,
    refetchInterval: MESSAGES_POLL_MS,
    retry: false,
  })

  useEffect(() => {
    if (!poll.data) return
    setMessages((prev) => mergeMessages(prev, poll.data.items))
    if (poll.data.nextAfterMessageId != null) {
      afterRef.current = poll.data.nextAfterMessageId
    }
  }, [poll.data])

  // 새 메시지가 붙으면 아래로 붙여둔다.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = useMutation({
    mutationFn: (body: string) => {
      clientMessageIdRef.current ??= crypto.randomUUID()
      return sendChatMessage(roomIdNum, {
        clientMessageId: clientMessageIdRef.current,
        body,
      })
    },
    onSuccess: (created) => {
      setMessages((prev) => mergeMessages(prev, [created]))
      if (created.messageId > (afterRef.current ?? 0)) {
        afterRef.current = created.messageId
      }
      clientMessageIdRef.current = null
      setDraft('')
      setSendError(null)
    },
    onError: (e) => setSendError(toSendMessage(e)),
  })

  const canDraft = useMemo(() => canDraftMeeting(messages), [messages])

  if (!valid) return <Centered>잘못된 채팅방입니다.</Centered>
  if (room.isPending) return <Centered>불러오는 중…</Centered>
  if (room.isError) return <RoomError error={room.error} />

  const data = room.data
  const blocked = !data.canSend
  const blockedReason = data.sendBlockedReason
    ? SEND_BLOCKED_MESSAGE[data.sendBlockedReason]
    : '지금은 메시지를 보낼 수 없습니다.'

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Link
          to="/chat"
          aria-label="채팅 목록으로"
          className="grid size-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-primary-subtle"
        >
          <ArrowLeft size={22} />
        </Link>

        <h1 className="flex min-w-0 flex-1 items-center gap-1.5 text-lg font-bold">
          <span className="truncate">{data.counterpartPet.nickname}</span>
          {data.counterpartPet.verified && (
            <SealCheck
              size={17}
              weight="fill"
              className="shrink-0 text-primary"
              aria-label="인증된 펫"
            />
          )}
        </h1>

        <ModerationMenu
          roomId={data.roomId}
          targetPetId={data.counterpartPet.petId}
          targetName={data.counterpartPet.nickname}
        />
      </div>

      {/*
        상단 "약속 잡기"는 AI 제안이 안 뜰 때를 위한 대비책이다.
        주 진입점은 입력창 위 제안 스트립이므로 여기서는 작게 둔다.
      */}
      <div className="flex justify-end border-b border-border px-3 py-1.5">
        {canDraft ? (
          <Link
            to={`/chat/${roomId}/meeting/new`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[14px] font-medium text-primary transition-colors hover:bg-primary-subtle"
          >
            <CalendarPlus size={17} weight="bold" />
            약속 잡기
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center px-2 text-[13px] text-muted-foreground">
            대화를 2번 이상 나누면 약속을 잡을 수 있어요
          </span>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-3 p-4">
        {messages.length === 0 && !poll.isPending && (
          <li className="py-8 text-center text-muted-foreground">
            첫 메시지를 보내보세요.
          </li>
        )}

        {messages.map((m) => (
          <li key={m.messageId}>
            <MessageRow message={m} counterpartPetId={data.counterpartPet.petId} />
          </li>
        ))}
        <div ref={bottomRef} />
      </ul>

      <div className="sticky bottom-0 border-t border-border bg-surface">
        {/* AI 약속 제안. 입력창 바로 위, 가로 스크롤. 닫을 수 있다. */}
        <MeetingSuggestions roomId={roomIdNum} enabled={canDraft && !blocked} />

        <div className="p-3">
        {blocked && (
          <p role="status" className="mb-2 text-[14px] text-muted-foreground">
            {blockedReason}
          </p>
        )}
        {sendError && (
          <p role="alert" className="mb-2 text-[14px] text-destructive">
            {sendError}
          </p>
        )}

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const body = draft.trim()
            if (!body || blocked) return
            send.mutate(body)
          }}
        >
          <input
            type="text"
            aria-label="메시지 입력"
            placeholder={blocked ? '메시지를 보낼 수 없습니다' : '메시지 보내기…'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={blocked}
            maxLength={2000}
            className="min-h-11 w-full rounded-full border border-border bg-background px-4 disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="보내기"
            disabled={blocked || send.isPending || draft.trim() === ''}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <PaperPlaneRight size={20} weight="fill" />
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}

function MessageRow({
  message,
  counterpartPetId,
}: {
  message: ChatMessage
  counterpartPetId: number
}) {
  if (message.senderType === 'SYSTEM' || message.type === 'SYSTEM') {
    return (
      <p className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">
        {message.body}
      </p>
    )
  }

  // 상대 펫이 아니면 내가 보낸 것으로 본다. (내 Active Pet id 는 /me 에서 온다)
  const mine = message.senderPetId !== counterpartPetId

  if (message.type === 'CARD') {
    // 카드를 누르면 상세로 간다. 거기서 취소할 수 있다.
    const to = message.meetingCardId
      ? `/meeting-cards/${message.meetingCardId}`
      : null

    const inner = (
      <>
        <p className="flex items-center gap-1.5 font-semibold text-primary">
          <CalendarPlus size={18} weight="bold" />약속 카드
        </p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {message.body ?? '약속이 잡혔습니다.'}
        </p>
      </>
    )

    return (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        {to ? (
          <Link
            to={to}
            className="max-w-[75%] rounded-2xl border-2 border-primary bg-surface px-4 py-3 transition-colors hover:bg-primary-subtle"
          >
            {inner}
          </Link>
        ) : (
          <div className="max-w-[75%] rounded-2xl border-2 border-primary bg-surface px-4 py-3">
            {inner}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className="flex max-w-[75%] flex-col gap-1">
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            mine
              ? 'bg-primary text-on-primary'
              : 'border border-border bg-surface',
          )}
        >
          {message.body}
        </div>
        <span
          className={cn(
            'text-[13px] tabular-nums text-muted-foreground',
            mine && 'self-end',
          )}
        >
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[50dvh] place-items-center px-4 text-muted-foreground">
      {children}
    </div>
  )
}

function RoomError({ error }: { error: unknown }) {
  const api = error instanceof ApiError ? error : null
  const needsActivePet = api?.status === 403
  const notFound = api?.status === 404

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link
        to="/chat"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-muted-foreground"
      >
        <ArrowLeft size={20} />
        채팅 목록
      </Link>
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
      >
        <WarningCircle
          size={22}
          weight="fill"
          className="mt-0.5 shrink-0 text-destructive"
        />
        <div>
          <p className="font-semibold">
            {needsActivePet
              ? '대표 강아지가 필요합니다'
              : notFound
                ? '존재하지 않는 채팅방입니다'
                : '채팅방을 불러오지 못했습니다'}
          </p>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {needsActivePet
              ? '마이 페이지에서 대표 강아지를 지정해 주세요.'
              : '목록으로 돌아가 다시 시도해 주세요.'}
          </p>
        </div>
      </div>
    </div>
  )
}

/** 전송 실패 사유를 사용자 문구로 바꾼다. 서버 오류 코드를 그대로 노출하지 않는다. */
function toSendMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return '메시지를 보내지 못했습니다.'
  switch (e.code) {
    case 'GREETING_REPLY_REQUIRED':
      return '상대가 답장할 때까지 기다려 주세요.'
    case 'BLOCKED_USER':
      return '차단된 상대에게는 보낼 수 없습니다.'
    case 'CHAT_DUPLICATE_MESSAGE':
      return '이미 전송된 메시지입니다.'
    case 'VALIDATION_FAILED':
      return '메시지 내용을 확인해 주세요.'
    default:
      return '메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
