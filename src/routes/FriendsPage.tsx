import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dog, UserPlus, SealCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/auth-context'
import {
  listFriends,
  listReceivedRequests,
  listSentRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  deleteFriend,
  type FriendRequest,
} from '@/features/friend/api'
import type { PetSearchItem } from '@/features/chat/types'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

type Tab = 'friends' | 'received' | 'sent'

const TABS: { key: Tab; label: string }[] = [
  { key: 'friends', label: '친구' },
  { key: 'received', label: '받은 요청' },
  { key: 'sent', label: '보낸 요청' },
]

/**
 * 친구 화면.
 *
 * 친구는 양방향 동의라 "보낸 요청"이 반드시 보여야 한다. 내가 보낸 게 대기 중인지
 * 거절됐는지 알 수 없으면 같은 사람에게 계속 요청을 보내게 된다.
 */
export function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />

      <div className="mt-4 flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">친구</h1>
        <Link
          to="/me/friends/search"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          <UserPlus size={20} weight="bold" />
          추가
        </Link>
      </div>

      <div role="tablist" aria-label="친구 분류" className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'min-h-11 flex-1 rounded-full border px-4 font-medium transition-colors',
              tab === t.key
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'friends' && <FriendList />}
        {tab === 'received' && <ReceivedList />}
        {tab === 'sent' && <SentList />}
      </div>
    </div>
  )
}

function FriendList() {
  const { me } = useAuth()
  const petId = me?.activePetId ?? null
  const queryClient = useQueryClient()

  const friends = useQuery({
    queryKey: ['friends', petId],
    queryFn: () => listFriends(petId as number),
    enabled: petId !== null,
    retry: false,
  })

  const remove = useMutation({
    mutationFn: (friendPetId: number) => deleteFriend(petId as number, friendPetId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['friends', petId] }),
  })

  // Active Pet 이 없으면 목록 자체가 성립하지 않는다. 에러가 아니라 안내로 처리한다.
  if (petId === null) {
    return (
      <EmptyState
        title="대표 강아지를 먼저 지정해 주세요"
        description="친구는 강아지 단위로 맺어집니다."
      />
    )
  }

  if (friends.isError) {
    return (
      <ApiErrorNotice
        error={friends.error}
        title="친구 목록을 불러오지 못했습니다"
        onRetry={() => void friends.refetch()}
      />
    )
  }

  if (friends.isPending) return <ListSkeleton />

  const items = friends.data.items

  if (items.length === 0) {
    return (
      <EmptyState
        title="아직 친구가 없습니다"
        description="공개 태그로 검색해 친구를 추가해 보세요."
      />
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((f) => (
          <li
            key={f.petId}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <Avatar />
            <Info pet={f} />
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`${f.nickname}과(와) 친구를 끊을까요? 대화 이력은 남지만 다시 메시지를 보내려면 재요청이 필요합니다.`)) {
                  remove.mutate(f.petId)
                }
              }}
              className="min-h-11 shrink-0 rounded-lg border border-border px-3 font-medium text-muted-foreground transition-colors hover:bg-primary-subtle disabled:opacity-50"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      <ActionError error={remove.error} />
      {friends.data.page.hasNext && <MoreHint />}
    </>
  )
}

