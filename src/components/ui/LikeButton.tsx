import { useState } from 'react'
import { Heart } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

type Props = {
  count: number
  defaultLiked?: boolean
}

/**
 * 좋아요 버튼.
 *
 * 코랄(--color-like)은 브랜드 색이 아니라 좋아요 전용 기능색이다.
 * 청록 하트는 의미가 안 읽히고, 빨강 하트는 삭제(destructive)와 충돌하기 때문.
 *
 * 상태를 색으로만 구분하지 않는다 — 외곽선 <-> 채움 형태 변화를 반드시 동반한다.
 */
export function LikeButton({ count, defaultLiked = false }: Props) {
  const [liked, setLiked] = useState(defaultLiked)

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
      onClick={() => setLiked((v) => !v)}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-primary-subtle"
    >
      <Heart
        size={20}
        weight={liked ? 'fill' : 'regular'}
        className={cn(
          'transition-colors duration-200',
          liked ? 'text-like' : 'text-muted-foreground',
        )}
      />
      {/* 코랄은 텍스트 색으로 쓰면 대비 2.42:1 이라 숫자는 항상 중립색으로 둔다 */}
      <span className="text-[14px] tabular-nums text-muted-foreground">
        {liked ? count + 1 : count}
      </span>
    </button>
  )
}
