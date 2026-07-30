import { useId, type ReactNode } from 'react'
import { Sparkle } from '@phosphor-icons/react'

type Props = {
  label: string
  /** AI 가 채운 값이면 사용자가 확인해야 한다는 표시를 붙인다. */
  aiFilled?: boolean
  error?: string
  hint?: string
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/**
 * 폼 필드 래퍼.
 *
 * - 라벨은 항상 보이게 둔다. placeholder 로 라벨을 대신하지 않는다.
 * - 에러는 필드 바로 아래에 붙인다. 화면 상단에 몰아넣지 않는다.
 */
export function Field({ label, aiFilled, error, hint, children }: Props) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {aiFilled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-[13px] font-medium text-primary-strong">
            <Sparkle size={12} weight="fill" />
            AI 추천
          </span>
        )}
      </div>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
