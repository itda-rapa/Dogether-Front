# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Dogether
**Generated:** 2026-07-28 20:23:58
**Category:** Hyperlocal Services
**Design Dials:** Variance 4/10 (Balanced / Modern) | Motion 4/10 (Standard) | Density 6/10 (Standard)

---

## 프로젝트 오버라이드 (생성값 대비 수정 사항)

생성된 추천 중 이 프로젝트에서 **틀린 값**을 아래와 같이 교정했다. 본문 값은 이미 교정본으로 갱신되어 있다.

| # | 생성값 | 교정값 | 이유 |
|---|--------|--------|------|
| 1 | Varela Round / Nunito Sans | **Pretendard Variable** | 원본 두 폰트 모두 한글 글리프 없음. 앱 전체가 한국어. |
| 2 | 오렌지 팔레트 전체 (`#EA580C` 계열) | **딥민트 청록 `#0F766E` + 웜화이트 `#FFFBF5`** | 아래 "브랜드 색 결정" 참조. |
| 3 | `.btn-primary` 배경 `#2563EB` | **`var(--color-primary)`** | 팔레트의 primary와 컴포넌트 스펙이 서로 다른 색이었음. |
| 4 | `.card` 배경 `#FFF7ED` | **`#FFFFFF`** | 페이지 배경과 동일해 카드 경계가 사라짐. |
| 5 | Page Pattern = Community/Forum Landing | **앱 셸에는 미적용** | 랜딩 전용 패턴. 로그인 후 앱 화면 구조와 무관. 홍보용 랜딩 제작 시에만 참고. |

### 브랜드 색 결정 (2026-07-28 확정)

**브랜드는 2색이다 — 딥민트 청록 + 웜화이트.** 생성된 오렌지 팔레트를 폐기하고 교체했다.

**오렌지를 버린 이유**
- 당근마켓이 오렌지다. Figma 기획 주석에 **"당근 마켓 벤치"** 라고 명시되어 있고, Dogether도 동일한 동네 기반 서비스다. 오렌지 주색은 클론으로 읽힌다. 색상 DB는 제품 태그(pet/local)만 보고 경쟁 서비스를 모르기 때문에 이 리스크를 반영하지 못한다.
- 생성된 오렌지(`#EA580C`)는 흰 텍스트 대비 3.56:1로 AA 미달이라 어차피 우회가 필요했다.

**청록을 고른 이유**
- **면과 텍스트 양쪽에서 작동한다.** `#0F766E`는 흰 글씨를 얹으면 5.47:1, 웜화이트 위에 텍스트로 쓰면 5.31:1로 **둘 다 통과**한다. 활성 탭 라벨·안읽음 배지·선택된 필터칩·링크처럼 작은 컬러 텍스트 상태가 많은 앱이라 이 성질이 결정적이다. (코랄 `#FF7F50`은 텍스트로 쓰면 2.42:1로 사용 불가)
- 펫 건강 데이터(예방접종·혈액형·담당수의사·특별건강관리)가 많은 제품과 톤이 맞는다.

**웜샌드(`#F3EFE7`)를 배경으로 고른 이유**
- 원래 배경 `#FFF7ED`는 크림색이라 **셋로그 영상 썸네일에 노란 색조를 입힌다.** 영상이 주 콘텐츠인 앱에서 배경이 콘텐츠 색을 왜곡하면 안 된다.
- 단, 처음 잡았던 웜화이트 `#FFFBF5`는 반대 방향으로 실패했다. 흰 카드(`#FFFFFF`)와 명도차가 **1.03:1** 밖에 안 나와 카드가 카드로 읽히지 않고 화면 전체가 한 덩어리로 보였다. `#F3EFE7`은 **1.15:1**로 분리되면서 따뜻함도 유지한다.

**큰 면을 브랜드색으로 채우지 않는다**
- 영상 자리표시자·아바타·지도 영역을 `--color-primary-subtle`(창백한 민트)로 채웠더니 화면 절반이 물 빠져 보이고, 정작 청록이 브랜드색으로 읽히지 않았다.
- `--color-primary-subtle`은 **선택된 칩·hover 배경 같은 작은 상태 표시 전용**이다. 이미지/영상 자리에는 중립색 `--color-muted`를 쓴다.
- 청록은 **솔리드로** 박는다: 활성 탭·선택된 칩·동네 뱃지·주요 버튼. 창백한 톤으로 넓게 깔면 브랜드가 사라진다.

