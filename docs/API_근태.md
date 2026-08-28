# 근태 API 명세

Swagger `5. 근태`와 `9. 근태 수집 (기계 전용)` 태그를 옮긴 것이다. 원본이 항상 우선한다.

| | |
|---|---|
| 출처 | `https://api.dvi-ind.com/hi-yo/v3/api-docs` (Swagger UI `/hi-yo/swagger-ui/index.html`) |
| API 버전 | `DVI 인사시스템 API` v1 |
| 확인일 | 2026-08-28 |
| 서버 | `https://api.dvi-ind.com/hi-yo` (개발) |

**S-501(내 근태) · A-501(전 직원) · A-503(52시간)이 이 태그를 쓴다.**

> **근태 기록이 하나도 없다.** `GET /attendance/weekly`도 `/attendance/daily`도 어느 주를
> 봐도 빈 배열이다 (2026-08-28 실호출). 세콤 수집이 아직 안 돌았거나 원본이 없는 것으로
> 보인다. 화면을 붙이면 빈 상태부터 만난다.

> **시간은 전부 분 단위 정수로 온다.** 스펙이 이유를 적어두었다 —
> "소수 시간으로 내려보내면 반올림 오차가 급여에 그대로 실립니다."
> 화면 표기는 `8시간 30분` (`CLAUDE.md` 5장).

---

## 1. 공통

### 인증 · CORS

급여와 같다. `docs/API_급여.md` 1장을 본다.
**단, `POST /secom/ingest`만 다르다** — 6장을 본다.

### 응답 형식

목록이 배열로 온다. 봉투가 아니다. 페이지네이션이 없다.

### 오류

`docs/API_급여.md`와 같은 모양이다.

> 오류 응답이 스펙에 선언돼 있지 않다. 8개 경로 전부 `200`만 문서화돼 있다.

---

## 2. 근태는 어떻게 만들어지는가

**앱은 이 흐름의 어디에도 값을 넣지 않는다.** 출퇴근 시각조차 파생값이다.

```
세콤 단말 태그
   │
   │  릴레이 에이전트가 사무실 PC 에서 보낸다
   ▼
POST /secom/ingest      원본을 버퍼에 쌓는다 (기계 전용)
   │
   │  POST /attendance/collect
   ▼
근태 기록                출근·퇴근 시각이 여기서 정해진다
   │
   │  POST /attendance/judge
   ▼
판정 완료                연장·야간·지각·조퇴가 여기서 나온다
   │
   ▼
주간 집계                주 52시간 현황
```

- **출퇴근 시각·지각·연장·야간은 서버가 도출하는 파생값이다** (명세서 7.3).
  세콤은 출입 태그 기록만 준다
- 정기 배치가 따로 돌지만, 관리팀이 "지금 반영"을 눌러야 하는 경우가 있어
  `collect`·`judge`를 열어 두었다
- **보정은 원본을 고치지 않는다.** 보정만 쌓고 그 날짜를 다시 판정한다

---

## 3. 엔드포인트

| 메서드 | 경로 | 권한 | 용도 |
|---|---|---|---|
| GET | `/attendance/{employeeId}` | 본인 또는 관리팀 | 개인 기간 근태. `from`·`to` 필수 |
| GET | `/attendance/{employeeId}/weekly` | 본인 또는 관리팀 | 개인 주간 근로시간 — 주 52시간 |
| GET | `/attendance/weekly` | **관리팀** | 52시간 근접 현황. `date` 필수, `onlyAlerted` 선택 |
| GET | `/attendance/daily` | **관리팀** | 전 직원 하루 근태. `date` 필수 |
| GET | `/attendance/{employeeId}/corrections` | 관리팀 | 보정 이력. `date` 필수 |
| POST | `/attendance/{employeeId}/corrections` | 관리팀 | 근태 보정 |
| POST | `/attendance/judge` | 관리팀 | 판정 재실행. `date` 필수, `confirm` 선택 |
| POST | `/attendance/collect` | 관리팀 | 세콤 원본을 근태 기록으로 옮긴다 |

