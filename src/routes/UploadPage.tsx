import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  CheckCircle,
  FileImage,
  FilmSlate,
  UploadSimple,
} from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import {
  getMediaType,
  MediaUploadError,
  uploadMedia,
} from '@/features/media/api'
import type {
  MediaType,
  MediaUploadProgress,
} from '@/features/media/types'
import { ApiError, NetworkError } from '@/lib/api'

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<MediaType | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [progress, setProgress] = useState<MediaUploadProgress | null>(null)

  useEffect(() => {
    if (!file) {
      setLocalPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const upload = useMutation({
    mutationFn: (selected: File) => uploadMedia(selected, setProgress),
  })

  const reset = () => {
    upload.reset()
    setFile(null)
    setMediaType(null)
    setSelectionError(null)
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const chooseFile = (selected: File | undefined) => {
    upload.reset()
    setProgress(null)
    if (!selected) return
    try {
      const type = getMediaType(selected)
      setFile(selected)
      setMediaType(type)
      setSelectionError(null)
    } catch (error) {
      setFile(null)
      setMediaType(null)
      setSelectionError(toUploadError(error))
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const previewUrl = upload.data?.downloadUrl ?? localPreviewUrl

  return (
    <Page
      title="미디어 업로드"
      description="현재 S3 미디어 API로 JPEG 이미지나 MP4 영상을 업로드합니다"
    >
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <p className="font-semibold">미디어 저장 기능 테스트</p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          여기서는 미디어 파일 저장까지만 완료됩니다. 셋로그·게시글 생성 API는
          아직 없어 피드에는 게시되지 않습니다.
        </p>
      </div>

      <div className="mb-4 grid min-h-72 w-full place-items-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground">
        {previewUrl && mediaType === 'IMAGE' ? (
          <img
            src={previewUrl}
            alt="선택한 이미지 미리보기"
            className="max-h-[32rem] w-full object-contain"
          />
        ) : previewUrl && mediaType === 'VIDEO' ? (
          <video
            src={previewUrl}
            controls
            className="max-h-[32rem] w-full"
            aria-label="선택한 영상 미리보기"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FilmSlate size={38} />
            <span className="text-[14px]">업로드할 파일을 선택해 주세요</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,video/mp4"
        className="sr-only"
        onChange={(event) => chooseFile(event.target.files?.[0])}
      />
      <Button
        variant="secondary"
        className="w-full"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <UploadSimple size={20} />
        JPEG 또는 MP4 선택
      </Button>

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <FileImage size={24} className="shrink-0 text-primary-strong" />
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-[13px] text-muted-foreground">
              {formatBytes(file.size)} · {mediaType === 'IMAGE' ? '이미지' : '영상'}
            </p>
          </div>
        </div>
      )}

      {upload.isPending && progress && (
        <div className="mt-4" aria-live="polite">
          <div className="mb-2 flex justify-between text-[13px]">
            <span>{stageLabel(progress)}</span>
            <span>{progressPercent(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progressPercent(progress)}%` }}
            />
          </div>
        </div>
      )}

      {selectionError && (
        <p role="alert" className="mt-4 text-[14px] text-destructive">
          {selectionError}
        </p>
      )}

      {upload.isError && (
        <p role="alert" className="mt-4 text-[14px] text-destructive">
          {toUploadError(upload.error)}
        </p>
      )}

      {upload.isSuccess && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-primary bg-primary-subtle p-4"
        >
          <CheckCircle size={24} weight="fill" className="shrink-0 text-primary-strong" />
          <div>
            <p className="font-semibold">미디어 업로드 완료</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              미디어 ID {upload.data.media.id} · 상태 {upload.data.media.status}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          disabled={!file || upload.isPending || upload.isSuccess}
          onClick={() => file && upload.mutate(file)}
        >
          {upload.isPending ? '업로드 중…' : '미디어 업로드'}
        </Button>
        <Button
          variant="secondary"
          disabled={upload.isPending}
          onClick={reset}
        >
          초기화
        </Button>
      </div>
    </Page>
  )
}

function progressPercent(progress: MediaUploadProgress): number {
  if (progress.stage === 'completing') return 100
  if (progress.stage === 'initializing' || progress.totalBytes === 0) return 0
  return Math.round((progress.uploadedBytes / progress.totalBytes) * 100)
}

function stageLabel(progress: MediaUploadProgress): string {
  if (progress.stage === 'initializing') return '업로드 준비 중'
  if (progress.stage === 'completing') return '업로드 완료 처리 중'
  return '스토리지에 업로드 중'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function toUploadError(error: unknown): string {
  if (
    error instanceof MediaUploadError ||
    error instanceof ApiError ||
    error instanceof NetworkError
  ) {
    return error.message
  }
  return '미디어를 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
