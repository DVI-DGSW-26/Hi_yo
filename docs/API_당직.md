# 당직 API 명세

Swagger `6. 당직` 태그를 옮긴 것이다. 원본이 항상 우선한다.

| | |
|---|---|
| 출처 | `https://api.dvi-ind.com/hi-yo/v3/api-docs` (Swagger UI `/hi-yo/swagger-ui/index.html`) |
| API 버전 | `DVI 인사시스템 API` v1 |
| 확인일 | 2026-08-28 |
| 서버 | `https://api.dvi-ind.com/hi-yo` (개발) |

**명단 · 배정 · 교체**다. S-503(본인)과 A-504(관리팀)가 이 태그를 같이 쓴다.

> **명세서보다 API가 자세하다.** 명세서 S-503은 서술 3문장이고 필드표가 없다.
> 교체 상대 규칙, `EXPIRED`와 거절의 구분, 슬롯 시각은 전부 API 쪽에만 있다.

> **확인일 기준 데이터가 전부 0이다.** 명단 3개의 `memberCount`가 모두 `0`이고,
> 배정도 교체 요청도 없다. 화면을 붙이면 빈 상태부터 만난다.

---

## 1. 공통

### 인증 · CORS

급여와 같다. `docs/API_급여.md` 1장을 본다.

### 응답 형식

**목록이 배열로 온다. 봉투가 아니다.** 신청·결재(`content`/`totalElements`)와 다르고
연차·급여와 같다. 페이지네이션이 없다.

### 오류

`docs/API_급여.md`와 같은 모양이다. `message`는 사용자에게 그대로 보여줘도 되는 한국어다.

> 오류 응답이 스펙에 선언돼 있지 않다. 16개 경로 전부 `200`만 문서화돼 있다.

---

## 2. 명단은 셋이고 서버가 정한다

명단을 만들거나 지우는 API가 없다. 서버가 정의해 둔 셋을 쓴다.
**명세서 S-503의 세 명단과 정확히 맞는다.**

| id | `code` | 이름 | 순환 | 자동 편성 | 슬롯 |
|---|---|---|---|---|---|
| 1 | `DAY_DUTY` | 당직(일직) | `BIWEEKLY` (14일마다) | 가능 | 없음. 08:00~17:00 |
| 2 | `WEEKDAY_OVERTIME` | 평일연장 | `ON_DEMAND` (수시) | **불가** | 없음. ~20:00 |
| 3 | `GUARD_SHIFT` | 경비교대 | `DAILY` (매일) | 가능 | **중식 11:30~12:00 · 석식 16:30~17:00** |

- `useSlot`이 `true`면 **하루에 배정이 여러 건** 생긴다. 화면이 이 값을 보고 슬롯 칸을 그린다
- `autoAssignable`이 `false`면 자동 편성을 돌릴 수 없다. 평일연장이 그렇다 —
  배정을 직접 넣는 것 말고 방법이 없다
- 순번(`rotationSeq`)은 **관리팀이 정한다.** 가나다순 자동 정렬이 아니며 자동 편성이 이 순서대로 돈다

---

## 3. 상태 흐름

### 배정 (`DutyScheduleResponse.status`)

```
PLANNED (예정) ──▶ DONE (완료)
      └────────▶ SWAPPED (교체됨)
```

**명세서와 다르다.** 명세서 1.4는 `예정/확정/완료`로 적고 있으나 API는
`PLANNED/DONE/SWAPPED`를 준다. `확정`에 해당하는 값이 없고 `교체됨`이 명세서에 없다.

### 교체 요청 (`DutySwapResponse.status`)

```
신청 ──▶ PENDING ──┬──▶ AGREED    동의. 그 자리에서 담당자가 바뀐다
                   ├──▶ REJECTED  거절
                   └──▶ EXPIRED   24시간 안에 답이 없었다
```

> **`EXPIRED`는 거절이 아니다.** 스펙이 화면에 구분을 요구한다 —
> "상대방이 못 본 것이므로 다시 요청하거나 다른 사람에게 부탁할 수 있습니다.
> 화면이 둘을 구분해 보여줘야 합니다."
>
> 명세서는 둘 다 '자동반려'로만 적고 있다. **API를 따른다.**

무응답으로 만료되면 **원 담당자가 그대로 유지된다** (명세서 5장 예외 1번과 같다).

---

## 4. 엔드포인트

### 본인용 (S-503)

