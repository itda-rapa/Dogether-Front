import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WarningCircle, Sparkle, ArrowClockwise } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { inputClass } from '@/components/ui/input-class'
import { cn } from '@/lib/cn'
import { createCardDraft, createMeetingCard } from '@/features/meeting/api'
import {
  getOpenChatCardDraft,
  requestOpenChatCardDraft,
  type OpenChatCardDraft,
} from '@/features/chat/api'
import {
  CARD_TYPES,
  CARD_TYPE_LABEL,
  FALLBACK_MESSAGE,
  aiFilledMap,
  isCardType,
  joinMeetAt,
  toFormValues,
  type CardType,
} from '@/features/meeting/types'

const schema = z.object({
  cardType: z
    .string()
    .refine(isCardType, { message: '약속 유형을 선택해 주세요.' }),
  date: z.string().min(1, '날짜를 선택해 주세요.'),
  time: z.string().min(1, '시간을 선택해 주세요.'),
  placeText: z
    .string()
    .trim()
    .min(1, '장소를 입력해 주세요.')
    .max(500, '장소는 500자 이내로 입력해 주세요.'),
})

type FormValues = z.input<typeof schema>

const EMPTY: FormValues = { cardType: '', date: '', time: '', placeText: '' }

/**
 * AI 약속 초안 확인 화면.
 *
 * 채팅 내용 -> AI 초안 -> 초안 표시 -> 빈 값은 선택/직접 입력 -> 사용자 수정
 * -> 사용자 최종 확정 -> 약속 카드 생성.
 *
 * AI 결과를 자동 확정하지 않는다. 서버는 AI 실패도 200 + fallback=true 로
 * 돌려주므로, 그 경우에도 화면을 막지 않고 수동 입력으로 이어간다.
 */
export function MeetingDraftPage() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const roomIdNum = Number(roomId)
  const [searchParams] = useSearchParams()
  const draftIdParam = searchParams.get('draftId')
  const openChat = searchParams.get('openChat') === 'true'
  const selectedDraftId = draftIdParam ? Number(draftIdParam) : null
  const draftQueryKey = openChat
    ? ['card-draft', roomId, 'open', selectedDraftId]
    : ['card-draft', roomId]

  const draftQuery = useQuery({
    queryKey: draftQueryKey,
    queryFn: async () => {
      if (!openChat) return createCardDraft(roomIdNum)
      if (selectedDraftId != null && Number.isFinite(selectedDraftId)) {
        return [await getOpenChatCardDraft(roomIdNum, selectedDraftId)]
      }
      return requestOpenChatCardDraft(roomIdNum)
    },
    enabled: Number.isFinite(roomIdNum),
    // 초안 생성은 POST 다. 화면에 들어올 때 한 번만 만들고 자동 재요청하지 않는다.
    // 제안 스트립과 같은 키라 칩을 눌러 들어오면 AI 를 다시 부르지 않는다.
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
  })

  // AI 가 여러 후보를 배열로 준다. 제안 스트립에서 특정 칩을 눌러 들어오면
  // ?draftId 로 그 후보를 지정한다. 없으면(상단 "약속 잡기" 진입) 첫 후보를 쓴다.
  const drafts = draftQuery.data
  const draft = drafts?.find((d) => String(d.draftId) === draftIdParam) ?? drafts?.[0]
  const aiFilled = draft ? aiFilledMap(draft) : null
  const openChatDraft = openChat ? (draft as OpenChatCardDraft | undefined) : undefined
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([])

  const { register, handleSubmit, reset, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: EMPTY,
  })

  const selectedType = watch('cardType')

  // 초안이 도착하면 폼을 채운다. 비어 있는 값은 빈칸/미선택으로 남는다.
  useEffect(() => {
    if (draft) reset(toFormValues(draft))
  }, [draft, reset])

  useEffect(() => {
    if (openChatDraft) {
      setSelectedParticipantIds([...openChatDraft.participantPetIds])
    }
  }, [openChatDraft])

  const createCard = useMutation({
    mutationFn: createMeetingCard,
    onSuccess: () => {
      // MeetingSuggestions 의 제안 스트립과 같은 쿼리 키다. staleTime: Infinity 라
      // 지우지 않으면 다음에 다시 확정하려 할 때 방금 쓴 옛 초안을 그대로 보여준다.
      if (!openChat) {
        queryClient.removeQueries({ queryKey: ['card-draft', roomId] })
      }
      navigate(
        openChat ? `/chat/open/${roomId}/room` : `/chat/${roomId}`,
        { replace: true },
      )
    },
  })

  const onSubmit = handleSubmit((values) => {
    const meetAt = joinMeetAt(values.date, values.time)
    if (!meetAt) return

    createCard.mutate({
      roomId: roomIdNum,
      draftId: draft?.draftId ?? null,
      cardType: values.cardType as CardType,
      placeText: values.placeText.trim(),
      meetAt,
      ...(openChat ? { participantPetIds: selectedParticipantIds } : {}),
    })
  })

  const fallbackNotice =
    draft?.fallback && draft.fallbackReason
      ? FALLBACK_MESSAGE[draft.fallbackReason]
      : null

  return (
    <Page
      title="약속 확인"
      description="AI가 채팅에서 뽑은 초안입니다. 확인하고 고친 뒤 확정해 주세요."
    >
      {draftQuery.isPending && <DraftSkeleton />}

      {/* 서버가 200 으로 준 빈 폼. 오류가 아니므로 destructive 색을 쓰지 않는다. */}
      {fallbackNotice && (
        <Notice
          tone="neutral"
          title={fallbackNotice.title}
          body={fallbackNotice.body}
        />
      )}

      {/* 호출 자체가 실패한 경우. 재시도 수단을 반드시 남긴다. */}
      {draftQuery.isError && (
        <Notice
          tone="error"
          title="초안을 가져오지 못했습니다"
          body="약속 내용을 직접 입력하거나 다시 시도해 주세요."
          onRetry={() => void draftQuery.refetch()}
        />
      )}

      {!draftQuery.isPending && (
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 flex items-center gap-2 font-medium">
              약속 유형
              {aiFilled?.cardType && <AiBadge />}
            </legend>

            {draft && !aiFilled?.cardType && (
              <p className="mb-1 text-[13px] text-muted-foreground">
                유형이 정해지지 않았습니다. 직접 골라 주세요.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {CARD_TYPES.map((type) => (
                <label
                  key={type}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-center font-medium transition-colors',
                    selectedType === type
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
                  )}
                >
                  <input
                    type="radio"
                    value={type}
                    className="sr-only"
                    {...register('cardType')}
                  />
                  {CARD_TYPE_LABEL[type]}
                </label>
              ))}
            </div>

            {formState.errors.cardType && (
              <p role="alert" className="text-[13px] text-destructive">
                {formState.errors.cardType.message}
              </p>
            )}
          </fieldset>

          <Field
            label="날짜"
            aiFilled={aiFilled?.date}
            error={formState.errors.date?.message}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="date"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={inputClass(invalid)}
                {...register('date')}
              />
            )}
          </Field>

          {openChatDraft && (
            <ParticipantSelector
              draft={openChatDraft}
              selectedIds={selectedParticipantIds}
              onChange={setSelectedParticipantIds}
            />
          )}

          <Field
            label="시간"
            aiFilled={aiFilled?.time}
            error={formState.errors.time?.message}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="time"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={inputClass(invalid)}
                {...register('time')}
              />
            )}
          </Field>

          <Field
            label="장소"
            aiFilled={aiFilled?.placeText}
            error={formState.errors.placeText?.message}
            hint="예: 중앙공원 정문"
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                type="text"
                autoComplete="off"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={inputClass(invalid)}
                {...register('placeText')}
              />
            )}
          </Field>

          {createCard.isError && (
            <p role="alert" className="text-[14px] text-destructive">
              저장하지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={
                createCard.isPending ||
                (openChat && selectedParticipantIds.length < 2)
              }
            >
              {createCard.isPending ? '저장 중…' : '약속 확정'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={createCard.isPending}
            >
              취소
            </Button>
          </div>
        </form>
      )}
    </Page>
  )
}

