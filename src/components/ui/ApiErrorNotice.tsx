import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react'
import { ApiError } from '@/lib/api'

export function ApiErrorNotice({
  error,
  title = '요청을 처리하지 못했습니다',
  onRetry,
}: {
  error: unknown
  title?: string
  onRetry?: () => void
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <WarningCircle
        size={22}
        weight="fill"
        className="mt-0.5 shrink-0 text-destructive"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary-strong"
          >
            <ArrowClockwise size={18} />
            다시 시도
          </button>
        )}
      </div>
    </div>
  )
}
