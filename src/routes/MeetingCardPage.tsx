import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarCheck, MapPin, Clock, XCircle } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { cancelMeetingCard, getMeetingCard } from '@/features/meeting/api'
import { MeetingCardMap } from '@/features/meeting/MeetingCardMap'

export function MeetingCardPage() {
  const { cardId = '' } = useParams()
  const navigate = useNavigate()
  const idNum = Number(cardId)
  const [confirming, setConfirming] = useState(false)

  const card = useQuery({
    queryKey: ['meeting-card', cardId],
    queryFn: () => getMeetingCard(idNum),
    enabled: Number.isFinite(idNum),
    retry: false,
  })

  const cancel = useMutation({
    mutationFn: () => cancelMeetingCard(idNum),
    onSuccess: () => card.refetch(),
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/chat" label="채팅" />

      <div className="mt-4 flex items-center gap-2">
        <CalendarCheck size={26} weight="fill" className="text-primary-strong" aria-hidden />
        <h1 className="text-2xl font-bold">약속</h1>
      </div>

      {card.isPending && (
        <p className="mt-6 text-muted-foreground">불러오는 중…</p>
      )}

      {card.isError && (
        <div className="mt-6">
          <ApiErrorNotice
            error={card.error}
            title="약속 정보를 불러오지 못했습니다"
            onRetry={() => void card.refetch()}
          />
        </div>
      )}

      {card.data && (
        <>
          {card.data.status === 'CANCELED' && (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface p-4"
            >
              <XCircle size={20} weight="fill" className="shrink-0 text-destructive" />
              <p className="font-medium">취소된 약속입니다</p>
            </div>
          )}

          <dl className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-muted-foreground"><CalendarCheck size={18} /></span>
                <dt className="shrink-0 text-muted-foreground">참여 인원</dt>
                <dd className="ml-auto font-medium">{card.data.participantCount}명</dd>
              </div>
              <dd className="mt-3 pl-[30px]">
                <ul className="flex flex-wrap gap-2" aria-label="약속 참여자 목록">
                  {(card.data.participants ?? []).map((participant) => (
                    <li key={participant.petId} className="flex min-h-10 items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1.5">
                      {participant.profileUrl ? (
                        <img src={participant.profileUrl} alt="" className="size-7 rounded-full object-cover" />
                      ) : (
                        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-primary-subtle text-xs font-bold text-primary-strong">
                          {participant.nickname.slice(0, 1)}
                        </span>
                      )}
                      <span className="max-w-32 truncate text-sm font-medium">{participant.nickname}</span>
                    </li>
                  ))}
                  {(card.data.participants ?? []).length === 0 && (
                    <li className="text-sm text-muted-foreground">참여자 정보를 불러올 수 없습니다.</li>
                  )}
                </ul>
              </dd>
            </div>
            <Row
              icon={<Clock size={18} />}
              term="일시"
              value={formatMeetAt(card.data.meetAt)}
            />
            <Row
              icon={<MapPin size={18} />}
              term="장소"
              value={card.data.placeText}
            />
          </dl>

          <MeetingCardMap
            roomId={card.data.roomId}
            routeRequestId={card.data.routeRequestId}
            placeText={card.data.placeText}
          />

          {cancel.isError && (
            <p role="alert" className="mt-4 text-[14px] text-destructive">
              취소하지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}

          {card.data.status === 'OPEN' && (
            <div className="mt-6">
              {confirming ? (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="font-medium">약속을 취소할까요?</p>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    취소하면 되돌릴 수 없고 상대에게도 알려집니다.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={() => cancel.mutate()}
                      disabled={cancel.isPending}
                      className="bg-destructive hover:bg-destructive"
                    >
                      {cancel.isPending ? '취소 중…' : '약속 취소'}
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirming(false)}>
                      돌아가기
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setConfirming(true)}>
                  약속 취소
                </Button>
              )}
            </div>
          )}

          <div className="mt-6">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              채팅방으로
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Row({
  icon,
  term,
  value,
}: {
  icon: React.ReactNode
  term: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd className="ml-auto min-w-0 truncate font-medium">{value}</dd>
    </div>
  )
}

function formatMeetAt(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
