import { useRef, useState, type ReactNode } from 'react'
import { Camera, Spinner, X } from '@phosphor-icons/react'
import { getMediaType, MediaUploadError, uploadMedia } from '@/features/media/api'
import type { MediaUploadResult } from '@/features/media/types'
import { ApiError, NetworkError } from '@/lib/api'
import { cn } from '@/lib/cn'

type Props = {
  src: string | null | undefined
  alt: string
  size: number
  fallback: ReactNode
  onUploaded: (result: MediaUploadResult) => Promise<void> | void
  /** 있으면 사진이 설정돼 있을 때 삭제 배지를 보여준다. 생략하면 삭제 UI 자체가 없다. */
  onRemove?: () => Promise<void> | void
  className?: string
}

/**
 * 프로필 사진 업로드 원형 아바타.
 *
 * 저장은 features/media/api 의 uploadMedia(S3 presigned) 로 끝내고, 그 결과를
 * 실제 프로필에 매다는 건 onUploaded 콜백(호출부의 PATCH /me/avatar 등)에 맡긴다.
 * 이 컴포넌트는 파일 선택·업로드 진행률·에러 표시만 책임진다.
 */
export function AvatarUpload({
  src,
  alt,
  size,
  fallback,
  onUploaded,
  onRemove,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClickRemove = async () => {
    if (!onRemove) return
    setError(null)
    setBusy(true)
    try {
      await onRemove()
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onChange = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      if (getMediaType(file) !== 'IMAGE') {
        throw new MediaUploadError('이미지 파일만 올릴 수 있습니다.')
      }
      const result = await uploadMedia(file)
      await onUploaded(result)
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="grid place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground"
        style={{ width: size, height: size }}
      >
        {src ? (
          <img src={src} alt={alt} className="size-full object-cover" />
        ) : (
          fallback
        )}
      </div>

      <button
        type="button"
        aria-label="프로필 사진 변경"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border-2 border-surface bg-primary text-on-primary transition-opacity disabled:opacity-60"
      >
        {busy ? (
          <Spinner size={12} className="animate-spin" />
        ) : (
          <Camera size={12} weight="fill" />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg"
        className="sr-only"
        onChange={(e) => void onChange(e.target.files?.[0])}
      />

      {onRemove && src && (
        <button
          type="button"
          aria-label="프로필 사진 삭제"
          onClick={() => void onClickRemove()}
          disabled={busy}
          className="absolute -right-0.5 -top-0.5 grid size-6 place-items-center rounded-full border-2 border-surface bg-destructive text-on-primary transition-opacity disabled:opacity-60"
        >
          <X size={12} weight="bold" />
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="absolute left-1/2 top-full z-10 mt-1 w-max max-w-40 -translate-x-1/2 text-center text-[12px] text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}

function toMessage(e: unknown): string {
  if (e instanceof MediaUploadError || e instanceof ApiError || e instanceof NetworkError) {
    return e.message
  }
  return '사진을 올리지 못했습니다.'
}
