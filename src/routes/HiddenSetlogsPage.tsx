import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EyeSlash } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { listSetlogs } from '@/features/setlog/api'
import {
  listHiddenSetlogIds,
  unhideSetlog,
} from '@/features/setlog/hiddenSetlogs'
import { useAuth } from '@/features/auth/auth-context'

/**
 * "숨기기"는 서버 계약이 없는 로컬 전용 기능이라, 숨긴 셋로그 자체도 별도
 * 목록 API 가 없다. 그래서 피드 목록(GET /setlogs)을 그대로 불러와 로컬에
 * 저장된 숨긴 id 로 걸러 보여준다 — 피드에 없는(오래돼 빠진) 항목은 여기서도
 * 안 보이지만, M1 은 시드 데이터라 사실상 문제 되지 않는다.
 */
export function HiddenSetlogsPage() {
  const { me } = useAuth()
  const setlogs = useQuery({
    queryKey: ['setlogs'],
    queryFn: listSetlogs,
    retry: false,
    staleTime: 60_000,
  })

  /* "숨김 해제"는 localStorage 라 반응형이 아니다. 누르면 이 값을 올려 다시 읽게 한다. */
  const [, bumpHiddenTick] = useState(0)
  const hiddenIds = new Set(me ? listHiddenSetlogIds(me.userId) : [])
  const items = (setlogs.data?.items ?? []).filter((s) => hiddenIds.has(s.setlogId))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">숨긴 셋로그</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        내 피드에서만 숨긴 영상입니다. 작성자에게는 아무 영향이 없습니다.
      </p>

      {setlogs.isPending && (
        <p className="mt-6 text-muted-foreground">불러오는 중…</p>
      )}

      {setlogs.isSuccess && items.length === 0 && (
        <div className="mt-6">
          <EmptyState title="숨긴 셋로그가 없습니다" />
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {items.map((s) => (
          <li
            key={s.setlogId}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <div
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
            >
              <EyeSlash size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{s.authorPet.nickname}</p>
              <p className="truncate text-[13px] text-muted-foreground">
                {s.caption ?? s.authorPet.publicTag}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (me) unhideSetlog(me.userId, s.setlogId)
                bumpHiddenTick((t) => t + 1)
              }}
            >
              숨김 해제
            </Button>
          </li>
        ))}
      </ul>

      {setlogs.isError && (
        <div className="mt-6">
          <ApiErrorNotice
            error={setlogs.error}
            title="셋로그를 불러오지 못했습니다"
            onRetry={() => void setlogs.refetch()}
          />
        </div>
      )}
    </div>
  )
}
