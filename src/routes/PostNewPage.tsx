import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Image, Spinner, X } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { Button } from '@/components/ui/Button'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { createBoardPost, listBoards } from '@/features/board/api'
import { MediaUploadError, uploadMedia } from '@/features/media/api'
import { ApiError, NetworkError } from '@/lib/api'
import { cn } from '@/lib/cn'

const MAX_IMAGES = 5

const schema = z.object({
  boardId: z.string().min(1, '게시판을 선택해 주세요.'),
  title: z.string().trim().min(1, '제목을 입력해 주세요.').max(120, '제목은 120자 이내로 입력해 주세요.'),
  content: z.string().trim().min(1, '내용을 입력해 주세요.').max(5000, '내용은 5000자 이내로 입력해 주세요.'),
})
type FormValues = z.input<typeof schema>

type UploadedImage = { mediaId: number; url: string }

export function PostNewPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const boards = useQuery({ queryKey: ['boards'], queryFn: listBoards, retry: false })
  const { register, handleSubmit, watch, setValue, formState } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { boardId: params.get('boardId') ?? '', title: '', content: '' } })
  const boardId = watch('boardId')
  useEffect(() => { if (!boardId && boards.data?.[0]) setValue('boardId', String(boards.data[0].boardId)) }, [boardId, boards.data, setValue])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploadingCount, setUploadingCount] = useState(0)
  const [imageError, setImageError] = useState<string | null>(null)

  const onPickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const room = MAX_IMAGES - images.length - uploadingCount
    const picked = Array.from(files).slice(0, room)
    setImageError(picked.length < files.length ? `사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.` : null)
    setUploadingCount((c) => c + picked.length)
    await Promise.all(picked.map(async (file) => {
      try {
        const result = await uploadMedia(file)
        setImages((prev) => [...prev, { mediaId: result.media.id, url: result.downloadUrl }])
      } catch (e) {
        setImageError(e instanceof MediaUploadError || e instanceof ApiError || e instanceof NetworkError ? e.message : '사진을 올리지 못했습니다.')
      } finally {
        setUploadingCount((c) => c - 1)
      }
    }))
  }

  const create = useMutation({ mutationFn: (values: FormValues) => createBoardPost(Number(values.boardId), { title: values.title.trim(), content: values.content.trim(), mediaIds: images.map((i) => i.mediaId) }), onSuccess: (post) => navigate(`/board/${post.postId}`) })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/board" label="게시판" />
      <h1 className="mt-4 text-2xl font-bold">글쓰기</h1>
      {boards.isPending && <p className="mt-6 text-muted-foreground">게시판을 불러오는 중…</p>}
      {boards.isError && <div className="mt-6"><ApiErrorNotice error={boards.error} title="게시판 목록을 불러오지 못했습니다" onRetry={() => void boards.refetch()} /></div>}
      {boards.data && boards.data.length === 0 && <div className="mt-6"><EmptyState title="글을 작성할 게시판이 없습니다" /></div>}
      {boards.data && boards.data.length > 0 && (
        <form className="mt-6 flex flex-col gap-6" noValidate onSubmit={handleSubmit((values) => create.mutate(values))}>
          <fieldset className="flex flex-col gap-1.5"><legend className="mb-1.5 font-medium">분류</legend><div className="flex flex-wrap gap-2">{boards.data.map((board) => <label key={board.boardId} className={cn('min-h-11 cursor-pointer rounded-full border px-4 py-2.5 font-medium transition-colors', boardId === String(board.boardId) ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle')}><input type="radio" value={board.boardId} className="sr-only" {...register('boardId')} />{board.name}</label>)}</div>{formState.errors.boardId && <p role="alert" className="text-[13px] text-destructive">{formState.errors.boardId.message}</p>}</fieldset>
          <Field label="제목" error={formState.errors.title?.message}>{({ id, describedBy, invalid }) => <input id={id} type="text" aria-describedby={describedBy} aria-invalid={invalid} className={inputClass(invalid)} {...register('title')} />}</Field>
          <Field label="내용" error={formState.errors.content?.message}>{({ id, describedBy, invalid }) => <textarea id={id} rows={12} aria-describedby={describedBy} aria-invalid={invalid} className={cn(inputClass(invalid), 'resize-y py-3 leading-relaxed')} {...register('content')} />}</Field>

          <div className="flex flex-col gap-1.5">
            <span className="font-medium">사진 (선택, 최대 {MAX_IMAGES}장)</span>
            <div className="flex flex-wrap gap-3">
              {images.map((img) => (
                <div key={img.mediaId} className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border">
                  <img src={img.url} alt="" className="size-full object-cover" />
                  <button type="button" aria-label="사진 삭제" onClick={() => setImages((prev) => prev.filter((i) => i.mediaId !== img.mediaId))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploadingCount }).map((_, i) => (
                <div key={`uploading-${i}`} className="grid size-20 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground">
                  <Spinner size={20} className="animate-spin" />
                </div>
              ))}
              {images.length + uploadingCount < MAX_IMAGES && (
                <button type="button" aria-label="사진 추가" onClick={() => fileInputRef.current?.click()} className="grid size-20 shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-primary-subtle">
                  <Image size={22} />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg" multiple className="sr-only" onChange={(e) => { void onPickImages(e.target.files); e.target.value = '' }} />
            {imageError && <p role="alert" className="text-[13px] text-destructive">{imageError}</p>}
          </div>

          {create.isError && <ApiErrorNotice error={create.error} title="게시글을 등록하지 못했습니다" />}
          <div className="flex gap-3"><Button type="submit" disabled={create.isPending || uploadingCount > 0}>{create.isPending ? '등록 중…' : '등록'}</Button><Button type="button" variant="secondary" onClick={() => navigate(-1)}>취소</Button></div>
        </form>
      )}
    </div>
  )
}
