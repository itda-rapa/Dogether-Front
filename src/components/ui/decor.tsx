/*
  브랜드 장식 요소. 전부 의미 없는 꾸밈이므로 aria-hidden + pointer-events-none 이고,
  색은 primary 계열 알파로만 쓴다(라이트/다크 모두 토큰이 알아서 뒤집힌다).
*/

/** 발자국 아이콘. 배경 위 저채도 포인트로만 쓴다. */
export function PawPrint({ className }: { className?: string }) {
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

/*
  화면 배경 발자국.

  fixed + -z-10 이라 본문(정적 요소) 뒤, 페이지 배경 위에 깔린다. 조상 중 누구도
  스택 컨텍스트를 만들지 않아야 하므로(AppShell 래퍼들은 z-index/transform 이
  없다) 여기에 isolate 를 붙이면 안 된다.

  본문은 max-w-3xl 가운데 정렬이라 좌우가 비는 데스크톱을 노려 가장자리에 둔다.
  모바일에서는 본문이 폭을 다 쓰므로 알파를 낮게 유지한다.
*/
export function PawScatter() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <PawPrint className="absolute top-[12%] left-[3%] size-14 -rotate-12 text-primary/15" />
      <PawPrint className="absolute top-[26%] left-[8%] size-8 rotate-12 text-primary/10" />
      <PawPrint className="absolute top-[18%] right-[4%] size-12 rotate-12 text-primary/15" />
      <PawPrint className="absolute top-[44%] right-[9%] size-8 -rotate-6 text-primary/10" />
      <PawPrint className="absolute bottom-[26%] left-[5%] size-10 rotate-6 text-primary/10" />
      <PawPrint className="absolute bottom-[12%] right-[6%] size-14 -rotate-12 text-primary/15" />
      {/* 사이드바에 가려지지 않는 중앙~우측 여백을 위한 보강. 카드가 적은 화면이 휑해 보이는 걸 완화한다. */}
      <PawPrint className="absolute bottom-[36%] left-[40%] size-9 rotate-6 text-primary/10" />
      <PawPrint className="absolute top-[56%] right-[30%] size-7 -rotate-12 text-primary/10" />
      <PawPrint className="absolute bottom-[6%] left-[44%] size-10 -rotate-6 text-primary/15" />
    </div>
  )
}

/** 브랜드 웨이브. 사이드바 하단처럼 세로로 비는 자리를 채운다. */
export function BrandWave({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,62 C40,30 80,92 120,62 C160,32 200,84 240,52 L240,120 L0,120 Z"
        className="fill-primary/10"
      />
      <path
        d="M0,84 C40,58 80,108 120,84 C160,60 200,104 240,76 L240,120 L0,120 Z"
        className="fill-primary/20"
      />
    </svg>
  )
}

/*
  메인 콘텐츠 하단 웨이브. 뷰포트 바닥에 고정해 카드가 몇 개뿐인 화면도
  로그인 화면처럼 바닥이 비어 보이지 않게 한다. 화면 폭 전체에 그린다 —
  사이드바 구간은 불투명한 bg-surface 에 가려지고, 그 자리는 Sidebar 안의
  BrandWave 가 같은 기준(bottom -8px, h-36, 화면 폭)으로 왼쪽 240px 만
  잘라 보여주므로 이음새에서 파형이 그대로 이어진다. -z-10 이라 PawScatter와
  마찬가지로 항상 콘텐츠 뒤에 깔린다.

  w-screen 은 필수다. svg 는 replaced element 라 width:auto 면 left/right 로
  늘어나지 않고 viewBox 비율(240:120)과 height 로 정해진 고유 폭(h-36 이면
  288px)만 차지한다. inset-x-0 만으로는 화면 왼쪽에 288px 짜리 웨이브가
  덩그러니 잘린 채 놓인다.
*/
export function MainWave() {
  return (
    <BrandWave className="pointer-events-none fixed left-0 -bottom-2 -z-10 h-28 w-screen md:h-36" />
  )
}
