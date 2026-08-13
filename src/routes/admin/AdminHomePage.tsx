import { Link } from 'react-router'
import { CaretRight, Flag, ShieldCheck, Stack } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { useAuth } from '@/features/auth/auth-context'

/**
 * 관리자 기능 목록. 새 관리자 화면이 생기면 여기에만 추가하면 된다.
 */
const ADMIN_MENU: { label: string; description: string; to: string; icon: typeof Flag }[] = [
  {
    label: '신고 처리',
    description: '접수된 채팅방 신고를 조회하고 처리합니다.',
    to: '/admin/reports',
    icon: Flag,
  },
  {
    label: '게시판 관리',
    description: '게시판 종류를 생성·수정·삭제합니다.',
    to: '/admin/boards',
    icon: Stack,
  },
]

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '관리자',
  SUPER_ADMIN: '최고 관리자',
}

export function AdminHomePage() {
  const { me } = useAuth()
  const roleLabel = me ? (ROLE_LABEL[me.role] ?? me.role) : ''

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />

      <div className="mt-4 flex items-center gap-2">
        <ShieldCheck size={26} weight="fill" className="text-primary-strong" aria-hidden />
        <h1 className="text-2xl font-bold">관리자</h1>
        {roleLabel && (
          <span className="ml-1 rounded-full bg-primary-subtle px-2.5 py-1 text-[13px] font-medium text-primary-strong">
            {roleLabel}
          </span>
        )}
      </div>

      <ul className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        {ADMIN_MENU.map(({ label, description, to, icon: Icon }) => (
          <li key={to} className="border-t border-border first:border-t-0">
            <Link
              to={to}
              className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-primary-subtle"
            >
              <Icon size={22} className="shrink-0 text-primary-strong" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{label}</p>
                <p className="truncate text-[13px] text-muted-foreground">{description}</p>
              </div>
              <CaretRight size={18} className="shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
