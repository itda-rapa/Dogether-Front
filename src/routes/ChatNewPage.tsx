import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Dog, MagnifyingGlass, SealCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/auth-context'
import { listFriends } from '@/features/friend/api'
import { listChatRooms } from '@/features/chat/api'

/**
 * 채팅방 생성.
 *
 * M1 의 DIRECT 방은 인사(GREETING) 또는 친구 관계로만 열린다. 임의로 방을
 * 만드는 API 는 계약에 없다. 그래서 이 화면은 방을 새로 만들지 않고, 이미
 * 친구 수락 시점에 만들어진 방을 찾아 이동시키는 역할만 한다. 아직 방이
 * 없는 친구는 선택은 되지만 이동할 곳이 없다는 안내만 나간다.
 */
export function ChatNewPage() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const petId = me?.activePetId ?? null

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const friends = useQuery({
    queryKey: ['friends', petId],
    queryFn: () => listFriends(petId as number),
    enabled: petId !== null,
    retry: false,
  })

  const rooms = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: () => listChatRooms({ limit: 100 }),
    enabled: petId !== null,
    retry: false,
  })

  const items = friends.data?.items ?? []
  const filtered = items.filter((f) => f.nickname.includes(query.trim()))

  const existingRoom = rooms.data?.items.find(
    (r) => r.counterpartPet.petId === selected,
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/chat" label="채팅" />
      <h1 className="mt-4 text-2xl font-bold">대화 상대 선택</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        친구로 연결된 강아지와 대화를 시작할 수 있습니다.
      </p>

      <div className="relative mt-6">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="friend-search" className="sr-only">
          친구 검색
        </label>
        <input
          id="friend-search"
          type="search"
          placeholder="닉네임으로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(inputClass(false), 'pl-11')}
        />
      </div>

      {petId === null ? (
        <div className="mt-6">
          <EmptyState
            title="대표 강아지를 먼저 지정해 주세요"
            description="채팅은 강아지 단위로 이루어집니다."
          />
        </div>
      ) : friends.isError ? (
        <div className="mt-6">
          <ApiErrorNotice
            error={friends.error}
            title="친구 목록을 불러오지 못했습니다"
            onRetry={() => void friends.refetch()}
          />
        </div>
      ) : friends.isPending ? (
        <ul className="mt-4 flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[76px] rounded-xl border border-border bg-surface" />
          ))}
        </ul>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-2">
            {filtered.map((f) => (
              <li key={f.petId}>
                <button
                  type="button"
                  aria-pressed={selected === f.petId}
                  onClick={() => setSelected(f.petId)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors',
                    selected === f.petId
                      ? 'border-primary bg-primary-subtle'
                      : 'border-border bg-surface hover:bg-primary-subtle',
                  )}
                >
                  <div
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
                  >
                    <Dog size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{f.nickname}</span>
                      {f.verified && (
                        <SealCheck
                          size={15}
                          weight="fill"
                          className="shrink-0 text-primary-strong"
                          aria-label="인증된 펫"
                        />
                      )}
                    </p>
                    <p className="truncate text-[14px] text-muted-foreground">
                      {f.publicTag}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {filtered.length === 0 && (
            <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              {items.length === 0 ? '아직 친구가 없습니다.' : '검색 결과가 없습니다.'}
            </p>
          )}

          {selected !== null && !rooms.isPending && !existingRoom && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              이 친구와는 아직 대화방이 없습니다. 셋로그에서 인사를 보내면 방이 만들어집니다.
            </p>
          )}
        </>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          disabled={selected === null || !existingRoom}
          onClick={() => existingRoom && navigate(`/chat/${existingRoom.roomId}`)}
        >
          대화 시작
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          취소
        </Button>
      </div>
    </div>
  )
}
