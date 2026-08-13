import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { inputClass } from '@/components/ui/input-class'
import { createOpenChatRoom } from '@/features/chat/api'

export function OpenChatCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(4)

  const create = useMutation({
    mutationFn: () =>
      createOpenChatRoom({
        title: title.trim(),
        description: description.trim() || null,
        maxParticipants,
        isPublic: true,
      }),
    onSuccess: (room) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'open', 'rooms'] })
      navigate(`/chat/open/${room.roomId}/room`, { replace: true })
    },
  })

  const invalid = title.trim().length === 0 || title.trim().length > 120

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/chat/open" label="오픈채팅" />
      <h1 className="mt-4 text-2xl font-bold">오픈채팅방 만들기</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        방장은 현재 선택된 반려견으로 지정됩니다.
      </p>

      <form
        className="mt-6 space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (!invalid) create.mutate()
        }}
      >
        <label className="block">
          <span className="mb-2 block font-medium">방 제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="예: 주말 중앙공원 산책 모임"
            className={inputClass(invalid && title.length > 0)}
          />
          <span className="mt-1 block text-right text-[13px] text-muted-foreground">
            {title.length}/120
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block font-medium">방 설명</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder="어떤 이야기를 나누는 방인지 알려주세요."
            className={`${inputClass(description.length > 500)} resize-none`}
          />
          <span className="mt-1 block text-right text-[13px] text-muted-foreground">
            {description.length}/500
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block font-medium">최대 참여 인원</span>
          <input
            type="number"
            min={3}
            max={1000}
            value={maxParticipants}
            onChange={(event) => setMaxParticipants(Number(event.target.value))}
            className={inputClass(maxParticipants < 3 || maxParticipants > 1000)}
          />
          <span className="mt-1 block text-[13px] text-muted-foreground">
            단체 채팅은 최소 3명부터 운영할 수 있으며 권장 인원은 4명입니다.
          </span>
        </label>

        {create.isError && (
          <ApiErrorNotice error={create.error} title="방을 만들지 못했습니다" />
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={invalid || maxParticipants < 3 || maxParticipants > 1000 || create.isPending}
          >
            {create.isPending ? '만드는 중…' : '방 만들기'}
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            취소
          </Button>
        </div>
      </form>
    </div>
  )
}