function ParticipantSelector({
  draft,
  selectedIds,
  onChange,
}: {
  draft: OpenChatCardDraft
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  const participants = draft.participants?.length
    ? draft.participants
    : draft.participantPetIds.map((petId) => ({
        petId,
        nickname: `펫 ${petId}`,
        profileUrl: null,
      }))

  const toggle = (petId: number, checked: boolean) => {
    onChange(
      checked
        ? [...selectedIds, petId]
        : selectedIds.filter((id) => id !== petId),
    )
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <legend className="px-1 font-medium">참여 인원</legend>
      <div className="mb-1 flex items-center justify-between text-[13px] text-muted-foreground">
        <span>AI가 대화에서 선별한 참여자입니다.</span>
        <span>{selectedIds.length}명 선택</span>
      </div>
      {participants.map((participant) => (
        <label
          key={participant.petId}
          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2"
        >
          {participant.profileUrl ? (
            <img
              src={participant.profileUrl}
              alt=""
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-primary-subtle font-semibold text-primary-strong"
            >
              {participant.nickname.slice(0, 1)}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate font-medium">
            {participant.nickname}
          </span>
          <input
            type="checkbox"
            checked={selectedIds.includes(participant.petId)}
            disabled={participant.petId === draft.requestedByPetId}
            onChange={(event) => toggle(participant.petId, event.target.checked)}
            className="size-5 accent-primary"
            aria-label={
              participant.petId === draft.requestedByPetId
                ? `${participant.nickname} (약속 제안자, 필수 참여)`
                : participant.nickname
            }
          />
        </label>
      ))}
      {selectedIds.length < 2 && (
        <p role="alert" className="text-[13px] text-destructive">
          약속에는 최소 2명의 참여자가 필요합니다.
        </p>
      )}
    </fieldset>
  )
}

function Notice({
  tone,
  title,
  body,
  onRetry,
}: {
  tone: 'neutral' | 'error'
  title: string
  body: string
  onRetry?: () => void
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <WarningCircle
        size={22}
        weight="fill"
        className={cn(
          'mt-0.5 shrink-0',
          tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">{body}</p>
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

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-[13px] font-medium text-primary-strong">
      <Sparkle size={12} weight="fill" />
      AI 추천
    </span>
  )
}

/** 로딩 중에도 높이를 잡아둬 레이아웃이 밀리지 않게 한다. */
function DraftSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">약속 초안을 만들고 있습니다</span>
      {[96, 72, 72, 72].map((h, i) => (
        <div key={i} style={{ height: h }} className="w-full rounded-lg bg-muted" />
      ))}
    </div>
  )
}
