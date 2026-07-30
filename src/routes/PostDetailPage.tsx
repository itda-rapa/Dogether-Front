import { useState } from 'react'
import { useParams } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { NotConnected } from '@/components/ui/NotConnected'
import { LikeButton } from '@/components/ui/LikeButton'
import { inputClass } from '@/components/ui/input-class'

/**
 * 게시글 상세.
 *
 * ⚠️ 댓글 깊이 정책이 아직 미결이다. Figma 주석에도 질문으로 남아 있다:
 *   - 대댓글의 대댓글까지 허용할 것인가
 *   - 원 댓글 삭제 시 대댓글을 유지할 것인가
 * 여기서는 흔한 기본값인 **1단계 대댓글**로 잡아두었다. 정책이 정해지면
 * 아래 Comment 구조와 백엔드 테이블을 함께 고쳐야 한다.
 */
export function PostDetailPage() {
  const { postId = '' } = useParams()
  const [comment, setComment] = useState('')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackLink to="/board" label="게시판" />

      <article className="mt-4">
        <p className="text-[13px] font-medium text-primary-strong">자유</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">
          중앙공원 산책로 공사 끝났네요
        </h1>

        <div className="mt-3 flex items-center gap-3">
          <div aria-hidden className="size-9 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">까망이 아빠</p>
            <p className="text-[13px] text-muted-foreground">10분 전</p>
          </div>
          {/*
            게시글 신고·차단은 M1 범위가 아니다.
            신고는 DIRECT 방 단위로만 접수되고, 게시글에는 대상 펫 정보가 없다.
          */}
        </div>

        <p className="mt-5 whitespace-pre-wrap leading-relaxed">
          오늘 가보니 바닥 다 깔려 있어요. 이제 편하게 다닐 수 있겠어요.
          {'\n\n'}
          강아지 데리고 가기도 좋고, 그늘도 많아서 여름에 괜찮을 것 같습니다.
        </p>

        <div className="mt-5 flex items-center gap-2 border-y border-border py-2">
          <LikeButton count={12} />
        </div>
      </article>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold">댓글 4</h2>

        <ul className="flex flex-col gap-4">
          {PLACEHOLDER_COMMENTS.map((c) => (
            <li key={c.id}>
              <CommentRow comment={c} />
              {c.replies.length > 0 && (
                <ul className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-4">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <CommentRow comment={r} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <form
          className="mt-6 flex items-end gap-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <label htmlFor="comment-input" className="sr-only">
            댓글 입력
          </label>
          <input
            id="comment-input"
            type="text"
            placeholder="댓글을 입력하세요"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={inputClass(false)}
          />
          <button
            type="submit"
            disabled={comment.trim() === ''}
            className="min-h-11 shrink-0 rounded-lg bg-primary px-4 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            등록
          </button>
        </form>
      </section>

      <div className="mt-8">
        <NotConnected
          endpoint={`GET /posts/${postId} · GET·POST /posts/${postId}/comments`}
          note="댓글 깊이 정책(대대댓글 허용 여부, 원댓글 삭제 시 처리)이 확정되어야 구조를 고정할 수 있습니다. 현재는 1단계 대댓글 기준입니다."
        />
      </div>
    </div>
  )
}

type PlaceholderComment = {
  id: number
  author: string
  body: string
  time: string
  likes: number
  replies: PlaceholderComment[]
}

const PLACEHOLDER_COMMENTS: PlaceholderComment[] = [
  {
    id: 1,
    author: '봉이 엄마',
    body: '오 드디어 끝났네요! 내일 가봐야겠어요',
    time: '5분 전',
    likes: 2,
    replies: [
      {
        id: 2,
        author: '까망이 아빠',
        body: '저녁에 가면 사람 적어요',
        time: '3분 전',
        likes: 0,
        replies: [],
      },
    ],
  },
  {
    id: 3,
    author: '초록이네',
    body: '그늘막도 생겼나요?',
    time: '1분 전',
    likes: 0,
    replies: [],
  },
]

function CommentRow({ comment }: { comment: PlaceholderComment }) {
  return (
    <div className="flex gap-3">
      <div aria-hidden className="size-9 shrink-0 rounded-full bg-muted" />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="truncate font-medium">{comment.author}</span>
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {comment.time}
          </span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap">{comment.body}</p>
        <div className="mt-1 flex items-center gap-1">
          <LikeButton count={comment.likes} />
          <button
            type="button"
            className="min-h-11 px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary-strong"
          >
            답글
          </button>
        </div>
      </div>
    </div>
  )
}
