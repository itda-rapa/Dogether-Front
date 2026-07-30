import { cn } from '@/lib/cn'

/** 폼 입력 공통 클래스. 높이 44px, 글자 16px 은 base 레이어에서 보장된다. */
export const inputClass = (invalid: boolean) =>
  cn(
    'min-h-11 w-full rounded-lg border bg-surface px-4 text-foreground transition-colors',
    invalid ? 'border-destructive' : 'border-border',
  )
