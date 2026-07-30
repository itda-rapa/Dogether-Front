import { useState } from 'react'
import { Dog, MagnifyingGlass } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { EmptyState } from '@/components/ui/EmptyState'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'

/**
 * 친구 추가.
 *
 * 계약상 진입점은 공개 태그(`몽이#A7K2`) 검색이다.
 * 차단 관계와 자기 소유 펫은 서버가 결과에서 제외한다.
 */
export function FriendSearchPage() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me/friends" label="친구" />
      <h1 className="mt-4 text-2xl font-bold">친구 추가</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        상대의 공개 태그를 정확히 입력해 주세요. 예: 봉이#B3X9
      </p>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSearched(true)
        }}
      >
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="tag-search" className="sr-only">
            공개 태그
          </label>
          <input
            id="tag-search"
            type="search"
            placeholder="봉이#B3X9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={30}
            className={cn(inputClass(false), 'pl-11')}
          />
        </div>
        <button
          type="submit"
          disabled={query.trim() === ''}
          className="min-h-11 shrink-0 rounded-lg bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          검색
        </button>
      </form>

      {searched && (
        <div className="mt-6">
          {query.includes('#') ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <div
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
              >
                <Dog size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">봉이</p>
                <p className="truncate text-[14px] text-muted-foreground">
                  {query}
                </p>
              </div>
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-lg bg-primary px-4 font-semibold text-on-primary transition-colors hover:bg-primary-hover"
              >
                친구 요청
              </button>
            </div>
          ) : (
            <EmptyState
              title="검색 결과가 없습니다"
              description="공개 태그는 닉네임과 #뒤 4자리로 이루어집니다."
            />
          )}
        </div>
      )}

      <div className="mt-8">
        <NotConnected
          endpoint="GET /pets/search?publicTag= · POST /friend-requests"
          note="친구는 양방향 동의입니다. 요청을 보낸 뒤 상대가 수락해야 연결됩니다."
        />
      </div>
    </div>
  )
}
