import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  children?: ReactNode
}

/** 화면 공통 래퍼. h1 은 화면당 하나만 둔다(제목 계층 순서 준수). */
export function Page({ title, description, children }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  )
}

/** 아직 구현 전인 화면에 쓰는 자리표시자. */
export function Placeholder({ note }: { note: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
      {note}
    </div>
  )
}
