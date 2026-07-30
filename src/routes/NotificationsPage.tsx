import { Link } from 'react-router'
import { Heart, ChatCircleText, UserPlus, CalendarCheck } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { cn } from '@/lib/cn'

type NotificationKind = 'like' | 'comment' | 'friend' | 'meeting'

const ICONS: Record<NotificationKind, React.ReactNode> = {
  like: <Heart size={20} weight="fill" />,
  comment: <ChatCircleText size={20} />,
  friend: <UserPlus size={20} />,
  meeting: <CalendarCheck size={20} />,
}

export function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/" label="홈" />
      <h1 className="mt-4 text-2xl font-bold">알림</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {PLACEHOLDER.map((n) => (
          <li key={n.id}>
            <Link
              to={n.to}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-primary-subtle',
                // 안 읽은 알림은 색만이 아니라 좌측 보더 두께로도 구분한다.
                n.unread
                  ? 'border-border border-l-4 border-l-primary bg-surface'
                  : 'border-border bg-surface',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 shrink-0',
                  n.kind === 'like' ? 'text-like' : 'text-primary-strong',
                )}
              >
                {ICONS[n.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">{n.text}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{n.time}</p>
              </div>
              {n.unread && <span className="sr-only">읽지 않음</span>}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <NotConnected
          endpoint="GET /notifications"
          note="기획상 알림 대상은 좋아요와 댓글입니다. 친구 요청·약속 알림 포함 여부는 확인이 필요합니다."
        />
      </div>
    </div>
  )
}

const PLACEHOLDER: {
  id: number
  kind: NotificationKind
  text: string
  time: string
  to: string
  unread: boolean
}[] = [
  { id: 1, kind: 'like', text: '봉이 엄마님이 회원님의 셋로그를 좋아합니다.', time: '5분 전', to: '/', unread: true },
  { id: 2, kind: 'comment', text: '초록이네님이 댓글을 남겼습니다.', time: '1시간 전', to: '/board/1', unread: true },
  { id: 3, kind: 'friend', text: '하양이 아빠님이 친구 요청을 보냈습니다.', time: '어제', to: '/me/friends', unread: false },
]
