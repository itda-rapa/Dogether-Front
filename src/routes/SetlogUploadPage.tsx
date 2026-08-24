import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, FilmSlate, UploadSimple, WarningCircle } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import {
  getSetlogVideoDurationError,
  getSetlogVideoError,
  SetlogUploadError,
  uploadSetlogVideo,
} from '@/features/setlog/api'
import type { SetlogUploadProgress } from '@/features/setlog/types'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError, NetworkError } from '@/lib/api'

export function SetlogUploadPage() {
  const { me } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [progress, setProgress] = useState<SetlogUploadProgress | null>(null)
  const [checkingDuration, setCheckingDuration] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const upload = useMutation({
    mutationFn: (selected: File) => {
      if (!me?.activePetId) {
        throw new SetlogUploadError('대표 강아지를 먼저 지정해 주세요.')
      }
      return uploadSetlogVideo(me.activePetId, selected, setProgress)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['setlogs'] })
      navigate('/', { replace: true })
    },
  })

  const selectionTokenRef = useRef(0)

  const chooseFile = async (selected: File | undefined) => {
    upload.reset()
    setProgress(null)
    if (!selected) return

    const token = ++selectionTokenRef.current
    setCheckingDuration(false)

    const error = getSetlogVideoError(selected)
    if (error) {
      setFile(null)
      setSelectionError(error)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setFile(selected)
    setSelectionError(null)
    setCheckingDuration(true)
    const durationError = await getSetlogVideoDurationError(selected)
    if (token !== selectionTokenRef.current) return
    setCheckingDuration(false)
    if (durationError) {
      setFile(null)
      setSelectionError(durationError)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (!me?.activePetId) {
    return (
      <Page title="영상 올리기">
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">대표 강아지가 필요합니다</p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              마이 페이지에서 대표 강아지를 지정하면 영상을 올릴 수 있습니다.
            </p>
            <Link
              to="/me"
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary-strong"
            >
              마이 페이지로
            </Link>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page title="영상 올리기" description="3~5초 짧은 영상만 올려주세요 (MP4·WebM, 최대 200MB)">
      <div className="mb-4 grid min-h-72 w-full place-items-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground">
        {previewUrl ? (
          <video
            src={previewUrl}
            controls
            className="max-h-[32rem] w-full"
            aria-label="선택한 영상 미리보기"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FilmSlate size={38} />
            <span className="text-[14px]">올릴 영상을 선택해 주세요</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="sr-only"
        disabled={checkingDuration || upload.isPending}
        onChange={(e) => chooseFile(e.target.files?.[0])}
      />
      <Button
        variant="secondary"
        className="w-full"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <UploadSimple size={20} />
        영상 선택
      </Button>

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <FilmSlate size={24} className="shrink-0 text-primary-strong" />
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-[13px] text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>
      )}

      {checkingDuration && (
        <p className="mt-4 text-[13px] text-muted-foreground" aria-live="polite">
          영상 길이를 확인하는 중…
        </p>
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
          className="mt-4 flex items-center gap-3 rounded-xl border border-primary bg-primary-subtle p-4"
        >
          <CheckCircle size={24} weight="fill" className="shrink-0 text-primary-strong" />
          <p className="font-semibold">업로드 완료. 홈으로 이동합니다…</p>
        </div>
      )}

      <div className="mt-6">
        <Button
          disabled={!file || checkingDuration || upload.isPending || upload.isSuccess}
          onClick={() => file && upload.mutate(file)}
        >
          {upload.isPending ? '업로드 중…' : '올리기'}
        </Button>
      </div>
    </Page>
  )
}

function progressPercent(progress: SetlogUploadProgress): number {
  if (progress.stage === 'completing') return 100
  if (progress.stage === 'initializing' || progress.totalBytes === 0) return 0
  return Math.round((progress.uploadedBytes / progress.totalBytes) * 100)
}

function stageLabel(progress: SetlogUploadProgress): string {
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
    error instanceof SetlogUploadError ||
    error instanceof ApiError ||
    error instanceof NetworkError
  ) {
    return error.message
  }
  return '영상을 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
