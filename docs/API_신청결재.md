# 신청 · 결재 API 명세

Swagger `4. 신청 · 결재` 태그를 옮긴 것이다. 원본이 항상 우선한다.

| | |
|---|---|
| 출처 | `https://api.dvi-ind.com/hi-yo/v3/api-docs` (Swagger UI `/hi-yo/swagger-ui/index.html`) |
| API 버전 | `DVI 인사시스템 API` v1 |
| 확인일 | 2026-08-27 |
| 서버 | `https://api.dvi-ind.com/hi-yo` (개발) |

연차 · 반차 · 조퇴 · 외출 · 교육 · 결근을 **하나의 신청서**로 다룬다. 종류가 달라도
엔드포인트는 같고, 종류별로 달라지는 동작은 서버가 `GET /requests/types`로 알려준다.

> **결재에 전자서명이 필수다.** `POST /requests/{id}/decision`이 `signatureMethod`를 필수로 받는다.
> 그런데 **서명 이미지의 형식이 어디에도 정의돼 있지 않다** (7장 1번).
> A-302 승인·반려 화면은 이것이 풀려야 만들 수 있다.

> **신청 데이터가 0건이다.** 대기 목록도 내 신청 목록도 비어 있다 (2026-08-27).
> `LeaveRequestResponse`의 실제 응답을 아직 눈으로 보지 못했다. 화면을 붙이면 빈 상태부터 만난다.

---

## 1. 공통

### 인증 · CORS

급여와 같다. `docs/API_급여.md` 1장을 본다 — 개발용 스텁 헤더 `X-Debug-Employee-No`,
허용 오리진은 `http://localhost:5173` 하나뿐이다.

### 응답 형식

**급여와 다르다.** 목록이 배열이 아니라 봉투로 온다.

```json
{ "content": [], "page": 0, "size": 20, "totalElements": 0,
  "totalPages": 0, "first": true, "last": true }
```

`page`는 **0부터**다. `packages/api`의 `PageResponse<T>`가 이 모양이다.

- 날짜+시각에 타임존이 붙지 않는다. 서버는 한국 시간으로 돈다
- **연차 차감 일수는 서버가 계산한다.** 주말 · 공휴일은 세지 않는다.
  앱에서 다시 세거나 검산하지 않는다

### 오류

급여와 같은 모양이다.

```json
{ "timestamp": "2026-08-27T11:52:32.765332676", "status": 404,
  "error": "Not Found", "message": "신청서를 찾을 수 없습니다. id=1",
  "path": "/hi-yo/requests/1" }
```

`message`는 **사용자에게 그대로 보여줘도 되는 한국어**다. 앱에서 문구를 다시 만들지 않는다.

`422`는 값 오류가 아니라 **업무 규칙 위반**이다. API 소개문이 예로 든 것이 둘이다 —
**잔여 부족**, **검토 없이 승인**. 뒤엣것이 무엇을 뜻하는지는 7장 2번.

> 오류 응답이 스펙에 선언돼 있지 않다. 7개 엔드포인트 전부 200만 문서화돼 있다.

---

## 2. 상태 흐름

```
신청 → 검토 → 결정 ─┬─ 승인 (APPROVED)
POST    GET /{id}   └─ 반려 (REJECTED)
                      POST /{id}/decision

취소 (CANCELED)  DELETE /{id}
```

| 상태 | 뜻 |
|---|---|
| `PENDING` | 대기중 |
| `APPROVED` | 승인 |
| `REJECTED` | 반려 |
| `CANCELED` | 취소 |

- **"검토"에는 별도 API가 없다.** `GET /{id}`로 내용을 읽어보는 것 자체가 검토이고,
  상태를 바꾸는 행위는 결정 하나뿐이다
- **취소는 대기중이면 언제든, 승인된 건은 시작 전에만** 된다
- 승인·반려는 같은 엔드포인트다. `approved` 값으로 갈린다

---

## 3. 엔드포인트

| 메서드 | 경로 | 권한 | 용도 |
|---|---|---|---|
| GET | `/requests` | 본인 | 내 신청 목록 |
| POST | `/requests` | **본인만** | 신청 등록 |
| GET | `/requests/{id}` | 본인 또는 관리팀 | 신청서 단건 = 검토 |
| DELETE | `/requests/{id}` | 본인 | 취소 |
| POST | `/requests/{id}/decision` | 관리팀 | 승인 / 반려 |
| GET | `/requests/pending` | **관리팀** | 승인 대기 목록 |
| GET | `/requests/types` | — | 신청 종류 목록 |

목록 둘(`/requests`, `/requests/pending`)은 `page` · `size` · `sort` 쿼리를 받는다.

---

### GET /requests/types

**화면이 입력 폼을 그리려면 각 종류의 동작을 알아야 한다.** 종류별 규칙을 앱에 하드코딩하지 않는다.

