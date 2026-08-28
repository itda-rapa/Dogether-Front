import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarPlus, Dog, MapPin, PaperPlaneRight, Path, SignOut, Sparkle, Trash, UserPlus, UsersThree, X } from '@phosphor-icons/react'
import { useAuth } from '@/features/auth/auth-context'
import {
  deleteOpenChatRoom,
  decidePlaceIntent,
  getOpenChatRoom,
  inviteFriendToOpenChat,
  leaveOpenChatRoom,
  listChatMessages,
  listOpenChatParticipants,
  requestOpenChatCardDraft,
  requestOpenChatAiRoute,
  sendChatMessage,
  shareRouteToOpenChat,
} from '@/features/chat/api'
import { listFriends } from '@/features/friend/api'
import { formatTime, mergeMessages, type ChatMessage } from '@/features/chat/types'
import { subscribeToChatRoom, type OpenChatDraftNotification } from '@/features/chat/realtime'
import type { OpenChatCardDraft } from '@/features/chat/api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { FALLBACK_MESSAGE, splitDraftDateTime } from '@/features/meeting/types'
import {
  detectPlaceKeyword,
  keywordFromPlaceType,
  placeTypeFromKeyword,
} from '@/features/chat/placeSuggestion'
import { InlineFacilityMap } from '@/features/chat/InlineFacilityMap'
import { SharedFacilityMapMessage } from '@/features/chat/SharedFacilityMapMessage'
import { InlineRouteMapMessage } from '@/features/chat/InlineRouteMapMessage'
import { getRoute, saveRoute } from '@/features/route/api'
import { subscribeToRouteStatus } from '@/features/route/realtime'
import type { RouteResult } from '@/features/route/types'

