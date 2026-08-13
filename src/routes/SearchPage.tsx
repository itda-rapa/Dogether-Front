import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { Dog, MagnifyingGlass, SealCheck } from '@phosphor-icons/react'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { EmptyState } from '@/components/ui/EmptyState'
import { searchPetByPublicTag } from '@/features/pet/api'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'

const SCOPES = ['게시글', '장소', '강아지'] as const

/**
 * 통합 검색.
 *
 * 현재 백엔드에서 제공하는 검색은 공개 태그를 이용한 펫 정확 검색뿐이다.
 * 게시글·장소 검색 API가 추가되면 각 탭을 같은 방식으로 연결한다.
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const scope = params.get('scope') ?? '강아지'
  const [query, setQuery] = useState(q)
  const petSearch = useMutation({
    mutationFn: searchPetByPublicTag,
  })

  // 주소 직접 진입·뒤로가기 때만 입력값을 주소와 동기화한다.
  // 매 입력마다 setSearchParams를 호출하면 한글 IME 조합이 끊길 수 있다.
  useEffect(() => setQuery(q), [q])

  const isPetSearch = scope === '강아지'
  const pet = petSearch.data ?? null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/" label="홈" />
      <h1 className="mt-4 text-2xl font-bold">검색</h1>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const term = query.trim()
          setParams({ q: term, scope })
          if (isPetSearch && term !== '') petSearch.mutate(term)
        }}
      >
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="search-input" className="sr-only">
            {isPetSearch ? '공개 태그' : '검색어'}
          </label>
          <input
            id="search-input"
            type="search"
            placeholder={isPetSearch ? '예: 봉이#B3X9' : '무엇을 찾으시나요?'}
            value={query}
            onChange={(e) => {
              petSearch.reset()
              setQuery(e.target.value)
            }}
            maxLength={isPetSearch ? 30 : undefined}
            className={cn(inputClass(false), 'pl-11')}
          />
        </div>
        <button
          type="submit"
          disabled={!isPetSearch || query.trim() === '' || petSearch.isPending}
          className="min-h-11 shrink-0 rounded-lg bg-primary px-5 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {petSearch.isPending ? '검색 중…' : '검색'}
        </button>
      </form>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {SCOPES.map((s) => (
          <button
            key={s}
            aria-pressed={scope === s}
            onClick={() => {
              petSearch.reset()
              setParams({ q: query, scope: s })
            }}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-4 font-medium transition-colors',
              scope === s
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {query.trim() === '' ? (
          <EmptyState
            title={isPetSearch ? '공개 태그를 입력해 주세요' : '검색어를 입력해 주세요'}
            description={
              isPetSearch
                ? '강아지의 공개 태그를 정확히 입력해 주세요. 예: 봉이#B3X9'
                : '검색 API가 연결되면 이 탭에서 결과를 보여드립니다.'
            }
          />
        ) : !isPetSearch ? (
          <NotConnected
            endpoint={`${scope} 검색 API 미정`}
            note="현재 백엔드 계약에는 게시글·장소 검색 API가 없습니다."
          />
        ) : petSearch.isError ? (
          <ApiErrorNotice
            error={petSearch.error}
            title="강아지를 검색하지 못했습니다"
            onRetry={() => petSearch.mutate(query.trim())}
          />
        ) : petSearch.isSuccess && pet ? (
          <Link
            to={`/pets/${pet.petId}`}
            state={{ pet }}
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
                    className="shrink-0 text-primary-strong"
                    aria-label="인증된 펫"
                  />
                )}
              </p>
              <p className="truncate text-[14px] text-muted-foreground">
                {pet.publicTag}
              </p>
            </div>
          </Link>
        ) : petSearch.isSuccess ? (
          <EmptyState
            title={`"${query}" 검색 결과가 없습니다`}
            description="공개 태그를 정확히 입력했는지 확인해 주세요."
          />
        ) : (
          <EmptyState
            title="검색 버튼을 눌러 주세요"
            description="공개 태그와 정확히 일치하는 강아지를 찾습니다."
          />
        )}
      </div>
    </div>
  )
}
