import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, MapPin, Clock, XCircle } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { ApiErrorNotice } from '@/components/ui/ApiErrorNotice'
import { useAuth } from '@/features/auth/auth-context'
import { listMyMeetingCards } from '@/features/meeting/api'
import { CARD_TYPE_LABEL, type MeetingCardListItem } from '@/features/meeting/types'
import { formatMeetAt, formatParticipants } from '@/features/meeting/format'

/**
 * 채팅에서 만들어진 약속 카드를 모아 보는 화면.
 *
 * ⚠️ listMyMeetingCards 가 부르는 GET /meeting-cards/me 는 아직 BE 계약에 없는
 * 제안 단계 엔드포인트다. 배포 전까지는 이 화면이 ApiErrorNotice 를 정상적으로
 * 보여주는 상태다. docs/handover/meeting-cards-list-be.md 참고.
 */
export function MeetingsPage() {
  const { me } = useAuth()

  const cards = useQuery({
    queryKey: ['meeting-cards', 'me'],
    queryFn: () => listMyMeetingCards({ limit: 50 }),
    retry: false,
  })

  const items = cards.data?.items ?? []
  const upcoming = items
    .filter((c) => c.status === 'OPEN')
    .sort((a, b) => a.meetAt.localeCompare(b.meetAt))
  const past = items
    .filter((c) => c.status !== 'OPEN')
    .sort((a, b) => b.meetAt.localeCompare(a.meetAt))

  return (
    <Page title="약속" description="채팅에서 만든 약속을 한눈에 확인하세요">
      {cards.isPending && <p className="text-muted-foreground">불러오는 중…</p>}

      {cards.isError && (
        <ApiErrorNotice
          error={cards.error}
          title="약속 목록을 불러오지 못했습니다"
          onRetry={() => void cards.refetch()}
        />
      )}

      {cards.isSuccess && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          아직 만든 약속이 없습니다. 채팅에서 약속 잡기를 눌러보세요.
        </p>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-[14px] font-semibold text-muted-foreground">
            다가오는 약속
          </h2>
          <ul className="flex flex-col gap-2">
            {upcoming.map((card) => (
              <li key={card.cardId}>
                <MeetingCardRow card={card} myPetId={me?.activePetId ?? null} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-[14px] font-semibold text-muted-foreground">
            지난·취소된 약속
          </h2>
          <ul className="flex flex-col gap-2">
            {past.map((card) => (
              <li key={card.cardId}>
                <MeetingCardRow card={card} myPetId={me?.activePetId ?? null} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  )
}

function MeetingCardRow({
  card,
  myPetId,
}: {
  card: MeetingCardListItem
  myPetId: number | null
}) {
  const canceled = card.status === 'CANCELED'
  /*
   * ⚠️ 현재 배포된 GET /meeting-cards/me 는 인수인계 문서(docs/handover/
   * meeting-cards-list-be.md)에서 요청한 participants 인라인 없이 MeetingCard
   * 기본 필드만 준다. 그래서 participants 가 없을 수 있다 — 빈 배열로 방어한다.
   */
  const participants = card.participants ?? []
  const others = participants.filter((p) => p.petId !== myPetId)
  const withLabel = formatParticipants(others.length > 0 ? others : participants)

  return (
    <Link
      to={`/meeting-cards/${card.cardId}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle"
    >
      <div
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
      >
        {canceled ? (
          <XCircle size={20} weight="fill" className="text-destructive" />
        ) : (
          <CalendarCheck size={20} weight="fill" className="text-primary-strong" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-semibold">
          <span className="truncate">{withLabel}와의 약속</span>
          <span className="shrink-0 rounded-full bg-primary-subtle px-2 text-[13px] font-normal text-primary-strong">
            {CARD_TYPE_LABEL[card.cardType]}
          </span>
          {canceled && (
            <span className="shrink-0 rounded-full border border-border px-2 text-[13px] font-normal text-muted-foreground">
              취소됨
            </span>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-3 truncate text-[14px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {formatMeetAt(card.meetAt)}
          </span>
          <span className="flex min-w-0 items-center gap-1 truncate">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{card.placeText}</span>
          </span>
        </p>
      </div>
    </Link>
  )
}