| 메서드 | 경로 | 용도 |
|---|---|---|
| GET | `/duty/rosters` | 명단·슬롯 정의 |
| GET | `/duty/schedules/{employeeId}` | 내 당직 일정. `from`·`to` 필수 |
| GET | `/duty/swaps/inbox` | **내가 응답해야 할 교체 요청 — 마감 임박 순** |
| GET | `/duty/swaps/sent` | 내가 보낸 교체 요청 |
| POST | `/duty/schedules/{scheduleId}/swaps` | 교체 신청 |
| POST | `/duty/swaps/{swapId}/decision` | 동의 · 거절 |
| DELETE | `/duty/swaps/{swapId}` | 신청 취소 |

### 관리팀용 (A-504)

| 메서드 | 경로 | 용도 |
|---|---|---|
| GET | `/duty/rosters/{rosterId}/members` | 명단 대상자와 순번 |
| POST | `/duty/rosters/{rosterId}/members` | 대상자 추가 |
| PATCH | `/duty/rosters/{rosterId}/members/{employeeId}` | 순번 변경. `rotationSeq` **쿼리** |
| DELETE | `/duty/rosters/{rosterId}/members/{employeeId}` | 명단에서 제외 |
| GET | `/duty/schedules` | 당직표. `from`·`to` 필수, `rosterId` 선택 |
| POST | `/duty/rosters/{rosterId}/schedules` | 배정 직접 등록 |
| POST | `/duty/rosters/{rosterId}/schedules/generate` | 순번대로 자동 편성 |
| PATCH | `/duty/schedules/{scheduleId}` | 담당자 직접 변경. `employeeId` **쿼리** |
| DELETE | `/duty/schedules/{scheduleId}` | 배정 삭제 |

**`PATCH` 둘은 본문이 아니라 쿼리로 값을 받는다.** 다른 곳과 모양이 다르니 주의한다.

### 스펙에 적힌 제약

- `POST /duty/schedules/{id}/swaps` — **"본인 당직만, 명단 안의 사람에게만 보낼 수 있다"**
- `POST /duty/rosters/{id}/schedules` — 이미 배정된 날짜면 **`409`**. 담당자를 바꾸려면 수정 API를 쓴다.
  슬롯을 쓰는 명단은 `slotId`가 필수고 나머지는 비워야 한다
- `POST .../schedules/generate` — 이미 배정된 날짜는 건드리지 않는다. **몇 번을 다시 돌려도 안전하다**
- `DELETE /duty/schedules/{id}` — **교체 요청이 진행 중인 배정은 지울 수 없다.**
  상대방이 응답할 대상이 사라지기 때문이다
- `POST /duty/rosters/{id}/members` — 한 직원이 여러 명단에 동시에 속할 수 있다.
  **뺐다가 다시 넣으면 기존 행이 되살아난다**
- `DELETE .../members/{employeeId}` — 과거 배정 이력을 지우지 않으려고 **행을 삭제하지 않고 꺼 둔다**

---

## 5. 권한 (2026-08-28 실호출 확인)

| 경로 | 관리팀 | 일반 직원 |
|---|---|---|
| `GET /duty/rosters` | `200` | `200` |
| `GET /duty/swaps/inbox` · `/sent` | `200` | `200` |
| `GET /duty/schedules/{내 id}` | `200` | `200` |
| `GET /duty/schedules/{남의 id}` | `200` | **`403`** |
| `GET /duty/rosters/{id}/members` | `200` | **`403`** |
| `GET /duty/schedules` (당직표 전체) | `200` | **`403`** |

**권한이 제대로 걸려 있다.** 남의 일정을 id로 훑을 수 없다 — 재직증명서 단건·PDF가
열려 있는 것과 대조된다 (`docs/00_문서_인덱스.md` 「서버에 알려야 할 것」).

> **그런데 그것 때문에 S-503의 교체 신청을 만들 수 없다.** 7장 1번을 본다.

---

## 6. 스키마

