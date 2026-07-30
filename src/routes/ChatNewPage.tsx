import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Dog, MagnifyingGlass } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { NotConnected } from '@/components/ui/NotConnected'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'

/**
 * 채팅방 생성.
 *
 * M1 의 DIRECT 방은 인사(GREETING) 또는 친구 관계로만 열린다.
 * 임의로 방을 만드는 API 는 계약에 없으므로, 이 화면은 친구 목록에서 상대를
 * 골라 대화를 시작하는 진입점으로 둔다.
 */
export function ChatNewPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const filtered = PLACEHOLDER_FRIENDS.filter((f) =>
    f.nickname.includes(query.trim()),
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
                <p className="truncate font-semibold">{f.nickname}</p>
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
          검색 결과가 없습니다.
        </p>
      )}

      <div className="mt-8">
        <NotConnected
          endpoint="GET /pets/{petId}/friends"
          note="M1 계약에는 임의로 방을 만드는 API 가 없습니다. 방은 인사(GREETING) 또는 친구 관계로 생성됩니다."
        />
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          disabled={selected === null}
          onClick={() => navigate('/chat')}
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

const PLACEHOLDER_FRIENDS = [
  { petId: 2, nickname: '봉이', publicTag: '봉이#B3X9' },
  { petId: 3, nickname: '초록', publicTag: '초록#C1D4' },
]
