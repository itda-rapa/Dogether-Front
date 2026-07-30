import { Link, useSearchParams } from 'react-router'
import { ChatCircleText, Heart, PencilSimple } from '@phosphor-icons/react'
import { Page } from '@/components/ui/Page'
import { NotConnected } from '@/components/ui/NotConnected'
import { cn } from '@/lib/cn'

/** Figma 기획의 게시판 분류. 순서를 임의로 바꾸지 않는다. */
const CATEGORIES = ['자유', '약국', '병원', '고민', '카페', '호텔', '인기'] as const

export function BoardPage() {
  // 분류는 URL 에 반영한다. 같은 URL 이 여러 상태를 갖지 않아야 공유가 된다.
  const [params, setParams] = useSearchParams()
  const active = params.get('category') ?? '자유'

  return (
    <Page title="게시판">
      <div
        role="tablist"
        aria-label="게시판 분류"
        className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {CATEGORIES.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={active === c}
            onClick={() => setParams({ category: c })}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-4 font-medium transition-colors',
              active === c
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-muted-foreground hover:bg-primary-subtle',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* TODO: GET /posts?category= 연동 시 아래 목록을 실데이터로 교체 */}
      <ul className="mb-6 flex flex-col gap-2">
        {PLACEHOLDER_POSTS.map((p) => (
          <li key={p.id}>
            <PostRow post={p} />
          </li>
        ))}
      </ul>

      <NotConnected
        endpoint={`GET /posts?category=${active}`}
        note="위 목록은 레이아웃 확인용 예시입니다."
      />

      {/* 글쓰기는 하단 탭의 + 와 별개로 게시판 안에서도 진입할 수 있어야 한다. */}
      <Link
        to="/board/new"
        className="fixed bottom-20 right-4 inline-flex min-h-14 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-on-primary shadow-md transition-colors hover:bg-primary-hover md:bottom-6"
      >
        <PencilSimple size={20} weight="bold" />
        글쓰기
      </Link>
    </Page>
  )
}

type PlaceholderPost = {
  id: number
  category: string
  title: string
  excerpt: string
  author: string
  time: string
  likes: number
  comments: number
}

const PLACEHOLDER_POSTS: PlaceholderPost[] = [
  {
    id: 1,
    category: '자유',
    title: '중앙공원 산책로 공사 끝났네요',
    excerpt: '오늘 가보니 바닥 다 깔려 있어요. 이제 편하게 다닐 수 있겠어요.',
    author: '까망이 아빠',
    time: '10분 전',
    likes: 12,
    comments: 4,
  },
  {
    id: 2,
    category: '병원',
    title: '근처 24시 동물병원 추천받아요',
    excerpt: '밤에 갑자기 아플 때 갈 만한 곳 있을까요?',
    author: '봉이 엄마',
    time: '1시간 전',
    likes: 8,
    comments: 11,
  },
]

function PostRow({ post }: { post: PlaceholderPost }) {
  return (
    <Link
      to={`/board/${post.id}`}
      className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary-subtle"
    >
      <p className="text-[13px] font-medium text-primary-strong">{post.category}</p>
      <p className="mt-1 font-semibold">{post.title}</p>
      <p className="mt-1 line-clamp-2 text-[14px] text-muted-foreground">
        {post.excerpt}
      </p>
      <div className="mt-3 flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="truncate">{post.author}</span>
        <span>·</span>
        <span className="shrink-0">{post.time}</span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1">
          <Heart size={15} />
          <span className="tabular-nums">{post.likes}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <ChatCircleText size={15} />
          <span className="tabular-nums">{post.comments}</span>
        </span>
      </div>
    </Link>
  )
}
