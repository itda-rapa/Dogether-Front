import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PawPrint } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { listFootprints } from '@/features/meeting/api'
import type { FootprintItem } from '@/features/meeting/types'

/**
 * 만남 후기를 남겨 하루 한 번 쌓이는 발자국 목록(#166 GET /footprints).
 * 커서 페이지 — "더 보기"를 누를 때마다 다음 페이지를 이어 붙인다.
 */
export function FootprintsPage() {
  const [items, setItems] = useState<FootprintItem[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const query = useQuery({
    queryKey: ['footprints', cursor],
    queryFn: () => listFootprints({ cursor, size: 20 }),
    retry: false,
  })

  const page = query.data
  const seenIds = new Set(items.map((i) => i.footprintId))
  const allItems = page
    ? [...items, ...page.items.filter((i) => !seenIds.has(i.footprintId))]
    : items

  return (
    <Page title="발자국" description="만남 후기를 남길 때마다 하루 한 번 쌓입니다">
      {query.isPending && cursor === undefined && (
        <p className="text-muted-foreground">불러오는 중…</p>
      )}

      {query.isError && (
        <ApiErrorNotice
          error={query.error}
          title="발자국을 불러오지 못했습니다"
          onRetry={() => void query.refetch()}
        />
      )}

      {query.isSuccess && allItems.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <PawPrint size={28} aria-hidden />
          <p>아직 쌓인 발자국이 없습니다. 만남 뒤 후기를 남겨 보세요.</p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {allItems.map((item, index) => (
          <li
            key={item.footprintId}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
            /*
              새로 리스트에 들어오는 항목만 살짝 떠오르며 나타난다. React 가 이미
              마운트된 li(같은 key)는 다시 만들지 않으므로, "더 보기"로 이어붙인
              새 페이지 항목만 애니메이션이 걸리고 기존 항목은 재생되지 않는다.
              정보성 리스트라 오버슈트 없이 opacity+translateY 만 쓴다.
            */
            style={{
              animation: 'dg-rise-in 0.35s ease-out both',
              animationDelay: `${Math.min(index, 8) * 40}ms`,
            }}
          >
            <div
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary-strong"
            >
              <PawPrint size={20} weight="fill" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.counterpartPet.nickname}와의 만남</p>
              <p className="mt-0.5 text-[14px] text-muted-foreground">
                {formatEarnedDate(item.earnedDate)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {page?.page.hasNext && (
        <Button
          variant="secondary"
          className="mt-4 w-full"
          disabled={query.isFetching}
          onClick={() => {
            setItems(allItems)
            setCursor(page.page.nextCursor ?? undefined)
          }}
        >
          {query.isFetching ? '불러오는 중…' : '더 보기'}
        </Button>
      )}
    </Page>
  )
}

function formatEarnedDate(date: string) {
  const d = new Date(`${date}T00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}
