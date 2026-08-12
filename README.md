# Dogether Frontend (잇다)

반려견 산책 메이트 매칭 서비스 **잇다(Dogether)**의 프론트엔드입니다.
React + TypeScript + Vite로 작성되었으며, 백엔드([`dogether`](https://github.com/itda-rapa))와 REST API로 통신합니다.

## 기술 스택

| 영역 | 선택 |
|---|---|
| 빌드 | Vite 8 |
| 언어 | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| 라우팅 | react-router 8 |
| 서버 상태 | @tanstack/react-query 5 |
| 폼 | react-hook-form + zod |
| 리스트 가상화 | @tanstack/react-virtual |
| 아이콘 | @phosphor-icons/react |
| 린트 | oxlint |

Next.js는 의도적으로 배제했습니다. 셋로그 영상 구간편집(ffmpeg.wasm/WebCodecs)과 지도 SDK 연동이 모두 브라우저 전용 기능이라 SSR의 이점이 없고, 서버/클라이언트 경계를 나누는 학습 비용만 추가되기 때문입니다.

## 시작하기

### 요구사항

- Node.js 24+
- 백엔드([`dogether`](https://github.com/itda-rapa), Spring Boot, 기본 포트 8080)를 `local` 프로필로 먼저 띄워둘 것

```bash
npm install
npm run dev
```

기본적으로 `http://localhost:5173`에서 열리며, `/api`로 오는 요청은 `vite.config.ts` 프록시가 백엔드로 전달합니다.

### 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | API 클라이언트(`src/lib/api.ts`)가 사용하는 베이스 URL |
| `VITE_API_PROXY_TARGET` | `http://localhost:8080` | 개발 서버 프록시가 바라볼 백엔드 주소 |

## 스크립트

```bash
npm run dev         # 개발 서버
npm run build        # 타입 체크(tsc -b) 후 프로덕션 빌드
npm run typecheck    # 타입 체크만
npm run lint         # oxlint
npm run preview      # 빌드 결과 미리보기
```

## 폴더 구조

```
src/
  app/          # 라우트 정의, 테마 컨텍스트
  components/   # 화면 간 공용 컴포넌트
  features/     # 도메인별 API 클라이언트·타입·훅 (auth, pet, friend, chat, setlog, meeting, media, moderation)
  routes/       # 페이지 컴포넌트
  lib/          # apiRequest 등 공통 유틸
design-system/  # 디자인 토큰·컴포넌트 정본 문서
docs/handover/  # 백엔드 인수인계 문서
```

## 아키텍처 규칙

- 모든 API 호출은 `src/lib/api.ts`의 `apiRequest()`를 거칩니다. 컴포넌트가 직접 `fetch`를 호출하지 않습니다.
- 백엔드 응답은 `{ success, message, data, error }` 봉투 구조이며, `apiRequest()`가 봉투를 벗기고 실패 시 `ApiError`를 던집니다.
- 서버 상태는 React Query로 관리합니다.
- 인증 토큰은 컴포넌트가 직접 다루지 않고 `configureAuth()` / `apiRequest()` 흐름을 통해서만 접근합니다.
- 자세한 작업 규칙은 [`CLAUDE.md`](./CLAUDE.md)를 참고하세요.

## 디자인 시스템

색상·타이포그래피 등 토큰 정본은 [`design-system/dogether/MASTER.md`](./design-system/dogether/MASTER.md)에 있습니다. Tailwind 커스텀 토큰(`primary`, `surface`, `border`, `muted` 등)을 우선 사용하고, 특별한 이유 없이 HEX 값을 하드코딩하지 않습니다.

## 커밋 컨벤션

`feat:`, `fix:` 등 [Conventional Commits](https://www.conventionalcommits.org/) 접두사에 한글 설명을 붙이는 방식을 따릅니다.

```
feat: 셋로그 피드 반응형 그리드와 카드 액션 바 정리
fix: 셋로그 그리드 열 전환 폭 보정과 캡션 오버플로 방지
```
