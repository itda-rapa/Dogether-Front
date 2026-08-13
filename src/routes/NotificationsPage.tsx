import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChatCircleDots } from '@phosphor-icons/react'
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
    },
  })

  const openNotification = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.notificationId)
    navigate(`/chat/open/${notification.roomId}/room`)
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
              <ChatCircleDots
                aria-hidden
                size={22}
                className="mt-0.5 shrink-0 text-primary-strong"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">
                  <strong>{notification.actorPetNickname}</strong>님이{' '}
                  <strong>{notification.roomTitle}</strong> 오픈채팅방에 초대했습니다.
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