**`GET /attendance/weekly`와 `/attendance/daily`는 스펙이 직접 "관리팀 화면"이라고 적고 있다.**
화면을 상정하고 만든 경로다 — A-503과 A-501이다.

권한 확인 (2026-08-28 실호출) — 일반 직원이 `GET /attendance/weekly`를 부르면 `403`이다.

---

## 4. 스키마

### `AttendanceDailyResponse` — 하루치

`employeeId` `employeeName` `departmentName` `workDate` `dayOfWeek`
`checkInAt` `checkOutAt` `corrected` `confirmed` `judgedAt` + 아래 시간들

| 시간 필드 (분) | |
|---|---|
| `payrollMinutes` | 급여 산정 기준 |
| `statutoryMinutes` | 법정 기준 |
| `basicMinutes` | 기본 |
| `overtimeMinutes` | 연장 |
| `nightMinutes` | 야간 |
| `holidayMinutes` · `holidayOvertimeMinutes` | 휴일 · 휴일연장 |
| `weeklyHolidayMinutes` | 주휴 |
| `dutyMinutes` | 당직 |
| `lateMinutes` · `earlyLeaveMinutes` | 지각 · 조퇴 |

- `checkInAt`·`checkOutAt`은 **보정이 반영된 값**이다. 원본이 궁금하면 보정 이력을 따로 조회한다
- `corrected` — 보정이 들어간 날
- `confirmed` — 판정이 확정된 날

### `AttendancePeriodResponse` — 기간

`employeeId` `employeeName` `from` `to` `totals` `days[]`

> **합계를 서버가 같이 내려보낸다.** 스펙이 이유를 적어두었다 —
> "프런트가 더하면 미판정 날짜를 어떻게 셀지가 화면마다 달라져 값이 갈립니다."
> **앱에서 `days`를 더하지 않는다.**

`totals`는 위 시간 필드에 둘이 더 붙는다.

| | |
|---|---|
| `workedDays` | 실제 근무한 날 수 (근무시간 > 0) |
| `unconfirmedDays` | **아직 확정되지 않은 날 수 — 급여를 확정하기 전에 `0`이어야 한다** |

### `WeeklyWorkSummaryResponse` — 주간·52시간

`employeeId` `employeeName` `departmentName` `weekStartDate` `weekEndDate`
`totalMinutes` `normalMinutes` `overtimeMinutes`
`remainingMinutes` `overtimeRemainingMinutes` `alertLevel` `alertedAt`

| `alertLevel` | 뜻 |
|---|---|
| 0 | 없음 |
| 1 | 안내 (48h) |
| 2 | 경고 (52h 임박) |
| 3 | 초과 |

> **단계를 서버가 정한다.** 스펙이 직접 적고 있다 —
> "화면에서 색을 고르는 기준입니다. 프런트가 분 단위로 다시 판단하면 서버와 기준이
> 어긋나므로 단계를 서버가 정합니다."
>
> `totalMinutes`를 보고 단계를 매기지 않는다. 거르는 것도 `onlyAlerted`로 서버가 한다.

`remainingMinutes`는 52시간까지 남은 시간이고 **넘겼으면 음수**로 온다.

### `AttendanceCorrectionRequest`

필수 `workDate` `reason` / 선택 `checkInAt` `checkOutAt`

- **고칠 것만 보내면 된다.** 보내지 않은 쪽은 원본 값을 그대로 쓴다
- **날짜+시각을 받는다.** 야간근무는 자정을 넘기므로 시각만으로는 부족하다.
  `workDate`는 출근일이고, 퇴근이 다음 날이면 `checkOutAt`의 날짜가 하루 뒤다
- **사유가 필수다** — 근로시간은 임금과 직결된다

### `AttendanceCorrectionResponse`

`id` `employeeId` `workDate` `checkInAt` `checkOutAt` `reason`
`correctedById` `correctedByName` `correctedAt` — 누가 언제 왜 고쳤는지가 남는다

