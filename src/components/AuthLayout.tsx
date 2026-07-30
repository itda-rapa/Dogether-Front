import type { ReactNode } from 'react'

/** 로그인·회원가입 공통 레이아웃. 앱 셸(탭바/사이드바) 밖에서 렌더된다. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-2xl font-bold text-primary-strong">Dogether</p>
        <h1 className="mt-6 text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