function ReceivedList() {
  const queryClient = useQueryClient()
  const received = useQuery({
    queryKey: ['friend-requests', 'received'],
    queryFn: () => listReceivedRequests(),
    retry: false,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['friends'] })
  }

  const accept = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: invalidate,
  })

  if (received.isError) {
    return (
      <ApiErrorNotice
        error={received.error}
        title="받은 요청을 불러오지 못했습니다"
        onRetry={() => void received.refetch()}
      />
    )
  }

  if (received.isPending) return <ListSkeleton />

  // 대기중인 것만 조작 대상이다. 만료·처리완료 건은 상태 배지로만 남긴다.
  const items = received.data.items

  if (items.length === 0) {
    return <EmptyState title="받은 요청이 없습니다" />
  }

  const pending = accept.isPending || reject.isPending

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <li
            key={r.requestId}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <Avatar />
            <Info pet={r.requesterPet} />
            {r.status === 'PENDING' ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => accept.mutate(r.requestId)}
                  className="min-h-11 shrink-0 rounded-lg bg-primary px-3 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  수락
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => reject.mutate(r.requestId)}
                  className="min-h-11 shrink-0 rounded-lg border border-border px-3 font-medium text-muted-foreground transition-colors hover:bg-primary-subtle disabled:opacity-50"
                >
                  거절
                </button>
              </>
            ) : (
              <StatusBadge status={r.status} />
            )}
          </li>
        ))}
      </ul>
      <ActionError error={accept.error ?? reject.error} />
      {received.data.page.hasNext && <MoreHint />}
    </>
  )
}

function SentList() {
  const queryClient = useQueryClient()
  const sent = useQuery({
    queryKey: ['friend-requests', 'sent'],
    queryFn: () => listSentRequests(),
    retry: false,
  })

  const cancel = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['friend-requests'] }),
  })

  if (sent.isError) {
    return (
      <ApiErrorNotice
        error={sent.error}
        title="보낸 요청을 불러오지 못했습니다"
        onRetry={() => void sent.refetch()}
      />
    )
  }

  if (sent.isPending) return <ListSkeleton />

  const items = sent.data.items

  if (items.length === 0) {
    return <EmptyState title="보낸 요청이 없습니다" />
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <li
            key={r.requestId}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <Avatar />
            <Info pet={r.targetPet} />
            <StatusBadge status={r.status} />
            {r.status === 'PENDING' && (
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(r.requestId)}
                className="min-h-11 shrink-0 rounded-lg border border-border px-3 font-medium text-muted-foreground transition-colors hover:bg-primary-subtle disabled:opacity-50"
              >
                취소
              </button>
            )}
          </li>
        ))}
      </ul>
      <ActionError error={cancel.error} />
      {sent.data.page.hasNext && <MoreHint />}
    </>
  )
}

const STATUS_LABEL: Record<FriendRequest['status'], string> = {
  PENDING: '대기 중',
  ACCEPTED: '수락됨',
  REJECTED: '거절됨',
  CANCELED: '취소됨',
  EXPIRED: '만료됨',
}

function StatusBadge({ status }: { status: FriendRequest['status'] }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-3 py-1 text-[13px] font-medium',
        status === 'PENDING'
          ? 'bg-primary-subtle text-primary-strong'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function Avatar() {
  return (
    <div
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
    >
      <Dog size={22} />
    </div>
  )
}

function Info({ pet }: { pet: PetSearchItem }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 font-semibold">
        <span className="truncate">{pet.nickname}</span>
        {pet.verified && (
          <SealCheck
            size={15}
            weight="fill"
            className="shrink-0 text-primary-strong"
            aria-label="인증된 펫"
          />
        )}
      </p>
      <p className="truncate text-[14px] text-muted-foreground">
        {pet.publicTag}
      </p>
    </div>
  )
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-[76px] rounded-xl border border-border bg-surface"
        />
      ))}
    </ul>
  )
}

/** 커서 페이지네이션은 아직 붙이지 않았다. 다음 장이 있다는 사실만 알린다. */
function MoreHint() {
  return (
    <p className="mt-4 text-center text-[13px] text-muted-foreground">
      더 있습니다. 다음 장 불러오기는 아직 구현 전입니다.
    </p>
  )
}

function ActionError({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <p role="alert" className="mt-3 text-[14px] text-destructive">
      {toActionMessage(error)}
    </p>
  )
}

function toActionMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return '요청을 처리하지 못했습니다.'
  if (e.status === 404) return '이미 처리되었거나 없는 요청입니다.'
  if (e.status === 409) return '이미 친구이거나 상태가 바뀐 요청입니다.'
  if (e.status === 403) return '대표 강아지를 지정해야 처리할 수 있습니다.'
  return '요청을 처리하지 못했습니다.'
}