**응답** `200` — `RequestTypeResponse[]`

5장에 확인일 기준 실제 목록이 있다.

---

### POST /requests — 본인만

**요청** `LeaveRequestCreateRequest`
**응답** `200` — `LeaveRequestResponse`

차감 일수를 요청에 넣지 않는다. 서버가 계산해 `leaveDays`로 돌려준다.

---

### GET /requests/{id}

신청서 단건. **관리팀이 결재 전에 내용을 읽어보는 것이 요구사항의 "검토"다.**
상태를 바꾸지 않으므로 별도 API가 없다.

**응답** `200` — `LeaveRequestResponse`
**오류** `404` — `신청서를 찾을 수 없습니다. id={id}`

---

### DELETE /requests/{id}

취소. **대기중이면 언제든, 승인된 건은 시작 전에만.**

**응답** `200` — `LeaveRequestResponse`

---

### POST /requests/{id}/decision — 관리팀

승인 또는 반려. **전자서명이 필수다.**

**요청** `RequestDecisionRequest`
**응답** `200` — `LeaveRequestResponse`

- `approved`가 `true`면 승인, `false`면 반려다. 엔드포인트는 하나다
- `signatureMethod`가 **필수**다. `IMAGE`와 `CLICK` 둘 중 하나
- `signatureImage`는 스펙상 필수가 아니다. `IMAGE`일 때 무엇을 넣어야 하는지는
  **정의돼 있지 않다** (7장 1번)

---

### GET /requests/pending — 관리팀

승인 대기 목록. A-302가 여는 화면이다.

**응답** `200` — `PageResponseLeaveRequestResponse`

---

## 4. 스키마

### LeaveRequestResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | int64 | |
| `employeeId` | int64 | |
| `employeeName` | string | |
| `departmentName` | string | |
| `typeCode` | string | 5장 종류 코드 |
| `typeName` | string | **표시명. 화면에 그대로 쓴다** |
| `startDate` / `endDate` | date | |
| `startTime` / `endTime` | string | 시각이 필요한 종류에만 |
| `leaveDays` | number | **서버가 계산한 차감 일수.** 앱에서 다시 세지 않는다 |
| `fiscalYear` | int32 | |
| `reason` | string | |
| `emergencyContact` | string | |
| `status` | `PENDING` / `APPROVED` / `REJECTED` / `CANCELED` | |
| `companyLeave` | boolean | |
| `excludedDates` | `ExcludedDate[]` | 차감에서 빠진 날 |
| `approverId` / `approverName` | | |
| `decisionComment` | string | |
| `signed` | boolean | |
| `decidedAt` | date-time | |
| `deductibleMinutes` | int32 | |

`ExcludedDate` = `date`, `reason`

**`excludedDates`가 "왜 3일 신청인데 2일만 깎였나"에 답하는 값이다.** `reason`을 그대로 보여준다.
주말 · 공휴일 판정을 앱에서 하지 않는다.

`companyLeave` · `fiscalYear` · `signed` · `deductibleMinutes`의 정확한 뜻은 스펙에 설명이 없다
(7장 4번).

### LeaveRequestCreateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `typeCode` | string | ✅ | 5장 종류 코드 |
| `startDate` | date | ✅ | |
| `endDate` | date | ✅ | |
| `startTime` | string | | `needTime`인 종류에만 |
| `endTime` | string | | |
| `reason` | string(≤255) | | |
| `emergencyContact` | string(≤50) | | |

### RequestDecisionRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `approved` | boolean | ✅ | `true` 승인 / `false` 반려 |
| `comment` | string(≤255) | | |
| `signatureMethod` | `IMAGE` / `CLICK` | ✅ | |
| `signatureImage` | string | | 형식 미정의 (7장 1번) |

### RequestTypeResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | int64 | |
| `code` | string | |
| `name` | string | **표시명. 화면에 그대로 쓴다** |
| `deductLeave` | boolean | 연차에서 깎이는가 |
| `deductPay` | boolean | 급여에서 깎이는가 |
| `needTime` | boolean | 시작 · 종료 **시각**이 필요한가 |
| `halfDay` | boolean | 반차인가 |

**이 네 개의 boolean이 폼의 모양을 정한다.** 코드로 분기해 앱에서 규칙을 만들지 않는다.

### PageResponseLeaveRequestResponse

`content`(`LeaveRequestResponse[]`), `page`, `size`, `totalElements`, `totalPages`, `first`, `last`

---

## 5. 신청 종류

**확인일 기준 실제 응답이다** (`GET /requests/types`, 11건).
표시명은 서버 `name`을 쓴다. 아래는 코드 목록일 뿐 화면 문구가 아니다.

