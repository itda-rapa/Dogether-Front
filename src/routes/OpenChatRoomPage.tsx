import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarPlus, Dog, PaperPlaneRight, SignOut, Sparkle, Trash, UserPlus, UsersThree, X } from '@phosphor-icons/react'
import { useAuth } from '@/features/auth/auth-context'
import {
  deleteOpenChatRoom,
  getOpenChatRoom,
  inviteFriendToOpenChat,
  leaveOpenChatRoom,
  listChatMessages,
  requestOpenChatCardDraft,
  sendChatMessage,
} from '@/features/chat/api'
import { listFriends } from '@/features/friend/api'
import { formatTime, mergeMessages, type ChatMessage } from '@/features/chat/types'
import { subscribeToChatRoom } from '@/features/chat/realtime'
import type { OpenChatCardDraft } from '@/features/chat/api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { FALLBACK_MESSAGE, splitDraftDateTime } from '@/features/meeting/types'

const FALLBACK_POLL_MS = 10_000
const AUTO_DRAFT_DELAY_MS = 800
const DAY_MS = 24 * 60 * 60 * 1_000

export function OpenChatRoomPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { roomId = '' } = useParams()
  const roomIdNumber = Number(roomId)
  const valid = Number.isInteger(roomIdNumber) && roomIdNumber > 0
  const { me } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteNotice, setInviteNotice] = useState<string | null>(null)
  const [aiDrafts, setAiDrafts] = useState<OpenChatCardDraft[]>([])
  const [aiNotice, setAiNotice] = useState<string | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const afterRef = useRef<number | null>(null)
  const bottomRef = useRef<HTMLLIElement | null>(null)
  const lastAutoDraftMessageIdRef = useRef<number | null>(null)

  useEffect(() => {
    setMessages([])
    afterRef.current = null
    setAiDrafts([])
    setAiNotice(null)
    setAiGenerating(false)
    lastAutoDraftMessageIdRef.current = null
  }, [roomIdNumber])

  const room = useQuery({
    queryKey: ['chat', 'open', 'room', roomIdNumber],
    queryFn: () => getOpenChatRoom(roomIdNumber),
    enabled: valid,
    retry: false,
  })
  const poll = useQuery({
    queryKey: ['chat', 'open', 'messages', roomIdNumber],
    queryFn: () => listChatMessages(roomIdNumber, afterRef.current),
    enabled: valid && room.isSuccess,
    refetchOnMount: 'always',
    refetchInterval: FALLBACK_POLL_MS,
    retry: false,
  })

  useEffect(() => {
    if (!poll.data) return
    setMessages((previous) => mergeMessages(previous, poll.data.items))
    if (poll.data.nextAfterMessageId != null) {
      afterRef.current = poll.data.nextAfterMessageId
    }
  }, [poll.data])

  useEffect(() => {
    if (!valid || !room.isSuccess) return
    return subscribeToChatRoom(
      roomIdNumber,
      (message) => {
        if (message.senderType === 'PET' && !message.senderPetNickname) {
          void listChatMessages(roomIdNumber, Math.max(0, message.messageId - 1), 1)
            .then((result) => {
              setMessages((previous) => mergeMessages(previous, result.items))
              afterRef.current = Math.max(
                afterRef.current ?? 0,
                result.nextAfterMessageId ?? message.messageId,
              )
            })
          return
        }
        setMessages((previous) => mergeMessages(previous, [message]))
        afterRef.current = Math.max(afterRef.current ?? 0, message.messageId)
      },
      setConnected,
    )
  }, [roomIdNumber, room.isSuccess, valid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = useMutation({
    mutationFn: (message: { clientMessageId: string; body: string }) =>
      sendChatMessage(roomIdNumber, message),
    onSuccess: (message) => {
      setMessages((previous) => mergeMessages(previous, [message]))
      afterRef.current = Math.max(afterRef.current ?? 0, message.messageId)
      setDraft('')
      setSendError(null)
    },
    onError: (error) => setSendError(messageForSendError(error)),
  })

  const requestAiDraft = useMutation({
    mutationFn: () => requestOpenChatCardDraft(roomIdNumber),
    onMutate: () => {
      setAiGenerating(true)
      setAiNotice(null)
      setAiDrafts([])
    },
    onSuccess: (drafts) => {
      setAiGenerating(false)
      setAiDrafts(drafts)
      setAiNotice(drafts.length === 0 ? '표시할 약속 카드가 없습니다.' : null)
      queryClient.setQueryData(['card-draft', String(roomIdNumber)], drafts)
    },
    onError: (error) => {
      setAiGenerating(false)
      setAiNotice(error instanceof ApiError ? error.message : 'AI 약속 카드를 요청하지 못했습니다.')
    },
  })
  const requestAiDraftMutate = requestAiDraft.mutate

  useEffect(() => {
    if (
      !valid ||
      !room.isSuccess ||
      me?.activePetId == null
    ) return

    const recentPetMessages = messages.filter(
      (message) =>
        message.type === 'TEXT' &&
        message.senderType === 'PET' &&
        message.senderPetId != null &&
        new Date(message.createdAt).getTime() >= Date.now() - DAY_MS,
    )
    const latest = recentPetMessages.at(-1)
    if (!latest || latest.senderPetId !== me.activePetId) return

    const speakers = new Set(recentPetMessages.map((message) => message.senderPetId))
    const enoughRoomParticipants = room.data.activeParticipants == null
      ? speakers.size >= 3
      : room.data.activeParticipants >= 3
    if (!enoughRoomParticipants) return
    // 방에는 3명 이상 있어야 하지만, 약속 자체는 제안자와 동의자 2명이면 성립한다.
    if (speakers.size < 2) return
    if (lastAutoDraftMessageIdRef.current === latest.messageId) return

    const timeout = window.setTimeout(() => {
      lastAutoDraftMessageIdRef.current = latest.messageId
      requestAiDraftMutate()
    }, AUTO_DRAFT_DELAY_MS)
    return () => window.clearTimeout(timeout)
  }, [me?.activePetId, messages, requestAiDraftMutate, room.data, room.isSuccess, valid])

  const friends = useQuery({
    queryKey: ['friends', me?.activePetId, 'open-chat-invite'],
    queryFn: () => listFriends(me!.activePetId!, null, 100),
    enabled: inviteOpen && me?.activePetId != null,
    retry: false,
  })
  const invite = useMutation({
    mutationFn: (targetPetId: number) =>
      inviteFriendToOpenChat(roomIdNumber, targetPetId),
    onSuccess: (result) => {
      setInviteNotice(
        result.joined
          ? '친구를 채팅방에 초대했습니다.'
          : '이미 채팅방에 참여 중인 친구입니다.',
      )
    },
    onError: (error) => {
      setInviteNotice(
        error instanceof ApiError
          ? error.message
          : '친구를 초대하지 못했습니다.',
      )
    },
  })

  const leave = useMutation({
    mutationFn: () => leaveOpenChatRoom(roomIdNumber),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'open'] })
      navigate('/chat/open', { replace: true })
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteOpenChatRoom(roomIdNumber),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'open'] })
      navigate('/chat/open', { replace: true })
    },
  })

  if (!valid) return <Centered>잘못된 채팅방입니다.</Centered>
  if (room.isPending) return <Centered>채팅방을 불러오는 중…</Centered>
  if (room.isError) return <RoomError error={room.error} />

  const isOwner = room.data.ownerPetId === me?.activePetId
  const availableAiDrafts = aiDrafts.filter((candidate) => !candidate.fallback)
  const fallbackDraft = aiDrafts.find((candidate) => candidate.fallback)
  const fallbackCopy = fallbackDraft?.fallbackReason
    ? FALLBACK_MESSAGE[fallbackDraft.fallbackReason]
    : null

  return (
    <div className="sticky top-14 mx-auto flex h-[calc(100dvh-3.5rem-64px-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col overflow-hidden md:h-[calc(100dvh-3.5rem)]">
      <header className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Link
          to="/chat/open"
          aria-label="오픈채팅 목록으로"
          className="grid size-11 place-items-center rounded-lg hover:bg-primary-subtle"
        >
          <ArrowLeft size={22} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-bold">{room.data.title}</h1>
          <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <UsersThree size={15} /> 최대 {room.data.maxParticipants}명 ·{' '}
            <span className={connected ? 'text-primary-strong' : undefined}>
              {connected ? '실시간 연결됨' : '재연결 중'}
            </span>
          </p>
        </div>
        <button
          type="button"
          aria-label="AI 약속 카드 만들기"
          title="AI 약속 카드 만들기"
          disabled={aiGenerating || requestAiDraft.isPending}
          onClick={() => requestAiDraft.mutate()}
          className="grid size-11 place-items-center rounded-lg text-primary-strong hover:bg-primary-subtle disabled:opacity-50"
        >
          <Sparkle size={20} weight="fill" />
        </button>
        <button
          type="button"
          aria-label="친구 초대"
          aria-expanded={inviteOpen}
          onClick={() => {
            setInviteOpen((open) => !open)
            setInviteNotice(null)
          }}
          className="grid size-11 place-items-center rounded-lg hover:bg-primary-subtle"
        >
          {inviteOpen ? <X size={20} /> : <UserPlus size={20} />}
        </button>
        {isOwner ? (
          <button
            type="button"
            aria-label="채팅방 삭제"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm('채팅방을 삭제할까요?')) remove.mutate()
            }}
            className="grid size-11 place-items-center rounded-lg text-destructive hover:bg-muted disabled:opacity-50"
          >
            <Trash size={20} />
          </button>
        ) : (
          <button
            type="button"
            aria-label="채팅방 나가기"
            disabled={leave.isPending}
            onClick={() => {
              if (window.confirm('채팅방에서 나갈까요?')) leave.mutate()
            }}
            className="grid size-11 place-items-center rounded-lg hover:bg-primary-subtle disabled:opacity-50"
          >
            <SignOut size={20} />
          </button>
        )}
      </header>

      {inviteOpen && (
        <section className="border-b border-border bg-surface px-4 py-3" aria-label="친구 초대">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">친구 초대</h2>
              <p className="text-[13px] text-muted-foreground">친구로 등록된 펫을 이 채팅방에 초대합니다.</p>
            </div>
          </div>
          {inviteNotice && (
            <p role="status" className="mb-2 text-[14px] text-muted-foreground">{inviteNotice}</p>
          )}
          {friends.isPending ? (
            <p className="py-3 text-[14px] text-muted-foreground">친구 목록을 불러오는 중…</p>
          ) : friends.isError ? (
            <p role="alert" className="py-3 text-[14px] text-destructive">친구 목록을 불러오지 못했습니다.</p>
          ) : friends.data.items.length === 0 ? (
            <p className="py-3 text-[14px] text-muted-foreground">초대할 친구가 없습니다.</p>
          ) : (
            <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto">
              {friends.data.items.map((friend) => (
                <li key={friend.petId} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-primary-subtle">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Dog size={19} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{friend.nickname}</span>
                  <button
                    type="button"
                    disabled={invite.isPending}
                    onClick={() => {
                      setInviteNotice(null)
                      invite.mutate(friend.petId)
                    }}
                    className="min-h-9 rounded-lg bg-primary px-3 text-[14px] font-semibold text-on-primary disabled:opacity-50"
                  >
                    초대
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && !poll.isPending && (
          <li className="py-10 text-center text-muted-foreground">
            첫 메시지를 보내 대화를 시작해 보세요.
          </li>
        )}
        {messages.map((message) => (
          <li key={message.messageId}>
            <OpenMessageRow message={message} activePetId={me?.activePetId ?? null} />
          </li>
        ))}
        <li ref={bottomRef} />
      </ul>

      <div className="border-t border-border bg-surface p-3">
        {(aiGenerating || aiNotice || aiDrafts.length > 0) && (
          <section className="mb-3 rounded-xl border border-primary/30 bg-primary-subtle p-3" aria-label="AI 약속 카드">
            <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-primary-strong">
              <Sparkle size={16} weight="fill" /> AI 약속 카드
            </div>
            {aiGenerating ? (
              <p className="text-[14px] text-muted-foreground">대화를 살펴보고 약속 참여자를 정리하고 있어요.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {aiNotice && (
                  <p role="status" className="text-[14px] text-muted-foreground">{aiNotice}</p>
                )}
                {fallbackDraft && (
                  <div className="rounded-lg border border-primary/30 bg-surface p-3">
                    <p className="font-semibold">{fallbackCopy?.title ?? 'AI 초안을 만들지 못했습니다'}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {fallbackCopy?.body ?? '약속 내용을 직접 입력해 주세요.'}
                    </p>
                    <Link
                      to={`/chat/${roomIdNumber}/meeting/new?draftId=${fallbackDraft.draftId}&openChat=true`}
                      className="mt-2 inline-flex min-h-9 items-center text-[13px] font-semibold text-primary-strong"
                    >
                      직접 입력해서 약속 만들기
                    </Link>
                  </div>
                )}
                {availableAiDrafts.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {availableAiDrafts.map((card) => (
                      <Link
                        key={card.draftId}
                        to={`/chat/${roomIdNumber}/meeting/new?draftId=${card.draftId}&openChat=true`}
                        className="w-52 shrink-0 rounded-lg border border-primary/30 bg-surface p-3 hover:bg-primary-subtle"
                      >
                        <p className="font-semibold">{card.placeText?.trim() || '장소 미정'}</p>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          {formatDraftDateTime(card)}
                        </p>
                        <p className="mt-1 text-[13px] text-muted-foreground">참여 펫 {card.participantPetIds.length}마리</p>
                        <p className="mt-2 text-[13px] font-semibold text-primary-strong">확인하고 약속 만들기</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        {(sendError || leave.isError || remove.isError) && (
          <p role="alert" className="mb-2 text-[14px] text-destructive">
            {sendError ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const body = draft.trim()
            if (body && !send.isPending) {
              send.mutate({ clientMessageId: crypto.randomUUID(), body })
            }
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            aria-label="메시지 입력"
            placeholder="메시지를 입력하세요"
            className="min-h-11 w-full rounded-full border border-border bg-background px-4"
          />
          <button
            type="submit"
            aria-label="메시지 보내기"
            disabled={send.isPending || draft.trim().length === 0}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-50"
          >
            <PaperPlaneRight size={20} weight="fill" />
          </button>
        </form>
      </div>
    </div>
  )
}

function OpenMessageRow({
  message,
  activePetId,
}: {
  message: ChatMessage
  activePetId: number | null
}) {
  if (message.senderType === 'SYSTEM' || message.type === 'SYSTEM') {
    return <p className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">{message.body}</p>
  }
  const mine = message.senderPetId === activePetId
  if (message.type === 'CARD') {
    const inner = (
      <>
        <p className="flex items-center gap-1.5 font-semibold text-primary-strong">
          <CalendarPlus size={18} weight="bold" />약속 카드
        </p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {message.body ?? '약속이 잡혔습니다.'}
        </p>
      </>
    )
    const cardClass = 'max-w-[78%] rounded-2xl border-2 border-primary bg-surface px-4 py-3 transition-colors hover:bg-primary-subtle'
    return (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        {message.meetingCardId ? (
          <Link to={`/meeting-cards/${message.meetingCardId}`} className={cardClass}>
            {inner}
          </Link>
        ) : (
          <div className={cardClass}>{inner}</div>
        )}
      </div>
    )
  }
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className="flex max-w-[78%] flex-col gap-1">
        {!mine && (
          <span className="px-1 text-[13px] text-muted-foreground">
            {message.senderPetNickname ?? `반려견 #${message.senderPetId}`}
          </span>
        )}
        <div className={cn('whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5', mine ? 'bg-primary text-on-primary' : 'border border-border bg-surface')}>
          {message.body}
        </div>
        <span className={cn('text-[13px] tabular-nums text-muted-foreground', mine && 'self-end')}>
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[50dvh] place-items-center px-4 text-muted-foreground">{children}</div>
}

function RoomError({ error }: { error: unknown }) {
  const notParticipant = error instanceof ApiError && error.status === 404
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link to="/chat/open" className="inline-flex min-h-11 items-center gap-2 text-muted-foreground">
        <ArrowLeft size={20} /> 오픈채팅 목록
      </Link>
      <div role="alert" className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="font-semibold">채팅방에 들어갈 수 없습니다</p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {notParticipant ? '먼저 공개방 상세 화면에서 입장해 주세요.' : '잠시 후 다시 시도해 주세요.'}
        </p>
      </div>
    </div>
  )
}

function messageForSendError(error: unknown) {
  if (error instanceof ApiError && error.code === 'CHAT_SENDER_NOT_PARTICIPANT') {
    return '채팅방에 다시 입장한 뒤 메시지를 보내 주세요.'
  }
  return '메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

function formatDraftDateTime(draft: OpenChatCardDraft): string {
  const { date, time } = splitDraftDateTime(draft)
  if (!date && !time) return '시간 미정'
  if (!date) return formatTimeOnly(time)
  if (!time) return date
  return new Date(`${date}T${time}`).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatTimeOnly(time: string): string {
  const parsed = new Date(`1970-01-01T${time}`)
  if (Number.isNaN(parsed.getTime())) return time
  return parsed.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