### `DutyRosterResponse`

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` `code` `name` | | 명단 식별 |
| `rotationCycle` | `DAILY`\|`BIWEEKLY`\|`ON_DEMAND` | 순환 주기 |
| `autoAssignable` | boolean | 자동 편성 가능 여부 |
| `workStart` `workEnd` | `HH:mm:ss` | 근무 시간. 없을 수 있다 |
| `useSlot` | boolean | true면 하루에 배정이 여러 건 |
| `slots` | `SlotResponse[]` | `id` `code` `startTime` `endTime` |
| `memberCount` | integer | 대상자 수 |

### `DutyScheduleResponse`

`id` `rosterId` `rosterCode` `rosterName` `dutyDate` `dayOfWeek`
`slotId` `slotCode` `startTime` `endTime`
`employeeId` `employeeName` `departmentName` `status` `swapPending`

- **경비교대는 같은 날짜에 중식·석식 두 건이 온다.** `slotCode`로 구분한다
- `swapPending` — 교체 요청이 걸린 배정. 화면이 표시하고, 이 배정은 지울 수 없다

TODO: `dayOfWeek`가 `SATURDAY`인지 `토`인지 **확인하지 못했다.** 배정이 한 건도 없다.
확인 전까지 앱은 날짜에서 요일을 뽑는다.

### `DutySwapResponse`

`id` `dutyScheduleId` `rosterName` `dutyDate` `slotCode`
`requesterId` `requesterName` `targetId` `targetName`
`status` `reason` `responseComment` `requestedAt` `expiresAt` `respondedAt`

### 요청 본문

| 스키마 | 필수 | 선택 |
|---|---|---|
| `DutySwapRequest` | `targetId` | `reason` |
| `DutySwapDecisionRequest` | `agreed` | `comment` |
| `DutyAssignRequest` | `dutyDate` `employeeId` | `slotId` (슬롯 쓰는 명단만) |
| `DutyGenerateRequest` | `from` `to` | |
| `DutyMemberRequest` | `employeeId` `rotationSeq` | |

### `DutyGenerateResult`

`rosterId` `rosterName` `from` `to` `created` `skipped` `conflicts[]`

- `created` — 새로 만든 배정 수
- `skipped` — 이미 배정돼 있어 건드리지 않은 날짜 수
- `conflicts` — `Conflict { dutyDate, employeeId, employeeName, reason }`

> **연차와 겹치는 배정을 자동으로 건너뛰지 않는다.** 스펙이 이유를 적어두었다 —
> 다음 순번으로 넘길지 사람을 바꿀지가 확정되지 않아(**서버 스펙 `OPEN-QUESTIONS E-8`**)
> 겹친 건을 그대로 배정하고 `conflicts`로 알려 관리팀이 판단하게 한다.
> **조용히 건너뛰면 순번이 어긋난 이유를 아무도 설명할 수 없다.**
>
> 화면도 대신 고치지 않는다. 어느 건이 겹쳤는지만 알린다.

---

## 7. 미확정 — 확인이 필요한 것

### 1. 교체 상대 후보를 본인이 볼 수 없다 (서버)

> **2026-08-31 서버 답변.** Swagger 요약에 `관리팀만` 표시를 넣어 배포했다 — 스펙과 동작이
> 어긋나던 것은 해소됐다. **교체 신청 화면은 여전히 열리지 않았다.** 일반 직원이 같은 명단
> 사람을 볼 방법이 없다는 지적은 맞다고 인정했고, "같은 명단 사람만 담은 조회를 따로 연다"
> 쪽이 나아 보이나 당직 운영 방식이 확정 전이라 그때 같이 정하기로 했다.

**S-503의 교체 신청 절반을 막고 있다.**

`POST /duty/schedules/{scheduleId}/swaps`는 `targetId`가 필수인데, 일반 직원은 누구에게
부탁할 수 있는지 알아낼 방법이 없다. 후보를 담은 두 경로가 모두 `403`이다 (5장).

Swagger에 `GET /duty/rosters/{id}/members`는 **`관리팀만` 표시가 없다.** 같은 태그의
`POST`·`DELETE`·`PATCH`에는 붙어 있어서 조회는 열려 있는 것으로 읽힌다. 실제로는 막혀 있다.
**스펙과 동작 중 어느 쪽이 의도인지 정해야 한다.**

### 2. `dayOfWeek`의 형식

`SATURDAY`인지 `토`인지 확인하지 못했다. 배정 데이터가 없다.

### 3. 순번이 겹치면 어떻게 도는가

`PATCH .../members/{employeeId}`가 겹치는 `rotationSeq`를 받는지, 받는다면 자동 편성이
어떤 순서로 도는지가 정의돼 있지 않다. 앱은 막지 않고 서버 판정에 맡긴다.

### 4. 교체 알림

명세서 6장이 교체 요청을 **앱 푸시**로 보낸다고 적고 있으나 발송 API가 이 태그에 없다.
서버가 보내는 것으로 보인다. 앱이 푸시를 받는 방식은 아직 정해지지 않았다.

---

## 8. 이 문서가 다루지 않는 것

- 당직 수당 계산 — 급여 쪽이다 (`docs/API_급여.md`)
- 근태 판정 — `docs/API_근태.md`
- 화면 구현 결정 — `docs/00_문서_인덱스.md` 「S-503 교체 동의 화면」·「A-504」
