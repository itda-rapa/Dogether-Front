import { Link } from 'react-router'
import { ArrowLeft } from '@phosphor-icons/react'

/** 하위 화면 공통 뒤로가기. 브라우저 뒤로가기와 별개로 상위 경로를 항상 제공한다. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-2 text-muted-foreground transition-colors hover:text-primary-strong"
    >
      <ArrowLeft size={20} />
      {label}
    </Link>
  )
}
