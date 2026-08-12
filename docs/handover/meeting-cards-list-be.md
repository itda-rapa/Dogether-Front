# 약속 카드 목록 API — BE 인수인계

작성일: 2026-08-06 (프론트 `agent/friend-wiring-and-setlog-shorts` 브랜치)

## 배경

채팅과 지도 탭 사이에 "약속" 화면을 새로 추가했다. 채팅방에서 만들어진 약속 카드를
한곳에 모아 보고, 각 카드가 **누구와의 약속인지**도 표시한다.

문제는 현재 M1 계약(`04_M1_OpenAPI.yaml`)에 약속 카드 **목록** 조회가 없다는 것이다.
있는 건 단건뿐이다.

```
POST /chat/rooms/{roomId}/card-drafts   AI 초안
POST /meeting-cards                     확정 생성
GET  /meeting-cards/{cardId}            단건 조회
POST /meeting-cards/{cardId}/cancel     취소
```

또한 M2 단톡(그룹 채팅) 도입이 예정돼 있어 `MeetingCard.participantPetIds` 가 이미
배열로 정의돼 있다. 즉 "누구와의 약속"이 상대 1명으로 끝나지 않는 경우가 M2부터
정식으로 생긴다. 이 목록 화면은 그 전제를 깔고 만들었다.

## 제안하는 신규 엔드포인트

```
GET /meeting-cards/me?status={OPEN|CANCELED}&cursor=&limit=
```

- **범위**: 요청자의 Active Pet 이 `creatorPetId` 이거나 `participantPetIds` 에
  포함된 카드. (친구/차단 필터링은 카드 생성 시점 정책을 그대로 신뢰하고, 이 조회
  API 에서 별도 재검사는 하지 않는 것으로 가정했다 — 다르게 갈 거면 알려달라.)
- **정렬**: `meetAt` 기준. 방향은 프론트에서 상태별로 나눠 다시 정렬하므로 서버는
  아무 방향이나 고정해도 무방하다(예: 최신 생성순).
- **페이지네이션**: 기존 `ChatRoomListResult` 패턴과 동일하게
  `{ items, page: { nextCursor, hasNext } }` 형태를 기대한다.
- **`status` 쿼리는 선택**. 생략하면 OPEN/CANCELED 전체를 반환하고, 프론트가
  "다가오는 약속" / "지난·취소된 약속" 두 섹션으로 나눠 보여준다.

## 응답 바디 — `MeetingCard` + `participants` 인라인

```jsonc
{
  "items": [
    {
      "cardId": 1,
      "roomId": 10,
      "creatorPetId": 11,
      "participantPetIds": [11, 12],
      "cardType": "WALK",
      "placeText": "한강공원",
      "meetAt": "2026-08-10T10:00:00+09:00",
      "status": "OPEN",
      "canceledByPetId": null,
      "canceledAt": null,
      "createdAt": "2026-08-06T09:00:00+09:00",
      // 👇 목록 전용 추가 필드. 단건 조회(GET /meeting-cards/{cardId})엔 없어도 된다.
      "participants": [
        { "petId": 11, "publicTag": "초코#a1b2", "nickname": "초코",
          "profileUrl": null, "verified": true, "relationship": "FRIEND" },
        { "petId": 12, "publicTag": "몽이#c3d4", "nickname": "몽이",
          "profileUrl": null, "verified": false, "relationship": "FRIEND" }
      ]
    }
  ],
  "page": { "nextCursor": null, "hasNext": false }
}
```

- `participants` 의 원소 타입은 채팅/친구 기능에서 이미 쓰는 `PetSearchItem`
  (`petId, publicTag, nickname, profileUrl, verified, relationship`) 그대로 재사용한다.
  **새 스키마를 만들지 말 것.**
- `creatorPetId` 도 `participantPetIds` 에 포함된 값이므로 `participants` 배열에도
  당연히 들어있어야 한다. 프론트는 여기서 "나(Active Pet)"를 제외한 나머지로
  라벨을 만든다 (`초코와의 약속`, 그룹이면 `초코 외 2마리와의 약속`).

### 왜 ID만 안 주고 인라인으로 확장하나

그룹 카드는 참가자가 여러 명일 수 있어서, ID만 내려주면 프론트가 카드마다
`GET /pets/{petId}` 를 N번씩 불러야 한다(N+1). 이미 `FriendRequest` 응답이
`requesterPet`/`targetPet` 을 ID 대신 `PetSearchItem` 으로 인라인 반환하는
선례가 있어 같은 패턴을 따랐다.

## 프론트 현재 상태

- [features/meeting/types.ts](../../src/features/meeting/types.ts) —
  `MeetingCardListItem`(`MeetingCard & { participants }`), `MeetingCardListResult` 추가
- [features/meeting/api.ts](../../src/features/meeting/api.ts) —
  `listMyMeetingCards({ status?, cursor?, limit? })` 가 위 엔드포인트를 호출
- [routes/MeetingsPage.tsx](../../src/routes/MeetingsPage.tsx) — 새 화면, 경로 `/meetings`
- [app/navigation.ts](../../src/app/navigation.ts) — 탭바에 "약속" 항목 추가
  (채팅과 지도 사이)

**이 엔드포인트는 아직 배포되지 않았다.** 그동안은 `/meetings` 화면이 404 또는
네트워크 오류를 `ApiErrorNotice` 로 정상적으로 보여주는 상태이며, 이는 의도된
동작이다(폴백이 아니라 "아직 없음"을 보여주는 것).

## 확인이 필요한 점 (열어둔 채로 진행함)

1. **경로**: `/meeting-cards/me` 로 가정했다. 기존 `/pets/me` 컨벤션을 따른
   것인데, `/me/meeting-cards` 를 선호하면 알려달라 — 프론트는 `api.ts` 한 줄만
   바꾸면 된다.
2. **차단·삭제된 펫과의 카드**: 상대가 차단됐거나 펫이 비활성화된 경우
   `participants` 에 어떻게 나오는지 정의 안 됨. `PetSearchItem.relationship` 이
   이미 `NONE|REQUEST_SENT|REQUEST_RECEIVED|FRIEND|null` 을 표현하니 이 필드로
   충분히 판단 가능한지, 아니면 카드 자체를 숨겨야 하는지 확인 필요.
3. **읽기 권한과 v13 채팅 정책**: [[feedback_v13_core_policies]] 기준 "친구 삭제·
   차단 후에도 기존 채팅 기록은 조회 가능"이었다. 같은 원칙을 약속 카드 목록에도
   그대로 적용해도 되는지(즉 지금은 친구가 아니어도 과거 카드가 계속 보이는지)
   확인 필요.
