import type { ReactNode } from 'react'

/** 발자국 장식용 아이콘. 배경 위 저채도 포인트로만 쓴다. */
function PawPrint({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="32" cy="44" rx="15" ry="12" />
      <ellipse cx="13" cy="22" rx="7" ry="9" transform="rotate(-20 13 22)" />
      <ellipse cx="29" cy="12" rx="7" ry="9" />
      <ellipse cx="45" cy="14" rx="7" ry="9" transform="rotate(18 45 14)" />
      <ellipse cx="57" cy="27" rx="6" ry="8" transform="rotate(38 57 27)" />
    </svg>
  )
}

/** 로그인·회원가입 공통 레이아웃. 앱 셸(탭바/사이드바) 밖에서 렌더된다. */
export function AuthLayout({
  title,
  subtitle,
  hideTitle,
  children,
}: {
  title: string
  subtitle: string
  /** 화면상 제목을 숨기되 접근성 트리에는 남긴다(sr-only). */
  hideTitle?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-background">
      <PawPrint className="pointer-events-none absolute top-10 left-8 size-14 -rotate-12 text-primary/15" />
      <PawPrint className="pointer-events-none absolute top-24 left-24 size-8 rotate-12 text-primary/20" />
      <PawPrint className="pointer-events-none absolute top-14 right-10 size-14 rotate-12 text-primary/15" />
      <PawPrint className="pointer-events-none absolute top-44 right-16 size-9 -rotate-6 text-primary/20" />
      <PawPrint className="pointer-events-none absolute bottom-40 right-10 size-10 rotate-6 text-primary/20" />

      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-primary md:h-36"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,120 C240,60 480,180 720,120 C960,60 1200,160 1440,100 L1440,220 L0,220 Z"
          className="fill-primary/10"
        />
        <path
          d="M0,150 C240,110 480,200 720,150 C960,100 1200,190 1440,140 L1440,220 L0,220 Z"
          className="fill-primary/20"
        />
      </svg>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo-mark.png" alt="" className="size-24 shrink-0" />
          <p className="mt-2 text-4xl font-extrabold text-primary-strong">Dogether</p>
          <h1 className={hideTitle ? 'sr-only' : 'mt-6 text-2xl font-bold'}>{title}</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