const FALLBACK_POLL_MS = 10_000

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
  const [aiRouteGenerating, setAiRouteGenerating] = useState(false)
  const [aiRouteNotice, setAiRouteNotice] = useState<string | null>(null)
  const [aiRouteRequestId, setAiRouteRequestId] = useState<string | null>(null)
  const [aiRoutePreview, setAiRoutePreview] = useState<RouteResult | null>(null)
  const [dismissedPlaceMessageId, setDismissedPlaceMessageId] = useState<number | null>(null)
  const [approvedPlaceMessageId, setApprovedPlaceMessageId] = useState<number | null>(null)
  const [placeConsentMessage, setPlaceConsentMessage] = useState<ChatMessage | null>(null)
  const afterRef = useRef<number | null>(null)
  const bottomRef = useRef<HTMLLIElement | null>(null)
  const latestDraftRequestIdRef = useRef<string | null>(null)
  const sharingAiRouteIdsRef = useRef(new Set<string>())

  useEffect(() => {
    setMessages([])
    afterRef.current = null
    setAiDrafts([])
    setAiNotice(null)
    setAiGenerating(false)
    setAiRouteGenerating(false)
    setAiRouteNotice(null)
    setAiRouteRequestId(null)
    setAiRoutePreview(null)
    setDismissedPlaceMessageId(null)
    setApprovedPlaceMessageId(null)
    setPlaceConsentMessage(null)
    latestDraftRequestIdRef.current = null
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

  const applyDraftNotification = useCallback((notification: OpenChatDraftNotification) => {
    if (notification.roomId !== roomIdNumber) return
    if (
      latestDraftRequestIdRef.current == null ||
      notification.requestId !== latestDraftRequestIdRef.current
    ) return
    latestDraftRequestIdRef.current = null
    setAiGenerating(false)
    if (notification.status === 'FAILED') {
      setAiDrafts([])
      setAiNotice(notification.message ?? 'AI 약속 카드를 만들지 못했습니다.')
      return
    }
    const drafts: OpenChatCardDraft[] = notification.drafts.map((draft) => ({
      ...draft,
      participants: [],
    }))
    setAiDrafts(drafts)
    setAiNotice(drafts.length === 0 ? '표시할 약속 카드가 없습니다.' : null)
    queryClient.setQueryData(['card-draft', String(roomIdNumber)], drafts)
  }, [queryClient, roomIdNumber])

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
      (notification) => applyDraftNotification(notification),
    )
  }, [applyDraftNotification, roomIdNumber, room.isSuccess, valid])

  const markAiRouteReady = useCallback((route: RouteResult) => {
    setAiRoutePreview(route)
    setAiRouteGenerating(false)
    setAiRouteNotice('AI 경로가 완성되었습니다. 확인 후 채팅방 공유 여부를 선택해 주세요.')
  }, [])

  const loadAiRoutePreview = useCallback(async (requestId: string) => {
    try {
      const route = await getRoute(requestId)
      if (route.status === 'COMPLETED') markAiRouteReady(route)
    } catch (error) {
      setAiRouteGenerating(false)
      setAiRouteNotice(error instanceof ApiError ? error.message : '완성된 AI 경로를 불러오지 못했습니다.')
    }
  }, [markAiRouteReady])

  const confirmAiRouteShare = useCallback(async (requestId: string) => {
    if (sharingAiRouteIdsRef.current.has(requestId)) return
    sharingAiRouteIdsRef.current.add(requestId)
    try {
      await saveRoute(requestId)
      const shared = await shareRouteToOpenChat(roomIdNumber, {
        routeId: requestId,
        clientMessageId: `ai-route:${requestId}`,
      })
      setMessages((previous) => mergeMessages(previous, [shared]))
      afterRef.current = Math.max(afterRef.current ?? 0, shared.messageId)
      setAiRouteRequestId(null)
      setAiRoutePreview(null)
      setAiRouteGenerating(false)
      setAiRouteNotice('AI가 만든 경로를 채팅방에 공유했습니다.')
    } catch (error) {
      sharingAiRouteIdsRef.current.delete(requestId)
      setAiRouteGenerating(false)
      setAiRouteNotice(error instanceof ApiError ? error.message : '완성된 AI 경로를 공유하지 못했습니다.')
    }
  }, [roomIdNumber])

  useEffect(() => {
    if (!valid || !room.isSuccess) return
    return subscribeToRouteStatus((event) => {
      if (event.requestId !== aiRouteRequestId) return
      if (event.status === 'FAILED') {
        setAiRouteRequestId(null)
        setAiRouteGenerating(false)
        setAiRouteNotice('AI 경로 계산에 실패했습니다. 대화 속 장소를 더 구체적으로 적어 주세요.')
        return
      }
      void loadAiRoutePreview(event.requestId)
    })
  }, [aiRouteRequestId, loadAiRoutePreview, room.isSuccess, valid])

  useEffect(() => {
    if (!aiRouteRequestId || aiRoutePreview) return
    const timer = window.setInterval(() => {
      void getRoute(aiRouteRequestId).then((route) => {
        if (route.status === 'COMPLETED') markAiRouteReady(route)
        if (route.status === 'FAILED') {
          setAiRouteRequestId(null)
          setAiRouteGenerating(false)
          setAiRouteNotice('AI 경로 계산에 실패했습니다. 대화 속 장소를 더 구체적으로 적어 주세요.')
        }
      }).catch(() => undefined)
    }, 2_000)
    return () => window.clearInterval(timer)
  }, [aiRoutePreview, aiRouteRequestId, markAiRouteReady])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  // 카드가 실제로 만들어지면(내가 만들었든, 다른 참여자가 만들었든) 화면에 남아있던
  // AI 초안 패널을 지운다. 그대로 두면 이미 소비된 초안이 계속 떠 있는 것처럼 보인다.
  useEffect(() => {
    if (messages.at(-1)?.type !== 'CARD') return
    setAiDrafts([])
    setAiNotice(null)
  }, [messages])

  const send = useMutation({
    mutationFn: (message: { clientMessageId: string; body: string }) =>
      sendChatMessage(roomIdNumber, message),
    onSuccess: (message) => {
      setMessages((previous) => mergeMessages(previous, [message]))
      afterRef.current = Math.max(afterRef.current ?? 0, message.messageId)
      const needsPlaceConsent =
        message.type === 'TEXT' &&
        message.senderPetId === me?.activePetId &&
        detectPlaceKeyword(message.body ?? '') != null
      if (needsPlaceConsent && me?.activePetId != null) {
        latestDraftRequestIdRef.current = null
        setAiGenerating(false)
        setAiNotice(null)
        setAiDrafts([])
        setPlaceConsentMessage(message)
        sessionStorage.setItem(
          placeConsentStorageKey(roomIdNumber, me.activePetId),
          String(message.messageId),
        )
        setDismissedPlaceMessageId(null)
        setApprovedPlaceMessageId(null)
      }
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
    onSuccess: (result) => {
      latestDraftRequestIdRef.current = result.requestId
      setAiNotice('대화를 살펴보고 약속 참여자를 정리하고 있어요.')
    },
    onError: (error) => {
      setAiGenerating(false)
      setAiNotice(error instanceof ApiError ? error.message : 'AI 약속 카드를 요청하지 못했습니다.')
    },
  })
  const requestAiRoute = useMutation({
    mutationFn: () => requestOpenChatAiRoute(roomIdNumber),
    onMutate: () => {
      setAiRouteGenerating(true)
      setAiRoutePreview(null)
      setAiRouteNotice('최근 메시지 30개에서 운동 종류와 경로 조건을 찾고 있습니다.')
    },
    onSuccess: (result) => {
      setAiRouteRequestId(result.requestId)
      const label = result.activityType === 'RUN' ? '러닝' : result.activityType === 'CYCLE' ? '자전거' : '걷기'
      setAiRouteNotice(result.routeMode === 'ROUND_TRIP'
        ? `${result.start}에서 출발하는 ${result.targetDistanceKm ?? ''}km ${label} 왕복 코스를 계산하고 있습니다.`
        : `${result.start}에서 ${result.destination}까지 ${label} 경로를 계산하고 있습니다.`)
    },
    onError: (error) => {
      setAiRouteGenerating(false)
      setAiRouteNotice(error instanceof ApiError ? error.message : 'AI 경로를 요청하지 못했습니다.')
    },
  })
  const friends = useQuery({
    queryKey: ['friends', me?.activePetId, 'open-chat-invite'],
    queryFn: () => listFriends(me!.activePetId!, null, 100),
    enabled: inviteOpen && me?.activePetId != null,
    retry: false,
  })
  const participants = useQuery({
    queryKey: ['chat', 'open', roomIdNumber, 'participants'],
    queryFn: () => listOpenChatParticipants(roomIdNumber),
    enabled: inviteOpen && valid,
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
      void participants.refetch()
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

  const detectedPlaceKeyword =
    placeConsentMessage?.type === 'TEXT' &&
    placeConsentMessage.senderType === 'PET' &&
    placeConsentMessage.senderPetId === me?.activePetId &&
    placeConsentMessage.body
      ? detectPlaceKeyword(placeConsentMessage.body)
      : null

  useEffect(() => {
    if (me?.activePetId == null || placeConsentMessage != null) return
    const storedMessageId = Number(
      sessionStorage.getItem(
        placeConsentStorageKey(roomIdNumber, me.activePetId),
      ),
    )
    if (!Number.isInteger(storedMessageId) || storedMessageId <= 0) return
    const storedMessage = messages.find(
      (message) =>
        message.messageId === storedMessageId &&
        message.type === 'TEXT' &&
        message.senderPetId === me.activePetId &&
        detectPlaceKeyword(message.body ?? '') != null,
    )
    if (storedMessage) setPlaceConsentMessage(storedMessage)
  }, [me?.activePetId, messages, placeConsentMessage, roomIdNumber])
  const detectedFacilityCategory = detectedPlaceKeyword
    ? placeTypeFromKeyword(detectedPlaceKeyword)
    : null
  const shouldRequestPlaceIntent =
    detectedPlaceKeyword != null &&
    placeConsentMessage != null &&
    placeConsentMessage.messageId !== dismissedPlaceMessageId &&
    me != null &&
    detectedFacilityCategory != null
  const placeIntent = useQuery({
    queryKey: ['chat', 'place-intent', roomIdNumber, placeConsentMessage?.messageId],
    queryFn: () => decidePlaceIntent(roomIdNumber, placeConsentMessage!.messageId),
    enabled: valid && room.isSuccess && shouldRequestPlaceIntent,
    retry: false,
    staleTime: Infinity,
  })
  const confirmedPlaceKeyword = placeIntent.data?.decision === 'SHOW'
    ? keywordFromPlaceType(placeIntent.data.placeType)
    : null
  const confirmedFacilityCategory = placeIntent.data?.decision === 'SHOW'
    ? placeIntent.data.placeType
    : null
  const showFacilityConsent =
    confirmedPlaceKeyword != null &&
    confirmedFacilityCategory != null &&
    shouldRequestPlaceIntent &&
    placeConsentMessage?.senderPetId === me?.activePetId &&
    approvedPlaceMessageId !== placeConsentMessage?.messageId
  const showFacilityMap =
    confirmedPlaceKeyword != null &&
    confirmedFacilityCategory != null &&
    shouldRequestPlaceIntent &&
    placeConsentMessage?.senderPetId === me?.activePetId &&
    approvedPlaceMessageId === placeConsentMessage?.messageId
  const placeFlowActive = showFacilityConsent || showFacilityMap
  const dismissFacilityMap = () => {
    if (placeConsentMessage) setDismissedPlaceMessageId(placeConsentMessage.messageId)
    if (me?.activePetId != null) {
      sessionStorage.removeItem(
        placeConsentStorageKey(roomIdNumber, me.activePetId),
      )
    }
    setPlaceConsentMessage(null)
  }
  const applySharedMapMessage = useCallback((message: ChatMessage) => {
    setMessages((previous) => mergeMessages(previous, [message]))
    afterRef.current = Math.max(afterRef.current ?? 0, message.messageId)
    if (me?.activePetId != null) {
      sessionStorage.removeItem(
        placeConsentStorageKey(roomIdNumber, me.activePetId),
      )
    }
    setPlaceConsentMessage(null)
    setApprovedPlaceMessageId(null)
  }, [me?.activePetId, roomIdNumber])

  if (!valid) return <Centered>잘못된 채팅방입니다.</Centered>
  if (room.isPending) return <Centered>채팅방을 불러오는 중…</Centered>
  if (room.isError) return <RoomError error={room.error} />

  const isOwner = room.data.ownerPetId === me?.activePetId
  const availableAiDrafts = aiDrafts.filter((candidate) => !candidate.fallback)
  const fallbackDraft = aiDrafts.find((candidate) => candidate.fallback)
  const fallbackCopy = fallbackDraft?.fallbackReason
    ? FALLBACK_MESSAGE[fallbackDraft.fallbackReason]
    : null
  const participantPetIds = new Set(participants.data?.map((participant) => participant.petId) ?? [])
  const invitableFriends = friends.data?.items.filter((friend) => !participantPetIds.has(friend.petId)) ?? []

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
          aria-label="대화로 AI 경로 만들기"
          title="최근 대화로 AI 경로 만들기"
          disabled={aiRouteGenerating || requestAiRoute.isPending}
          onClick={() => requestAiRoute.mutate()}
          className="grid size-11 place-items-center rounded-lg text-primary-strong hover:bg-primary-subtle disabled:opacity-50"
        >
          <Path size={21} weight="bold" />
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
        <section
          className="absolute right-3 top-[4.25rem] z-30 w-[min(24rem,calc(100%-1.5rem))] rounded-2xl border border-border bg-surface p-4 shadow-xl"
          aria-label="현재 참여자와 친구 초대"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">채팅방 참여자</h2>
              <p className="text-[13px] text-muted-foreground">현재 참여 중인 사용자와 초대 가능한 친구입니다.</p>
            </div>
            <button
              type="button"
              aria-label="참여자 팝업 닫기"
              onClick={() => setInviteOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mb-3 rounded-xl bg-primary-subtle p-3">
            <p className="mb-2 text-[13px] font-semibold text-primary-strong">
              현재 참여 중 {participants.data?.length ?? 0}명
            </p>
            {participants.isPending ? (
              <p className="py-2 text-[13px] text-muted-foreground">참여자를 불러오는 중…</p>
            ) : participants.isError ? (
              <p role="alert" className="py-2 text-[13px] text-destructive">참여자 목록을 불러오지 못했습니다.</p>
            ) : participants.data.length === 0 ? (
              <p className="py-2 text-[13px] text-muted-foreground">현재 참여자가 없습니다.</p>
            ) : (
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                {participants.data.map((participant) => (
                  <li key={participant.petId} className="flex items-center gap-3 rounded-lg bg-surface/80 px-2 py-2">
                    {participant.profileUrl ? (
                      <img src={participant.profileUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Dog size={19} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">{participant.nickname}</span>
                    {participant.petId === me?.activePetId && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[12px] font-semibold text-on-primary">나</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <h3 className="mb-1 text-[14px] font-semibold">친구 초대</h3>
          {inviteNotice && (
            <p role="status" className="mb-2 text-[14px] text-muted-foreground">{inviteNotice}</p>
          )}
          {friends.isPending ? (
            <p className="py-3 text-[14px] text-muted-foreground">친구 목록을 불러오는 중…</p>
          ) : friends.isError ? (
            <p role="alert" className="py-3 text-[14px] text-destructive">친구 목록을 불러오지 못했습니다.</p>
          ) : invitableFriends.length === 0 ? (
            <p className="py-3 text-[14px] text-muted-foreground">초대할 친구가 없습니다.</p>
          ) : (
            <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto">
              {invitableFriends.map((friend) => (
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
            {showFacilityConsent && message.messageId === placeConsentMessage?.messageId && confirmedPlaceKeyword && (
              <section
                className="mt-2 rounded-2xl border border-primary/30 bg-surface p-3 shadow-sm"
                aria-label="지도 공유 확인"
              >
                <p className="flex items-center gap-2 font-semibold">
                  <MapPin size={19} weight="fill" className="text-primary-strong" />
                  주변 {confirmedPlaceKeyword} 지도를 채팅방에 공유할까요?
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  승인하면 현재 위치를 확인한 뒤 가까운 시설 5곳을 메시지로 공유합니다.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={dismissFacilityMap}
                    className="min-h-11 rounded-lg border border-border font-semibold hover:bg-muted"
                  >
                    공유 안 함
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovedPlaceMessageId(message.messageId)}
                    className="min-h-11 rounded-lg bg-primary font-semibold text-on-primary hover:bg-primary-hover"
                  >
                    지도 공유
                  </button>
                </div>
              </section>
            )}
            {showFacilityMap && message.messageId === placeConsentMessage?.messageId && confirmedPlaceKeyword && confirmedFacilityCategory && (
              <InlineFacilityMap
                roomId={roomIdNumber}
                triggerMessageId={message.messageId}
                keyword={confirmedPlaceKeyword}
                category={confirmedFacilityCategory}
                onDismiss={dismissFacilityMap}
                onShared={applySharedMapMessage}
              />
            )}
          </li>
        ))}
        <li ref={bottomRef} />
      </ul>

      <div className="border-t border-border bg-surface p-3">
        {aiRouteNotice && (
          <section className="mb-3 rounded-xl border border-primary/30 bg-primary-subtle p-3" aria-label="AI 경로 생성 상태">
            <div className="flex items-start gap-2">
            <Path className="mt-0.5 shrink-0 text-primary-strong" size={18} weight="bold" />
            <p role="status" className="min-w-0 flex-1 text-[14px] text-muted-foreground">{aiRouteNotice}</p>
            {!aiRouteGenerating && !aiRoutePreview && (
              <button type="button" aria-label="AI 경로 알림 닫기" onClick={() => setAiRouteNotice(null)} className="grid size-7 shrink-0 place-items-center rounded-lg hover:bg-primary/20"><X size={15} /></button>
            )}
            </div>
            {aiRoutePreview && aiRouteRequestId && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-surface p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-muted-foreground">거리</span><br /><strong>{aiRoutePreview.totalDistanceMeters == null ? '-' : `${(aiRoutePreview.totalDistanceMeters / 1000).toFixed(2)} km`}</strong></p>
                  <p><span className="text-muted-foreground">예상시간</span><br /><strong>{aiRoutePreview.durationMinutes == null ? '-' : `${Math.round(aiRoutePreview.durationMinutes)}분`}</strong></p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => void confirmAiRouteShare(aiRouteRequestId)} className="min-h-10 flex-1 rounded-lg bg-primary px-3 font-semibold text-primary-foreground">채팅방에 공유</button>
                  <button type="button" onClick={() => { setAiRouteRequestId(null); setAiRoutePreview(null); setAiRouteNotice('AI 경로 공유를 취소했습니다.') }} className="min-h-10 rounded-lg border border-border bg-surface px-4 font-semibold">취소</button>
                </div>
              </div>
            )}
          </section>
        )}
        {!placeFlowActive && (aiGenerating || aiNotice || aiDrafts.length > 0) && (
          <section className="mb-3 rounded-xl border border-primary/30 bg-primary-subtle p-3" aria-label="AI 약속 카드">
            <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-primary-strong">
              <Sparkle size={16} weight="fill" /> AI 약속 카드
              <button
                type="button"
                aria-label="AI 약속 카드 닫기"
                onClick={() => {
                  setAiDrafts([])
                  setAiNotice(null)
                }}
                className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/20"
              >
                <X size={16} />
              </button>
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
                        <p className="mt-1 text-[13px] text-muted-foreground">참여 인원 {card.participantPetIds.length}명</p>
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
  if (message.type === 'ROUTE_SHARE' && message.sharedRouteId) {
    return (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[82%] rounded-2xl border-2 border-primary bg-surface px-4 py-3">
          <p className="flex items-center gap-1.5 font-semibold text-primary-strong">
            <MapPin size={18} weight="fill" />공유 경로
          </p>
          <p className="mt-1 text-[14px] text-muted-foreground">지도와 거리·예상시간을 확인해 보세요.</p>
          <InlineRouteMapMessage roomId={message.roomId} routeId={message.sharedRouteId} />
          <div className="mt-3 flex gap-2">
            <Link className="rounded-lg border border-border px-3 py-2 text-sm font-semibold" to={`/chat/${message.roomId}/meeting/new?openChat=true&routeRequestId=${message.sharedRouteId}`}>
              이 경로로 약속
            </Link>
          </div>
        </div>
      </div>
    )
  }
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
  if (message.type === 'MAP' && message.map) {
    return (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        <div className="flex w-full max-w-[92%] flex-col gap-1">
          {!mine && (
            <span className="px-1 text-[13px] text-muted-foreground">
              {message.senderPetNickname ?? `반려견 #${message.senderPetId}`}
            </span>
          )}
          <SharedFacilityMapMessage
            map={message.map}
            roomId={message.roomId}
            messageId={message.messageId}
            senderNickname={message.senderPetNickname}
          />
          <span className={cn('text-[13px] tabular-nums text-muted-foreground', mine && 'self-end')}>
            {formatTime(message.createdAt)}
          </span>
        </div>
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

function placeConsentStorageKey(roomId: number, activePetId: number) {
  return `chat:map-consent:${roomId}:pet:${activePetId}`
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
