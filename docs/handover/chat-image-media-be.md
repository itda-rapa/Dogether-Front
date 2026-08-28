# 1:1 채팅 사진 전송 — BE 인수인계 (미디어/S3 담당자용)

작성일: 2026-08-21

## 배경

1:1 채팅에 사진을 보낼 수 있게 해달라는 요청이 있었는데, 확인해보니 실제로는
아직 어디에도 구현돼 있지 않았다. `dogether`(main)뿐 아니라 로컬에 있는 관련
백엔드 워크트리 12개(`dogether-chat-pr-clean`, `dogether-ws`,
`dogether-ws-contract`, `dogether-demo-websocket` 등 채팅과 가까운 브랜치
포함)를 전부 확인했지만 이미지/사진 관련 채팅 코드는 어디에도 없었고,
오히려 스펙 문서에서 "이미지·파일 첨부"를 **M1·M2 범위에서 명시적으로 제외**
한다고 못 박아 두었다:

- `docs/spec/00_최신_제품정책.md:56-57`
- `docs/spec/06_M2_WebSocket_계약.md` §11 "구현 제외" 목록
- `docs/spec/07_M2_마일스톤_WBS.md:59` — "M2로 당기려면 정책 문서를 먼저
  갱신해야 하며, 이 WBS가 임의로 포함하지 않는다"

즉 이건 버그가 아니라 의도된 범위 제외였다. 이번에 이 기능을 하기로
결정되면서, 정책 문서(`00_최신_제품정책.md`) 갱신 + WBS 신규 항목 등록이
먼저 필요하다 — 이 문서는 그 절차와 별개로 **기술적으로 어떻게 붙일지**를
먼저 정리해서 미디어/S3 담당자와 맞춰보기 위한 것이다.

## 핵심 아이디어: MediaService/MediaController는 안 건드린다

채팅(`itda.chat`, 본인 담당) 쪽에서 이미 있는 범용 Media(S3 presigned)
인프라를 그대로 재사용하는 안을 제안한다. **`itda.media` 패키지 파일은 한
줄도 수정하지 않는 걸 목표로 한다.**

업로드는 문제없이 된다 — `purpose` 같은 걸 검증하는 로직 자체가 없고
(`MediaInitRequest.java:6-9`는 `mediaType`, `fileSize`뿐), `Media` 엔티티도
`userId`만 요구할 뿐 게시글/펫 같은 소유 도메인 FK가 필요 없다
(`Media.java:66-77`).

막히는 건 **조회 쪽**이다. `GET /api/v1/media/{id}/presigned-url`이 호출하는
`MediaService.getOwnedPresignedDownload(id, ownerUserId)`
(`MediaService.java:168-180`)는 업로더 본인 소유 확인을 강제한다:

```java
Media media = mediaRepository.findByIdAndDeletedAtIsNull(id)
        .filter(candidate -> ownerUserId != null
                && ownerUserId.equals(candidate.getUserId()))
        .orElseThrow(() -> new BusinessException(ErrorCode.MEDIA_NOT_FOUND));
```

채팅 상대방은 업로더가 아니므로 이 경로로는 이미지를 절대 못 본다(404
`MEDIA_NOT_FOUND`). 반면 게시글/프로필/셋로그는 애초에 이 owner-gated
엔드포인트를 쓰지 않고, 자기 서비스 코드에서 owner 체크 없는 `public` 메서드를
직접 호출한다(`MediaService.java:158-166`):

```java
public String getPresignedUrl(Long id) { ... }
public PresignedDownloadUrl getPresignedDownloadUrl(Long id) {
    Media foundedMedia = mediaRepository.findByIdAndDeletedAtIsNullOrThrow(id);
    validateDownloadable(foundedMedia);
    return presignDownload(foundedMedia);
}
```

실제로 이렇게 쓰고 있는 곳: `BoardPostService.java:423`,
`PetProfileImageService.java:70`, `PetDisplayQueryService.java:117`,
`PetUpdateService.java:105`, `MyPetQueryService.java:90`,
`SetlogQueryService.java:195`, `SetlogReadService.java:137`. "이 글/프로필을
볼 수 있으면 이 이미지도 보여준다"는 가시성 판단을 각 도메인 서비스가 대신
해주는 구조다.