| 코드 | 이름 | 연차 차감 | 급여 차감 | 시각 필요 | 반차 |
|---|---|---|---|---|---|
| `ANNUAL` | 연차휴가 | ✅ | | | |
| `HALF_DAY` | 반차휴가 | ✅ | | ✅ | ✅ |
| `OUTING` | 외출 | | | ✅ | |
| `EARLY_LEAVE` | 조퇴 | | | ✅ | |
| `SPECIAL` | 특별(경조사) | | | | |
| `UNPAID` | 무급휴무 | | ✅ | | |
| `RESERVE_TRAINING` | 예비군훈련 | | | | |
| `ABSENCE` | 결근 | | ✅ | | |
| `EDUCATION` | 교육 | | | | |
| `PAID_LEAVE` | 유급휴가 | | | | |
| `ETC` | 기타 | | | | |

- 연차를 깎는 것은 **연차휴가 · 반차휴가 둘뿐**이다
- 급여를 깎는 것은 **무급휴무 · 결근 둘**이다
- 시각을 받아야 하는 것은 **반차 · 외출 · 조퇴 셋**이다

**이 표를 앱에 상수로 박지 않는다.** 종류가 늘거나 규칙이 바뀌면 서버만 고치면 되도록
`GET /requests/types`를 부른다. 위 표는 "지금 무엇이 있는가"를 사람이 읽으려고 옮긴 것이다.

---

## 6. 앱 관점 정리

### S-301 연차 현황 및 신청 (`apps/mobile`)

| 단계 | 호출 |
|---|---|
| 종류 목록 | `GET /requests/types` → 폼의 모양을 정한다 |
| 신청 | `POST /requests` |
| 내 신청 목록 | `GET /requests` |
| 취소 | `DELETE /requests/{id}` |

- 잔여 초과는 **제출 시 오류 반환**으로 간다 (`00_문서_인덱스.md` 확정). 버튼은 항상 눌린다
- 잔여 일수는 이 태그에 없다. `6. 연차` 태그이며 **아직 문서화되지 않았다**
- 차감 일수를 앱에서 세지 않는다. 서버가 준 `leaveDays`와 `excludedDates`를 보여준다

### A-302 연차 신청 검토 · 승인 (`apps/admin`)

| 단계 | 호출 |
|---|---|
| 대기 목록 | `GET /requests/pending` |
| 검토 | `GET /requests/{id}` |
| 승인 · 반려 | `POST /requests/{id}/decision` |

- **결정에 전자서명이 필수라 지금은 만들 수 없다** (7장 1번)
- 반려는 되돌릴 수 없다 — `danger` 버튼 + 확인 대화상자 (`DESIGN_ADMIN.md` 5 · 6장)
- 대기 목록은 봉투로 오고 페이지네이션이 있다. 표 정렬은 **서버가 지원하는 열에만** 넣는다
- **본인용 화면에서 `GET /requests/pending`을 부르지 않는다.** `apps/mobile`에 넣지 않는다

### A-502 신청형 근태 승인 — 별도 화면으로 나눌 수 없다 (2026-09-01 확인)

화면 인벤토리는 A-302(연차 신청 검토·승인)와 A-502(신청형 근태 승인)를 **다른 화면**으로
두고 있다. 그런데 서버는 둘을 나눌 재료를 주지 않는다.

- `GET /requests/pending`의 파라미터는 `pageable` **하나뿐**이다. 종류로 거르는 값이 없다
- `RequestTypeResponse`에 모듈 구분이 없다. `deductLeave`·`deductPay`·`needTime`·
  `halfDay` 네 개는 **폼의 모양**을 정하는 값이지 "이건 연차, 이건 근태"가 아니다
- 11개 종류를 앱이 두 무리로 갈라야 하는데 그 기준이 문서 어디에도 없다.
  외출·조퇴는 근태처럼 보이고 특별(경조사)·교육·유급휴가는 어느 쪽인지 알 수 없다

**지금 A-302 화면이 대기 목록 전부를 보여준다.** 종류 칸에 서버가 준 `typeName`이 그대로
나오므로 외출·조퇴·교육도 여기서 결재된다 — 기능이 빠진 것이 아니라 **한 화면에 있다.**

나누려면 둘 중 하나가 필요하다.

1. `GET /requests/pending`에 종류 필터를 열어 준다, 또는
2. `RequestTypeResponse`에 모듈 구분(연차 / 근태)을 붙여 준다

**둘 다 없으면 나누지 않는다.** 앱이 11개를 임의로 가르면 어느 쪽에도 안 나오는 종류가
생기고, 그 신청은 아무도 결재하지 않은 채 남는다 (`CLAUDE.md` 3장).

---

## 7. 미확정 — 확인이 필요한 것

