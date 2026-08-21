import type { ReactNode } from 'react'
import { PawPrint } from '@/components/ui/decor'

/** 목록이 비었을 때. 오류가 아니므로 경고색을 쓰지 않는다. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      {/* 데이터가 없는 화면이 가장 자주 보이는 구간이라, 여기만 브랜드 요소를 둔다. */}
      <div
        aria-hidden="true"
        className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-subtle"
      >
        <PawPrint className="size-7 -rotate-12 text-primary-strong" />
      </div>
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
