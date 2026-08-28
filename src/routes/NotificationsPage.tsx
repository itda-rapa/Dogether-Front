import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChatCircleDots, Heart, HandHeart, Smiley } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth/auth-context'
import {
  listNotifications,
  markNotificationRead,
  type AppNotification,
} from '@/features/chat/api'
import { cn } from '@/lib/cn'

/** targetAvailable=false 면 원문·이동 링크를 절대 보여주지 않는다(존재 은닉). */
function notificationHref(n: AppNotification): string | null {
  if (!n.targetAvailable) return null
  switch (n.targetType) {
    case 'OPEN_CHAT_ROOM':
      return n.roomId != null ? `/chat/open/${n.roomId}/room` : null
    case 'BOARD_POST':
    case 'BOARD_COMMENT':
      return n.postId != null ? `/board/${n.postId}` : null
    case 'SETLOG':
      return n.setlogId != null ? `/setlogs/${n.setlogId}` : null
  }
}

function notificationText(n: AppNotification): string {
  const actor = n.actorPetNickname
  switch (n.type) {
    case 'OPEN_CHAT_INVITE':
      return `${actor}님이 ${n.roomTitle ?? '오픈채팅방'}에 초대했습니다.`
    case 'BOARD_POST_LIKE':
      return `${actor}님이 내 게시글을 좋아합니다.`
    case 'BOARD_POST_HELPFUL':
      return `${actor}님이 내 게시글이 도움됐다고 표시했습니다.`
    case 'BOARD_COMMENT_HELPFUL':
      return `${actor}님이 내 댓글이 도움됐다고 표시했습니다.`
    case 'BOARD_COMMENT_CREATED':
      return n.commentPreview
        ? `${actor}님이 댓글을 남겼습니다: ${n.commentPreview}`
        : `${actor}님이 내 게시글에 댓글을 남겼습니다.`
    case 'BOARD_REPLY_CREATED':
      return n.commentPreview
        ? `${actor}님이 답글을 남겼습니다: ${n.commentPreview}`
        : `${actor}님이 내 댓글에 답글을 남겼습니다.`
    case 'SETLOG_LIKE':
      return `${actor}님이 내 셋로그를 좋아합니다.`
    case 'SETLOG_CUTE':
      return `${actor}님이 내 셋로그를 귀엽다고 표시했습니다.`
    default:
      // 프론트가 아직 모르는 새 타입이 서버에서 먼저 배포된 경우의 방어.
      return `${actor}님에게서 새 알림이 있습니다.`
  }
}

function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  const props = { size: 22, className: 'mt-0.5 shrink-0 text-primary-strong', 'aria-hidden': true as const }
  switch (type) {
    case 'BOARD_POST_LIKE':
    case 'SETLOG_LIKE':
      return <Heart {...props} weight="fill" />
    // SetlogDetailPage 의 반응 버튼과 아이콘을 맞춘다 — CUTE 는 거기서도 Smiley 다.
    case 'SETLOG_CUTE':
      return <Smiley {...props} weight="fill" />
    case 'BOARD_POST_HELPFUL':
    case 'BOARD_COMMENT_HELPFUL':
      return <HandHeart {...props} weight="fill" />
    default:
      return <ChatCircleDots {...props} />
  }
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { me } = useAuth()
  const notifications = useQuery({
    queryKey: ['notifications', me?.activePetId],
    queryFn: listNotifications,
    enabled: me?.activePetId != null,
  })
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (updated) => {
      queryClient.setQueryData<AppNotification[]>(
        ['notifications', me?.activePetId],
        (current) => current?.map((item) =>
          item.notificationId === updated.notificationId ? updated : item,
        ),
      )
      // 헤더 배지는 별도 unread-count 엔드포인트를 쓰므로 캐시가 다르다 — 같이 갱신한다.
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread-count', me?.activePetId],
      })
    },
  })

  const openNotification = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.notificationId)
    const href = notificationHref(notification)
    if (href) navigate(href)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/" label="홈" />
      <h1 className="mt-4 text-2xl font-bold">알림</h1>

      {notifications.isPending && (
        <p className="mt-6 text-sm text-muted-foreground">알림을 불러오는 중…</p>
      )}
      {notifications.isError && (
        <div className="mt-6">
          <ApiErrorNotice error={notifications.error} title="알림을 불러오지 못했습니다" />
        </div>
      )}
      {notifications.data?.length === 0 && (
        <div className="mt-6">
          <EmptyState title="새 알림이 없습니다" />
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {notifications.data?.map((notification) => (
          <li key={notification.notificationId}>
            <button
              type="button"
              onClick={() => openNotification(notification)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-primary-subtle',
                notification.readAt
                  ? 'border-border bg-surface'
                  : 'border-border border-l-4 border-l-primary bg-surface',
              )}
            >
              <NotificationIcon type={notification.type} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[15px]', !notification.targetAvailable && 'text-muted-foreground')}>
                  {notification.targetAvailable
                    ? notificationText(notification)
                    : '더 이상 볼 수 없는 알림입니다.'}
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {formatTime(notification.createdAt)}
                </p>
              </div>
              {!notification.readAt && <span className="sr-only">읽지 않음</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