| # | 항목 | 왜 문제인가 |
|---|---|---|
| 1 | ~~전자서명 형식~~ | **거의 풀렸다 (2026-08-31).** 아래 「전자서명」 참고. 남은 것은 크기 상한 하나다 |
| 2 | **"검토 없이 승인" 422** | 소개문이 422의 예로 들었다. 무엇이 검토로 집계되는지 모른다 — `GET /{id}` 호출을 서버가 기록하는가? 화면이 상세를 열지 않고 목록에서 바로 승인하게 만들면 매번 422가 난다 |
| 3 | **오류 응답 미문서화** | 7개 전부 200만 선언돼 있다. 401/403/404/422가 어떤 상황에 오는지 목록이 필요하다 |
| 4 | **필드 뜻** | `companyLeave` · `fiscalYear` · `signed` · `deductibleMinutes`에 설명이 없다. 화면에 뭐라고 적을지 정할 수 없다 |
| 5 | **결재 단계** | **거의 풀렸다 (2026-09-01 인사팀).** 검토자·승인자가 독립 역할이 아니라 **관리팀 안에서 지정**이라, 2단계 결재는 없는 것으로 본다. API에 단계 개념이 없는 것과 맞는다. 개발 서버 계정에 남은 `3 = 관리팀(결재 2단계 확인용)`이 옛 흔적인지만 서버에 확인하면 된다 |
| 6 | **관리팀의 직원별 조회** | `GET /requests`는 내 것만 준다. 관리팀이 **특정 직원의 신청 이력**을 보는 API가 없다. 대기 목록만 있다 |
| 7 | **취소 권한** | `DELETE /{id}`를 관리팀도 부를 수 있는지, 본인만인지 적혀 있지 않다 |
| 8 | **연차 잔여** | `6. 연차` 태그가 아직 문서화되지 않았다. S-301도 A-302도 잔여를 같이 보여줘야 한다 |
| 9 | **데이터 없음** | 신청이 0건이다. `LeaveRequestResponse` · `excludedDates`의 실제 응답을 보지 못했다 |

**2번이 A-302를 막고 있다.** 1번은 크기 상한만 남았고 그 값도 우리가 재서 넘겼다.
나머지는 화면을 만들면서 채울 수 있다.

---

## 8. 전자서명 (2026-08-31)

### 형식은 확정됐다

서버 답변 — `signatureImage`는 **base64 문자열**이다. data URL이 아니다.
`CLICK`일 때는 **보내지 않아도 된다.**

### 크기 상한 — 실측값을 넘겼다

서버가 "프런트에서 실제로 얼마나 나오는지 알려주면 그 값으로 잡겠다"고 해서 브라우저에서
캔버스로 직접 쟀다 (2026-08-31). 라이브러리 없이 `canvas.toDataURL('image/png')`이다.

**캔버스 340×160 CSS px, 백킹스토어 680×320 (DPR 2 고정)**

| 획 수 | PNG (투명) | base64 |
|---|---|---|
| 2획 | 18 KB | 24 KB |
| **3획 — 보통 서명** | **23 KB** | **31 KB** |
| 5획 | 27 KB | 36 KB |
| 10획 | 39 KB | 52 KB |
| 20획 | 51 KB | 68 KB |
| **40획 — 거의 낙서** | **54 KB** | **72 KB** |
| 80획 | 42 KB | 55 KB |

**획을 아무리 늘려도 55 KB 근처에서 멈춘다.** 선이 겹치기 시작하면 오히려 압축이 잘 돼서
줄어든다. 전면을 검게 칠하면 5.6 KB다 — PNG는 단색 면을 거의 공짜로 압축한다.

### 캔버스 크기를 고정하지 않으면 터진다

| 캔버스 | PNG |
|---|---|
| 340×160 @2x | 23 KB |
| 340×160 @3x | 44 KB |
| 600×240 @3x, 빽빽하게 | **204 KB** |
| 800×300 @3x, 빽빽하게 | **373 KB** |

**백킹스토어를 DPR 2로 고정한다.** 요즘 폰 상당수가 DPR 3이라 기기 값을 그대로 쓰면
한 장에 수백 KB가 된다. 서명은 선 몇 획이라 2배로 충분하다.

### 제안한 것

- 서버 상한 **base64 기준 128 KB** — 실측 최악값의 약 1.8배다. 정상 서명이 걸릴 일은 없고,
  실수로 큰 캔버스를 보내는 것은 막힌다
- 배경은 **투명**. 흰 배경보다 10% 작고 문서에 얹을 때 유리하다

TODO: **배경을 투명으로 할지 흰색으로 할지는 서버 답을 기다린다.** 서명이 어디에 얹히는지가
출력 문서 서식에 달렸는데 그 서식이 아직 리포에 없다 (`API_재직증명서.md` 5장 3번과 같은 상황).
