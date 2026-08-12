# 프로필 사진(User·Pet) 업로드 — BE 인수인계

작성일: 2026-08-06 (프론트 `agent/friend-wiring-and-setlog-shorts` 브랜치, M2 진행 중)

## 배경

마이페이지에서 사람(User) 프로필 사진과 펫(Pet) 프로필 사진을 올릴 수 있게
프론트를 먼저 만들었다. 저장 자체(S3 presigned 업로드)는 이미 있는
`/api/v1/media/*` 범용 미디어 API로 되지만, 그 결과를 "이건 내 프로필 사진이다"
라고 User·Pet 레코드에 매다는 엔드포인트가 없어서 새로 제안한다.

**참고**: `Pet.profileUrl` 관련 기존 주석에 "M1 사용자 등록 Pet은 profileUrl이
항상 null"이라고 돼 있던 건 v13 "사진 AI 완전 폐기"(D-01) 결정 때문인데, 그건
AI 분석·인증 파이프라인(`photo_sessions`, `ai_jobs`) 폐기였지 단순 이미지
저장까지 막는 결정은 아니었다. 지금은 M2 진행 중이라 이 범위로 다시 열어도
될 시점이라고 보고 진행한다.

## 제안하는 신규 엔드포인트

### 1. 사람 프로필 사진

```
PATCH /me/avatar
Body: { "mediaId": 123 }
Response: Me (avatarUrl 채워서 반환)
```

`Me` 스키마(OpenAPI)에 `avatarUrl: string | null` 필드 추가 필요. 지금 프론트
타입([features/auth/types.ts](../../src/features/auth/types.ts))엔 이미
`avatarUrl?: string | null` 로 옵셔널 추가해 뒀다 — 응답에 필드가 아예 없으면
`undefined`로 온다고 가정하고 짰다.

### 2. 펫 프로필 사진

```
PATCH /pets/{petId}/profile-image
Body: { "mediaId": 123 }
Response: Pet (profileUrl 채워서 반환)
```

기존에 없던 `PATCH /pets/{petId}` 전체 수정 엔드포인트를 통째로 여는 대신,
사진 하나만 다루도록 좁혀서 제안한다. `Pet.profileUrl`은 이미 스키마에 있는
필드라 새 필드 추가는 필요 없고, 이 엔드포인트로 값을 채우기만 하면 된다.

## 왜 URL 대신 mediaId 를 받는가

`uploadMedia`가 끝나면 프론트가 `downloadUrl`(presigned)을 이미 갖고 있지만,
그걸 그대로 body 로 보내지 않는다. presigned URL은 만료되고, 무엇보다 클라이언트가
임의 URL을 프로필로 박아 넣을 수 있으면 안 된다. `mediaId`만 보내고, 서버가:

1. 그 media 가 **요청자 소유**인지 (`MediaResponse.userId` 확인)
2. **`status`가 업로드 완료 상태**인지 (`UPLOADED`/`COMPLETED`, `INIT`이면 거부)
3. **mediaType이 `IMAGE`**인지 (영상 업로드 후 프로필로 우기는 것 방지)

를 검증하고, 서버가 자체적으로 안정적인 조회 URL(공개 URL 또는 장수명 presigned)을
만들어 `avatarUrl`/`profileUrl`에 저장·반환하는 걸 제안한다. 프론트는 클라이언트가
만료되는 presigned URL을 직접 캐시에 박아두지 않는다.

## 검증 관련 확인 필요한 점

1. **파일 형식**: 프론트는 `image/jpeg`만 파일 선택창에서 받고
   ([AvatarUpload.tsx](../../src/components/ui/AvatarUpload.tsx)),
   업로드 직전에도 `getMediaType(file) !== 'IMAGE'`면 거부한다. 서버도 동일하게
   IMAGE만 허용하는지, PNG 등 다른 이미지 포맷 확장 계획이 있는지 확인 필요.
2. **크기 제한**: 현재 media API에 파일 크기 상한이 있는지 문서에서 못 찾았다.
   프로필 사진은 원본 그대로 무제한 업로드를 허용할지, 아니면 리사이즈/용량 제한을
   둘지 결정 필요.
3. **소유권 검증 실패 시 오류 코드**: 다른 사람 mediaId 를 보내거나 이미 다른
   용도로 쓰인 mediaId 를 보내면 어떤 에러 코드로 응답할지 (`MEDIA_NOT_OWNED`
   같은 신규 코드 제안).

## 프론트 현재 상태

- [components/ui/AvatarUpload.tsx](../../src/components/ui/AvatarUpload.tsx) —
  공용 아바타 업로드 컴포넌트. 파일 선택 → `uploadMedia`(S3) → 호출부가 넘긴
  `onUploaded` 콜백에서 위 PATCH 호출
- [features/auth/api.ts](../../src/features/auth/api.ts) — `updateMyAvatar(mediaId)`
- [features/pet/api.ts](../../src/features/pet/api.ts) — `updatePetProfileImage(petId, mediaId)`
- [routes/MePage.tsx](../../src/routes/MePage.tsx) — 상단 프로필 카드(사람)와
  "나의 펫" 목록 각 행(펫)에 카메라 배지로 노출
- [components/AppShell.tsx](../../src/components/AppShell.tsx) — 헤더의 작은
  프로필 아이콘도 `me.avatarUrl` 있으면 실제 이미지로 표시(업로드 기능은 없음)

**이 두 엔드포인트는 아직 배포되지 않았다.** 그동안 업로드 버튼을 누르면
S3 저장까지는 성공하지만, 이어지는 PATCH 호출이 404로 실패해 화면에 에러
메시지만 뜨고 이미지는 반영되지 않는다 — 의도된 동작이다.
