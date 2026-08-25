import { useEffect, useState } from 'react'
import dashSrc from '../../assets/loader/dash.png'
import dogSrc from '../../assets/loader/dog-run.png'
import pawSrc from '../../assets/loader/paw.png'
import { cn } from '../../lib/cn'

/**
 * 전체 화면 로딩 표시.
 *
 * 강아지·발자국·속도선은 디자인 시안에서 잘라낸 PNG 라 색을 토큰으로 바꿀 수
 * 없다. 그 외 배경·문구·스피너는 전부 시맨틱 토큰만 쓴다.
 *
 * 키프레임은 src/index.css 의 `dg-*` 에 있다. animation-fill-mode 를 두지
 * 않았으므로 prefers-reduced-motion 으로 애니메이션이 꺼져도 모든 요소가
 * 기본 스타일(= 보이는 상태)로 남는다.
 */
export function PawLoader({
  message,
  className,
}: {
  /** 넘기면 회전하지 않고 이 문구로 고정된다. */
  message?: string
  className?: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (message) return
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % MESSAGES.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [message])

  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        'relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-muted',
        className,
      )}
    >
      <span className="sr-only">불러오는 중…</span>

      {BACKDROP_PAWS.map((paw) => (
        <span
          key={`${paw.left}-${paw.top}`}
          aria-hidden="true"
          className="pointer-events-none absolute bg-primary-subtle"
          style={{
            left: paw.left,
            top: paw.top,
            width: paw.size,
            height: paw.size,
            transform: `rotate(${paw.rotate}deg)`,
            maskImage: `url(${pawSrc})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskImage: `url(${pawSrc})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
      ))}

      <svg
        aria-hidden="true"
        viewBox="0 0 300 78"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full text-primary-subtle"
      >
        <path
          fill="currentColor"
          d="M0,34 C60,10 110,54 160,40 C215,25 260,52 300,30 L300,78 L0,78 Z"
        />
      </svg>

      <div className="relative flex items-center gap-2">
        <img
          src={dashSrc}
          alt=""
          aria-hidden="true"
          className="w-8"
          style={{ animation: 'dg-dash-dart 0.9s ease-in-out infinite' }}
        />
        <img
          src={dogSrc}
          alt=""
          aria-hidden="true"
          className="w-[132px]"
          style={{ animation: 'dg-dog-bounce 0.62s ease-in-out infinite' }}
        />
      </div>

      <div className="relative -mt-2 flex gap-[11px]">
        {TRAIL_DELAYS.map((delay, i) => (
          <img
            key={delay}
            src={pawSrc}
            alt=""
            aria-hidden="true"
            className="w-[14px]"
            style={{
              marginTop: i % 2 === 0 ? 4 : 0,
              animation: `dg-paw-pop 1.1s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>

      <p aria-hidden="true" className="relative mt-5 font-medium text-primary-strong">
        {message ?? MESSAGES[index]}
      </p>

      <div className="relative mt-6 size-9">
        {SPINNER_DOTS.map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 size-[5px] rounded-full bg-primary"
            style={{
              margin: -2.5,
              transform: `rotate(${i * 45}deg) translate(15px)`,
              animation: `dg-dot-pulse 1.05s linear ${(-i * 0.13).toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

const MESSAGES = ['달려가는 중…', '냄새가 킁킁…', '꼬리 흔드는 중…']

/** 시안의 배경 발자국 배치. PNG 를 마스크로 써서 색만 토큰에서 가져온다. */
const BACKDROP_PAWS = [
  { left: '10%', top: '29%', size: 34, rotate: -18 },
  { left: '80%', top: '28%', size: 34, rotate: 14 },
  { left: '15%', top: '42%', size: 24, rotate: 26 },
  { left: '82%', top: '41%', size: 24, rotate: -22 },
  { left: '70%', top: '85%', size: 28, rotate: 10 },
  { left: '80%', top: '88%', size: 34, rotate: -12 },
]

const TRAIL_DELAYS = [0, 0.18, 0.36, 0.54]

const SPINNER_DOTS = [0, 1, 2, 3, 4, 5, 6, 7]
