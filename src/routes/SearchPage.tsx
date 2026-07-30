import { useSearchParams } from 'react-router'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { EmptyState } from '@/components/ui/EmptyState'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'

const SCOPES = ['게시글', '장소', '강아지'] as const

/**
 * 통합 검색.
 *
 * ⚠️ 기획에 "헤더 검색 삭제 여부 논의 필요"가 미결로 남아 있다.
 * 검색을 없애기로 하면 이 화면과 헤더 버튼을 함께 제거해야 한다.
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const scope = params.get('scope') ?? '게시글'

  const update = (next: { q?: string; scope?: string }) => {
    setParams({ q: next.q ?? q, scope: next.scope ?? scope })
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/" label="홈" />
      <h1 className="mt-4 text-2xl font-bold">검색</h1>

      <div className="relative mt-6">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="search-input" className="sr-only">
          검색어
        </label>
        <input
          id="search-input"
          type="search"
          placeholder="무엇을 찾으시나요?"
          value={q}
          onChange={(e) => update({ q: e.target.value })}
          className={cn(inputClass(false), 'pl-11')}
        />
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {SCOPES.map((s) => (
          <button
            key={s}
            aria-pressed={scope === s}
            onClick={() => update({ scope: s })}
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
        {q.trim() === '' ? (
          <EmptyState
            title="검색어를 입력해 주세요"
            description="게시글, 장소, 강아지를 찾을 수 있습니다."
          />
        ) : (
          <EmptyState title={`"${q}" 검색 결과가 없습니다`} />
        )}
      </div>

      <div className="mt-8">
        <NotConnected
          endpoint="검색 API 미정"
          note="기획에 '헤더 검색 삭제 여부 논의 필요'가 미결로 남아 있습니다. 검색을 없애기로 하면 이 화면과 헤더 버튼을 함께 제거해야 합니다."
        />
      </div>
    </div>
  )
}
