import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'

/* ------------------------------- 공지사항 -------------------------------- */

export function NoticesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">공지사항</h1>

      <ul className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        {PLACEHOLDER_NOTICES.map((n, i) => (
          <li key={n.id} className={i > 0 ? 'border-t border-border' : ''}>
            <Link
              to={`/notices/${n.id}`}
              className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-primary-subtle"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{n.title}</p>
                <p className="text-[13px] text-muted-foreground">{n.date}</p>
              </div>
              <CaretRight size={18} className="shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <NotConnected endpoint="GET /notices" />
      </div>
    </div>
  )
}

export function NoticeDetailPage() {
  const { noticeId = '' } = useParams()
  const notice = PLACEHOLDER_NOTICES.find((n) => String(n.id) === noticeId)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/notices" label="공지사항" />

      {notice ? (
        <article className="mt-4">
          <h1 className="text-2xl font-bold leading-tight">{notice.title}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{notice.date}</p>
          <p className="mt-6 whitespace-pre-wrap leading-relaxed">{notice.body}</p>
        </article>
      ) : (
        <div className="mt-6">
          <EmptyState title="존재하지 않는 공지입니다" />
        </div>
      )}

      <div className="mt-8">
        <NotConnected endpoint={`GET /notices/${noticeId}`} />
      </div>
    </div>
  )
}

const PLACEHOLDER_NOTICES = [
  {
    id: 1,
    title: '서비스 오픈 안내',
    date: '2026-07-28',
    body: 'Dogether 를 이용해 주셔서 감사합니다.\n\n첫 버전에서는 동네 셋로그와 채팅을 제공합니다.',
  },
  {
    id: 2,
    title: '개인정보 처리방침 변경 안내',
    date: '2026-07-20',
    body: '개인정보 처리방침이 일부 변경되었습니다.',
  },
]

/* ---------------------------------- QNA ---------------------------------- */

export function QnaPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">1:1 문의</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        답변은 등록하신 이메일로 전달됩니다.
      </p>

      <div className="mt-6">
        <EmptyState
          title="문의 내역이 없습니다"
          description="궁금한 점이 있으면 문의를 남겨주세요."
        />
      </div>

      <div className="mt-8">
        <NotConnected endpoint="GET /qna · POST /qna" />
      </div>
    </div>
  )
}

/* ---------------------------------- FAQ ---------------------------------- */

export function FaqPage() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/me" label="마이 페이지" />
      <h1 className="mt-4 text-2xl font-bold">자주 묻는 질문</h1>

      <ul className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        {PLACEHOLDER_FAQ.map((f, i) => {
          const expanded = open === f.id
          return (
            <li key={f.id} className={i > 0 ? 'border-t border-border' : ''}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : f.id)}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-subtle"
              >
                <span className="min-w-0 flex-1 font-medium">{f.q}</span>
                <CaretDown
                  size={18}
                  className={cn(
                    'shrink-0 text-muted-foreground transition-transform duration-200',
                    expanded && 'rotate-180',
                  )}
                />
              </button>
              {expanded && (
                <p className="px-4 pb-4 text-[14px] leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-8">
        <NotConnected endpoint="GET /faq" />
      </div>
    </div>
  )
}

const PLACEHOLDER_FAQ = [
  {
    id: 1,
    q: '대표 강아지가 뭔가요?',
    a: '채팅과 친구 기능은 강아지 단위로 동작합니다. 여러 마리를 등록했다면 그중 하나를 대표로 지정해야 합니다.',
  },
  {
    id: 2,
    q: '셋로그는 몇 초까지 올릴 수 있나요?',
    a: '3~5초 구간으로 올립니다. 긴 영상을 불러온 뒤 구간을 잘라 등록합니다.',
  },
  {
    id: 3,
    q: '친구는 어떻게 추가하나요?',
    a: '상대의 공개 태그로 검색해 요청을 보내고, 상대가 수락하면 연결됩니다.',
  },
]