**코랄(`#FF7F50`)의 지위 — 브랜드 색 아님, 기능색**
- 좋아요·하트 **전용**으로만 쓴다 (지도 장소 하트, 게시판 좋아요).
- 이유: 청록 하트는 의미가 안 읽히고, 빨강 하트는 `--color-destructive`(삭제)와 충돌한다.
- 브랜드 색으로 승격시키지 않는다. 색이 둘이면 영상 피드가 시끄러워진다.

**금지:** 청록 톤을 `#0D9488`(teal-600) 이상으로 올리지 말 것 — 흰 텍스트가 3.74:1로 떨어진다. 700(`#0F766E`)이 하한선이다.

---

## Global Rules

### Color Palette

모든 대비값은 직접 계산해 검증했다. 컴포넌트에는 raw hex를 쓰지 않고 변수만 참조한다.

| Role | Hex | CSS Variable | 대비 | 용도 |
|------|-----|--------------|------|------|
| Primary | `#0F766E` | `--color-primary` | 흰 글씨 **5.47:1** ✓<br>배경 위 텍스트 **5.31:1** ✓ | 브랜드. **면·텍스트 양쪽 사용 가능** |
| Primary Hover | `#115E59` | `--color-primary-hover` | — | 버튼 hover |
| Primary Subtle | `#CCFBF1` | `--color-primary-subtle` | 남색 글씨 ✓ | 선택된 칩·배지 배경 |
| On Primary | `#FFFFFF` | `--color-on-primary` | — | 청록 면 위 텍스트 |
| Background | `#F3EFE7` | `--color-background` | — | 페이지 배경 (웜샌드) |
| Surface | `#FFFFFF` | `--color-surface` | — | 카드·시트·모달 |
| Muted | `#E7E1D6` | `--color-muted` | — | 이미지·영상 자리표시자. **브랜드색으로 채우지 않는다** |
| Foreground | `#0F172A` | `--color-foreground` | **17.3:1** ✓ | 본문 텍스트 |
| Muted Foreground | `#64748B` | `--color-muted-foreground` | **4.62:1** ✓ | 타임스탬프·보조 텍스트 |
| Border | `#EDE9E3` | `--color-border` | — | 카드·구분선 |
| Like (코랄) | `#FF7F50` | `--color-like` | 남색 글씨 **7.14:1** ✓ | **좋아요·하트 전용 기능색.** 텍스트 색으로 사용 금지(2.42:1) |
| Destructive | `#DC2626` | `--color-destructive` | **4.53:1** ✓ | 삭제·오류 |
| Ring | `#0F766E` | `--color-ring` | — | 포커스 링 |

**Color Notes:** Deep mint teal + warm white. 코랄은 브랜드 색이 아니라 좋아요 전용 기능색.

### Dark Palette

스킬 규칙 `color-dark-mode`: **다크는 색을 반전시키는 것이 아니라 채도를 낮춘 밝은 톤 변형을 쓰고, 대비를 별도로 검증한다.** 아래 값은 전부 실제 대비를 계산해 검증했다.