채팅도 같은 패턴을 쓰면 된다 — **"이 방 참여자면 이 메시지의 이미지도
보여준다"** 판단은 채팅 도메인(본인)이 하고, media 쪽엔 owner 체크 없는
기존 메서드만 호출한다. `MediaService`/`MediaController`는 그대로 둔다.

## 본인(BE-2, itda.chat) 쪽에서 할 일

1. `ChatMessage`에 `mediaId`(nullable) 컬럼 추가
2. `MessageType`(`TEXT, CARD, SYSTEM`)에 `IMAGE` 추가
3. `ChatMessageCreateRequest`(현재 `clientMessageId`, `body`뿐)에 `mediaId`
   필드 추가 — IMAGE 타입일 땐 body 없이 mediaId만 오는 경우 처리
4. 메시지 응답 매핑 시 `mediaId`가 있으면 `mediaService.getPresignedDownloadUrl(mediaId)`
   호출해서 `imageUrl`로 응답에 심기
5. 방 참여자 검증(이미 메시지 조회 API에 있는 로직)이 그대로 접근 제어 역할

이 5개는 미디어팀 조율 없이 채팅 도메인 안에서 끝난다.

## 확인/조율이 필요한 점 (미디어/S3 담당자에게)

1. **저장 경로**: `MediaController.initMedia()`가 subPath를 `"posts"`로
   하드코딩해서 (`MediaController.java:31`), 어떤 용도로 올리든 S3 경로가
   `users/{userId}/posts/{uuid}.{ext}`가 된다(`MediaService.java:58-65`).
   채팅 이미지도 이 경로 밑에 섞이는데, 그대로 둘지 아니면 subPath를
   호출부(purpose)별로 분기하도록 열어줄지 — 여는 거라면 `MediaController`
   변경이 필요하니 미리 조율하고 싶다.
2. **업로드 제한**: `MediaInitRequest`엔 `@Valid`도 없고 `fileSize` 상한도
   없다. 채팅처럼 트래픽이 잦은 곳에 그대로 열면 용량 제한 없는 업로드가
   남용될 여지가 있는데, 이걸 채팅 쪽에서 자체적으로 체크할지 아니면
   media 쪽에 공용 상한을 둘 계획이 있는지 확인하고 싶다.
3. **확장자/타입 검증**: `MediaType`이 `IMAGE`/`VIDEO` 둘뿐이고 `IMAGE`는
   확장자·Content-Type이 `.jpg`/`image/jpeg`로 고정돼 있다
   (`MediaType.java:6-17`) — 실제 업로드 바이트가 PNG/WEBP여도 서버가
   구분하지 않는다. 채팅에서도 이대로 갈지 확인 필요.
4. **presigned URL 만료(TTL)**: `getPresignedDownloadUrl()`이 만드는 URL은
   영구 링크가 아니라 만료형이다 — 로컬 `.env`는
   `PRESIGNEDURL_EXPIRATION_TIME_SEC=3600`(1시간), 상한은
   `S3Properties.java:18`의 `@Max(604800)`(최대 7일). 채팅 메시지 목록을
   불러올 때마다 URL을 새로 서명해서 내려주는 방식으로 갈 예정인데, 이게
   맞는 방향인지, 아니면 캐싱/CDN 쪽에서 고려할 게 있는지 확인하고 싶다.
5. **이미지 콘텐츠 검열**: 지금 텍스트 채팅엔 일일 배치 검열(M1-031)이
   있고 펫 등록사진엔 별도 AI 판별이 있는데, 채팅 이미지용 검열 로직은
   전혀 없다. 이건 미디어팀 소관이라기보다 AI-1 신규 작업 범위라
   참고로만 남긴다 — media 저장/조회 단에서 걸어줄 수 있는 부분이 있다면
   같이 논의하고 싶다.

## 현재 상태

- 프론트/백엔드 어디에도 구현 시작 전이다. 이 문서는 착수 전 설계 정렬용.
- 정책 문서(`00_최신_제품정책.md`) 갱신과 WBS 신규 항목 등록이 실제 착수의
  선행 조건이라는 점은 별개로 진행 중.
