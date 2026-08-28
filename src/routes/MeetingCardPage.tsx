import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarCheck, MapPin, Clock, XCircle } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { cancelMeetingCard, getMeetingCard } from '@/features/meeting/api'
import { MeetingVerificationPanel } from '@/features/meeting/MeetingVerificationPanel'
import { CARD_TYPE_LABEL } from '@/features/meeting/types'

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
            <Row
              icon={<CalendarCheck size={18} />}
              term="유형"
              value={CARD_TYPE_LABEL[card.data.cardType]}
            />
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

          {cancel.isError && (
            <p role="alert" className="mt-4 text-[14px] text-destructive">
              취소하지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}

          {card.data.status === 'OPEN' && <MeetingVerificationPanel cardId={idNum} />}

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