| Role | Hex | CSS Variable | 배경(#0F172A) 대비 | 비고 |
|------|-----|--------------|--------------------|------|
| Background | `#0F172A` | `--color-background` | — | 순수 검정(#000) 금지 — 영상 위 대비가 과해 눈이 피로 |
| Surface (카드) | `#192134` | `--color-surface` | 1.11:1 (배경 대비) | 명도차가 작으므로 **보더 필수** |
| Border | `rgba(255,255,255,0.08)` | `--color-border` | — | 다크에서 카드 경계는 보더가 담당 |
| Foreground | `#F8FAFC` | `--color-foreground` | **17.1:1** ✓ | 본문 |
| Muted Foreground | `#94A3B8` | `--color-muted-foreground` | **6.96:1** ✓ (카드 위 6.26:1 ✓) | 보조 텍스트·타임스탬프 |
| Primary | `#2DD4BF` | `--color-primary` | **9.59:1** ✓ | 라이트 `#0F766E`의 밝은 톤 변형 |
| Primary Subtle | `rgba(45,212,191,0.14)` | `--color-primary-subtle` | — | 선택 상태 배경 |
| On Primary | `#0F172A` | `--color-on-primary` | 9.59:1 ✓ | **다크에서는 청록 면 위에 흰색이 아니라 남색 텍스트** |
| Like (코랄) | `#FF7F50` | `--color-like` | **7.14:1** ✓ | 라이트와 동일값 그대로 사용 가능 |
| Destructive | `#EF4444` | `--color-destructive` | **4.75:1** ✓ | |
| Ring | `#2DD4BF` | `--color-ring` | — | 포커스 링 |

**다크에서 절대 하지 말 것**

- ❌ 라이트의 primary `#0F766E`를 그대로 쓰기 → 어두운 배경에 묻힌다. 반드시 `#2DD4BF`로 교체.
- ❌ 배경을 `#000000`으로 두기 → 영상 썸네일 경계가 과하게 튄다.
- ❌ 청록 면 위에 흰 텍스트 → 다크의 `#2DD4BF`는 매우 밝아서 흰 글씨가 안 읽힌다. `On Primary`는 남색(`#0F172A`).
- ❌ 라이트 그림자(`--shadow-*`)를 그대로 재사용 → 다크에서는 그림자 대신 **보더 + surface 명도차**로 elevation을 표현한다.

**구현 방식** — Tailwind `darkMode: 'class'` + CSS 변수 오버라이드. 컴포넌트에는 raw hex를 절대 쓰지 않고 변수만 참조하면 두 모드가 자동으로 갈린다(우선순위 6 — "Raw hex in components" 금지).

```css
:root { /* light */
  --color-background:      #FFFBF5;
  --color-surface:         #FFFFFF;
  --color-foreground:      #0F172A;
  --color-muted-foreground:#64748B;
  --color-border:          #EDE9E3;
  --color-primary:         #0F766E;
  --color-primary-hover:   #115E59;
  --color-primary-subtle:  #CCFBF1;
  --color-on-primary:      #FFFFFF;
  --color-like:            #FF7F50;
  --color-destructive:     #DC2626;
  --color-ring:            #0F766E;
}
:root.dark {
  --color-background:      #0F172A;
  --color-surface:         #192134;
  --color-foreground:      #F8FAFC;
  --color-muted-foreground:#94A3B8;
  --color-border:          rgba(255,255,255,0.08);
  --color-primary:         #2DD4BF;
  --color-primary-hover:   #5EEAD4;
  --color-primary-subtle:  rgba(45,212,191,0.14);
  --color-on-primary:      #0F172A;
  --color-like:            #FF7F50;
  --color-destructive:     #EF4444;
  --color-ring:            #2DD4BF;
}
```

**좋아요/하트 사용 규칙**
- 비활성: 외곽선 아이콘 + `--color-muted-foreground`
- 활성: 채움 아이콘 + `--color-like`
- 색만으로 상태를 구분하지 않는다 — **외곽선/채움 형태 변화를 반드시 동반**한다 (스킬 규칙 `color-not-decorative-only`)

### Typography

- **Heading / Body Font:** **Pretendard Variable** (한글·영문 단일 패밀리)
- **Mood:** soft, rounded, friendly, approachable, warm, gentle
- **Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`

> **원본 추천 폐기:** 생성된 추천은 Varela Round / Nunito Sans였고 DB에서 "pet apps, friendly brands"로 태깅되어 무드는 정확했으나, **두 폰트 모두 한글 글리프가 없다.** UI 텍스트가 전부 한국어이므로 사용 불가.
> Pretendard는 한국어 웹의 사실상 표준이며, 400~700 weight를 하나의 가변 폰트로 커버해 원본 페어링의 "둥글고 친근한" 무드에 가장 근접한다.

**CSS Import:**
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');

:root {
  --font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont,
               'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
}
```

**타입 스케일** (본문 16px 고정 — 12px 미만 금지, line-height 1.5)

| 역할 | 크기 | Weight | Line-height |
|------|------|--------|-------------|
| Display | 32px | 700 | 1.25 |
| H1 | 24px | 700 | 1.3 |
| H2 | 20px | 600 | 1.4 |
| Body | 16px | 400 | 1.5 |
| Caption | 14px | 400 | 1.5 |
| Label | 13px | 500 | 1.4 |

### Spacing Variables

*Density: 6/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

모든 버튼은 **최소 히트영역 44×44px**, 버튼 간 간격 8px 이상을 지킨다.

```css
/* Primary Button — 브랜드 청록 */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  min-height: 44px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: background-color 200ms ease, box-shadow 200ms ease;
  cursor: pointer;
}

.btn-primary:hover { background: var(--color-primary-hover); box-shadow: var(--shadow-md); }
.btn-primary:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }

/* Secondary Button — 아웃라인. 청록은 텍스트로도 대비를 통과하므로 그대로 쓸 수 있다. */
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  min-height: 44px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: background-color 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover { background: var(--color-primary-subtle); }
.btn-secondary:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }
```

> **원본에서 수정:** 생성된 `.btn-primary`는 배경이 `#2563EB`(accent 블루)라 팔레트의 primary와 모순이었다. 변수 참조로 바꿔 라이트/다크가 자동으로 갈리게 했다.
> `transform: translateY(-1px)` hover는 제거했다 — 스킬의 금지 항목("Layout-shifting hovers")에 해당하고, 44px 히트영역을 hover 중 미세하게 흔든다.

### Cards

```css
.card {
  background: var(--color-surface); /* 흰색 — 페이지 배경(웜화이트)과 분리 */
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--space-md); /* 16px. 리스트 밀도 확보 — 원본 24px는 앱 리스트엔 과함 */
  box-shadow: var(--shadow-sm);
  transition: box-shadow 200ms ease, background-color 200ms ease;
  cursor: pointer;
}

.card:hover { box-shadow: var(--shadow-md); }
.card:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }
```

> **원본에서 수정:** 생성된 카드 배경 `#FFF7ED`는 `--color-background`와 **동일한 값**이라 카드 경계가 사라진다. 흰 surface + 1px 보더로 교체했다.
> `translateY(-2px)` hover 역시 layout-shifting hover 금지 규칙에 걸려 제거.

**영상 카드 (셋로그 피드) 추가 규칙**
- 3~5초 클립. `aspect-ratio`를 CSS로 **미리 고정**해 CLS 0.1 미만 유지 (스킬 우선순위 3 — Performance)
- 포스터 프레임을 WebP/AVIF로 먼저 깔고 영상은 지연 로드
- 영상 카드는 웜화이트(`--color-background`) 위에 흰 surface로 올린다. 채도 있는 배경 위에 직접 올리지 않는다 — 썸네일 색이 왜곡된다

### Inputs

```css
.input {
  background: var(--color-surface);
  color: var(--color-foreground);
  padding: 12px 16px;
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px; /* 16px 미만 금지 — iOS Safari가 포커스 시 자동 확대한다 */
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.input:focus-visible {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.input[aria-invalid='true'] { border-color: var(--color-destructive); }
```

> **원본에서 수정:** focus 색이 `#EA580C` 하드코딩이었다. 변수 참조로 바꿔야 다크 모드에서 포커스 링이 따라간다.
> 폼 규칙(우선순위 8): 라벨은 항상 보이게 두고 placeholder로 대체하지 않는다. 에러 메시지는 **해당 필드 바로 아래**에 놓는다.

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Vibrant & Block-based

**Keywords:** Bold, energetic, playful, block layout, geometric shapes, high color contrast, duotone, modern, energetic

**Best For:** Startups, creative agencies, gaming, social media, youth-focused, entertainment, consumer

**Key Effects:** Large sections (48px+ gaps), animated patterns, bold hover (color shift), scroll-snap, large type (32px+), 200-300ms

**Key Effects 적용 범위 주의:** 원본의 "Large sections (48px+ gaps)", "large type (32px+)"는 랜딩 페이지 기준이다. 앱 화면(피드·채팅·게시판·지도)에는 위 Spacing/타입 스케일 표를 정본으로 쓴다.

### Page Pattern

> ⚠️ **앱 화면에는 적용하지 않는다.** 아래는 미로그인 방문자용 **홍보 랜딩 페이지 전용** 패턴이다.
> Dogether 본 서비스는 로그인 이후의 앱 셸이므로 Hero/Join CTA 구조가 성립하지 않는다. 랜딩을 별도로 만들 때만 참고할 것.

**Pattern Name:** Community/Forum Landing *(랜딩 전용)*

- **Conversion Strategy:** Show active community (member count, posts today). Highlight benefits. Preview content. Easy onboarding.
- **CTA Placement:** Join button prominent + After member showcase
- **Section Order:** 1. Hero (community value prop), 2. Popular topics/categories, 3. Active members showcase, 4. Join CTA

### App Shell (실제 앱 화면 구조 — 정본)

반응형 전환 방식으로 확정:

| 뷰포트 | 내비게이션 |
|--------|------------|
| < 768px | 하단 고정 탭바 5개 |
| ≥ 768px | 좌측 사이드바 (동일 5개 항목, 라벨 표기) |

- 탭 정본: **홈 · 게시판 · ➕ · 채팅 · 지도** (스킬 규칙 `bottom-nav-limit` 5개 이하 충족)
- Figma의 화면별 탭바 불일치(지도=`리스트 확인`, 채팅상세=`검색/방/마이`)는 **설계 오류로 판단하고 위 정본으로 통일**한다. 지도의 "리스트 확인"은 탭이 아닌 지도 화면 내부의 시트 토글로 처리한다.
- 하단 탭바는 `env(safe-area-inset-bottom)`을 padding에 반영한다.
- 고정 탭바에 콘텐츠가 가리지 않도록 스크롤 컨테이너에 하단 여백을 확보한다(체크리스트: "No content hidden behind fixed navbars").

### Icons

- **Primary: Phosphor** (`@phosphor-icons/react`), `weight="regular"`, `size={20}` 기준
- **Fallback: Heroicons** (`@heroicons/react/24/outline`) — Phosphor에 적절한 의미의 아이콘이 없을 때만
- 두 라이브러리를 섞더라도 **선/채움, 라운드 정도, 획 두께를 통일**한다
- 이모지를 아이콘으로 쓰지 않는다 (스킬 금지 항목)
- 아이콘 단독 버튼에는 반드시 `aria-label`을 붙인다 (우선순위 1 — 접근성)

탭바 아이콘 매핑: 홈 `House` / 게시판 `ChatText` 또는 `Article` / 추가 `Plus` / 채팅 `ChatCircle` / 지도 `MapTrifold`. 햄버거는 `List`, 뒤로가기는 `ArrowLeft`.

### Routing & Deep Linking

앱 디자인에는 URL 개념이 없지만 웹에서는 **필수**다. 스킬 규칙: 뒤로가기 동작 파손 = Severity **High**, 딥링크 부재 = Medium.

| 화면 | 경로 |
|------|------|
| 홈 (셋로그 피드) | `/` |
| 게시판 목록 | `/board?category=free` |
| 게시글 상세 | `/board/:postId` |
| 채팅 목록 | `/chat` |
| 채팅방 | `/chat/:roomId` |
| 채팅방 생성 | `/chat/new` |
| 지도 | `/map?filter=cafe` |
| 장소 상세 | `/map/:placeId` |
| 마이페이지 | `/me` |
| 펫 상세 | `/me/pets/:petId` |
| 셋로그 업로드 (M2) | `/upload` |

- 게시판 카테고리·지도 필터는 **쿼리 파라미터로 URL에 반영**한다 (동일 URL이 여러 상태를 갖지 않게)
- 모달·바텀시트도 뒤로가기로 닫히도록 history에 push한다
- `location.replace()`로 히스토리를 덮어쓰지 않는다

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

**이 프로젝트에서의 적용 방침**

- 위 스니펫은 GSAP 기준이다. Motion 4/10 수준(표준 스크롤·스태거)은 **CSS transition + Framer Motion으로 충분**하며, GSAP 전체를 번들에 넣을 이유가 없다. 스니펫은 타이밍·이징 참고값으로만 쓴다.
- 적용 대상: 피드 카드 진입 스태거, 채팅 말풍선 등장, 하트 토글, 시트 열림.
- `back.out(1.4)`의 오버슈트는 **채팅 리스트·게시판 목록 같은 정보성 UI에는 쓰지 않는다** (위 Don't 항목).
- 모든 모션은 `prefers-reduced-motion: reduce`에서 비활성화한다.
- `width`/`height`/`top`/`left`는 애니메이션하지 않는다. `transform`과 `opacity`만 사용.

---

## Anti-Patterns (Do NOT Use)

- ❌ **"No map"** — 지역 기반 서비스에서 지도를 빼는 것. Dogether는 지도 탭이 있으므로 충족. 단 **장소 정보를 지도 없이 리스트로만 제공하는 화면을 만들지 말 것**.
- ❌ **"Hidden reviews"** — 커뮤니티 반응(댓글·좋아요·후기)을 접거나 숨기는 것. 게시판 댓글과 장소 좋아요는 기본 노출 상태여야 한다.

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (**Phosphor 우선, Heroicons 폴백**)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
