import { useState } from 'react'
import { Link } from 'react-router'
import { Dog, UserPlus } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { EmptyState } from '@/components/ui/EmptyState'
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

      <div className="mt-8">
        <NotConnected
          endpoint={
            tab === 'friends'
              ? 'GET /pets/{petId}/friends · DELETE /pets/{petId}/friends/{friendPetId}'
              : tab === 'received'
                ? 'GET /friend-requests/received · POST /friend-requests/{id}/accept · reject'
                : 'GET /friend-requests/sent · DELETE /friend-requests/{id}'
          }
        />
      </div>
    </div>
  )
}

function FriendList() {
  if (PLACEHOLDER_FRIENDS.length === 0) {
    return (
      <EmptyState
        title="아직 친구가 없습니다"
        description="공개 태그로 검색해 친구를 추가해 보세요."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {PLACEHOLDER_FRIENDS.map((f) => (
        <li
          key={f.petId}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <Avatar />
          <Info nickname={f.nickname} publicTag={f.publicTag} />
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg border border-border px-3 font-medium text-muted-foreground transition-colors hover:bg-primary-subtle"
          >
            삭제
          </button>
        </li>
      ))}
    </ul>
  )
}

function ReceivedList() {
  return (
    <ul className="flex flex-col gap-2">
      {PLACEHOLDER_RECEIVED.map((r) => (
        <li
          key={r.requestId}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <Avatar />
          <Info nickname={r.nickname} publicTag={r.publicTag} />
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg bg-primary px-3 font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            수락
          </button>
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg border border-border px-3 font-medium text-muted-foreground transition-colors hover:bg-primary-subtle"
          >
            거절
          </button>
        </li>
      ))}
    </ul>
  )
}

function SentList() {
  if (PLACEHOLDER_SENT.length === 0) {
    return <EmptyState title="보낸 요청이 없습니다" />
  }

  return (
    <ul className="flex flex-col gap-2">
      {PLACEHOLDER_SENT.map((r) => (
        <li
          key={r.requestId}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <Avatar />
          <Info nickname={r.nickname} publicTag={r.publicTag} />
          <span className="shrink-0 rounded-full bg-primary-subtle px-3 py-1 text-[13px] font-medium text-primary">
            대기 중
          </span>
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-lg border border-border px-3 font-medium text-muted-foreground transition-colors hover:bg-primary-subtle"
          >
            취소
          </button>
        </li>
      ))}
    </ul>
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

function Info({ nickname, publicTag }: { nickname: string; publicTag: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold">{nickname}</p>
      <p className="truncate text-[14px] text-muted-foreground">{publicTag}</p>
    </div>
  )
}

const PLACEHOLDER_FRIENDS = [
  { petId: 2, nickname: '봉이', publicTag: '봉이#B3X9' },
  { petId: 3, nickname: '초록', publicTag: '초록#C1D4' },
]
const PLACEHOLDER_RECEIVED = [
  { requestId: 1, nickname: '하양', publicTag: '하양#E5F1' },
]
const PLACEHOLDER_SENT = [
  { requestId: 2, nickname: '노랑', publicTag: '노랑#F2A8' },
]