### `JudgeResult` · `CollectResult`

| `JudgeResult` | |
|---|---|
| `date` `judged` | 판정한 인원 |
| `aggregated` | 주간 집계를 다시 낸 인원 |
| `confirmed` | 확정 여부 |

| `CollectResult` | |
|---|---|
| `read` | 수신 버퍼에서 읽은 행 수 |
| `collected` | 옮긴 건수 |
| `changed` | **기존 기록의 시각이 바뀐 건수 — 그만큼 재판정이 필요하다** |
| `skipped` | 직원을 못 찾았거나 형식을 못 읽어 건너뛴 건수 |

---

## 5. 앱 관점 정리

- **계산은 전부 서버다.** 분을 더하거나 52시간까지 남은 시간을 빼보지 않는다
- 시간은 분 단위 정수. 표기는 `src/lib/format.ts`의 `formatMinutes`를 거친다
- `unconfirmedDays`가 `0`이 아니면 급여를 확정하면 안 된다. 화면이 이 값을 보여줘야 한다
- 보정은 관리팀만 한다. **본인이 직접 입력하는 경로가 없다** (명세서 5장 예외 6번과 같다)

---

## 6. `POST /secom/ingest` — 기계 전용

**사람이 부르는 API가 아니다.** 사무실 PC의 릴레이 에이전트가 보낸다.
계약의 반대편은 `secom-agent`의 `IngestClient`다.

- 인증이 다르다 — **`X-API-Key` 헤더**를 쓴다. 다른 경로의 스텁 인증과 별개다
- `SecomIngestRequest` — 필수 `agentId` `table` `rows`.
  `rows[]`는 `{ rowHash, data }`이고 **`data`는 타입 없는 Map**이다.
  세콤링크가 만드는 테이블 구조가 미확정이라 필드를 고정할 수 없어 원본 그대로 보존한다
- `SecomIngestResponse` — `received` `inserted` `duplicates`.
  **`duplicates`는 오류가 아니라 정상이다** — 에이전트가 at-least-once로 보낸다
- 같은 행이 다시 와도 안전하다. 내용 해시로 걸러낸다

**앱은 이 경로를 부르지 않는다.** 여기 적어두는 이유는 근태 값이 어디서 오는지가
화면 문구에 영향을 주기 때문이다 — 기록이 없을 때 "아직 안 들어왔어요"인지
"근무하지 않았어요"인지가 다르다.

---

## 7. 미확정 — 확인이 필요한 것

### 1. 근태 데이터가 없다

수집이 한 번도 안 돌았는지, 세콤 원본이 없는지 확인되지 않았다.
**A-503·A-501·S-501은 값이 찬 화면을 아직 보지 못했다.**

### 2. `alertLevel`을 색으로 어떻게 나눌 것인가

스펙은 이 값을 "화면에서 색을 고르는 기준"이라고 하지만 `DESIGN_ADMIN.md` 7장의 색은
셋뿐이고 새 tone을 금지한다. A-503은 경고(2)와 초과(3)를 같은 빨강으로 두고 문구로
구분했다 (`docs/00_문서_인덱스.md` 「A-503」).

### 3. 52시간 산정 기준

주 시작 요일, 연장근로 포함 범위가 문서에 없다 (`CLAUDE.md` 3장 추측 금지 항목).
`weekStartDate`를 서버가 주므로 앱은 그대로 쓰면 되지만, 값을 검증할 근거가 없다.

### 4. 지각·조퇴 처리 기준

`lateMinutes`·`earlyLeaveMinutes`가 오지만 그것이 급여에서 어떻게 처리되는지가
확정되지 않았다 (`CLAUDE.md` 3장).

---

## 8. 이 문서가 다루지 않는 것

- 수당 배율·급여 반영 — `docs/API_급여.md`
- 당직 배정 — `docs/API_당직.md`
- 신청형 근태(결근·외출·교육·반차) — `docs/API_신청결재.md`
