import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

const VARIANTS: Record<Variant, string> = {
  // 청록 면 + 대비가 검증된 on-primary 텍스트
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  // 청록은 텍스트로도 대비를 통과하므로 아웃라인에 그대로 쓸 수 있다
  secondary:
    'border-2 border-primary text-primary-strong hover:bg-primary-subtle bg-transparent',
  ghost: 'text-foreground hover:bg-primary-subtle bg-transparent',
}

export function Button({ variant = 'primary', className, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        // 최소 히트영역 44px. hover 로 레이아웃을 흔들지 않는다(transform 미사용).
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 font-semibold transition-colors duration-200',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
