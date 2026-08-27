# 급여 API 명세

Swagger `7. 급여`와 `8. 보험 요율` 태그를 옮긴 것이다. 원본이 항상 우선한다.

| | |
|---|---|
| 출처 | `https://api.dvi-ind.com/hi-yo/v3/api-docs` (Swagger UI `/hi-yo/swagger-ui/index.html`) |
| API 버전 | `DVI 인사시스템 API` v1 |
| 확인일 | 2026-08-27 |
| 서버 | `https://api.dvi-ind.com/hi-yo` (개발) |

> **서버 주소가 바뀌었다 (2026-08-26).** 옛 주소 `http://112.146.55.78:3378`은 새 주소로
> **301 리다이렉트**한다. 브라우저는 리다이렉트된 preflight를 따라가지 않으므로 관리팀 화면에서는
> 옛 주소를 쓰면 요청이 통째로 막힌다. `.env`를 갱신해야 한다.

> **급여 데이터는 거의 없다.** A-601을 붙이며 테스트 기간 1건(`2026년 8월`, `id=1`)을 만들었다.
> 계산된 급여 건은 **0개**다 — 근태 데이터가 없어 전원 `skipped`로 돌아온다.
> 화면을 붙이면 빈 상태부터 만나게 된다.

---

## 1. 공통

### 인증 — 임시

현재 서버는 **개발용 스텁 인증**으로 돈다. 사내 OAuth 서버가 완성되면 없어진다.

```
X-Debug-Employee-No: employee:1
```

| 값 | 계정 |
|---|---|
| `employee:1` | 사원001, 관리팀 |
| `employee:2` | 사원002, 일반 직원 |
| `employee:3` | 사원003, 관리팀 (결재 2단계 확인용) |

헤더를 비우면 기본 사용자로 인증된다. **권한 분기를 확인할 때는 반드시 지정한다.**

이건 최종 인증 방식이 아니다. `src/lib/api.ts` 인터셉터를 이 헤더에 맞춰 확정하지 않는다.
개발 중 임시 연결에만 쓰고, 실제 인증 방식은 확정되면 그때 반영한다.

### CORS — 관리팀 화면(브라우저)에 필요한 것

스텁 인증이 **커스텀 헤더**라 브라우저는 매 요청 앞에 preflight(`OPTIONS`)를 보낸다.
새 주소는 설정돼 있다.

```
Access-Control-Allow-Origin:    http://localhost:5173
Access-Control-Allow-Methods:   GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers:   x-debug-employee-no, content-type
Access-Control-Expose-Headers:  Location, Content-Disposition
Access-Control-Allow-Credentials: true
Access-Control-Max-Age:         3600
```

- `Content-Disposition`이 노출돼 있어 브라우저에서 PDF 파일명을 읽을 수 있다
- 허용 오리진이 `localhost:5173`뿐이다. **관리팀 화면을 다른 포트나 실제 도메인에 올리면
  서버에 오리진을 추가해야 한다**

### 응답 형식

- **급여 목록은 배열을 그대로 준다.** API 전체 규약인 `content`/`totalElements` 봉투와 페이지네이션이
  급여에는 없다. 직원 수가 늘면 급여대장 응답이 통째로 커진다.
- 날짜+시각에 타임존이 붙지 않는다 (`2026-08-26T08:20:05.447668653`). 서버는 한국 시간으로 돈다.
- 금액은 원 단위 정수(`int32`), 시간은 분 단위 정수(`minutes`). 화면 변환은 `src/lib/format.ts`를 거친다.
- `targetYm`은 `202608` 형태의 정수다. 범위 `200001`~`299912`.

### 오류

모든 오류가 같은 모양이다.

```json
{
  "timestamp": "2026-08-26T08:20:05.447668653",
  "status": 404,
  "error": "Not Found",
  "message": "급여를 찾을 수 없습니다. id=99999",
  "path": "/hi-yo/payroll/99999"
}
```

`message`는 **사용자에게 그대로 보여줘도 되는 한국어**다. 앱에서 문구를 다시 만들지 않는다.

`422`는 값 오류가 아니라 **업무 규칙 위반**이다 (마감된 기간 수정 등). 폼 검증 에러와 다르게 다뤄야 한다.

> OpenAPI 스펙에 급여 엔드포인트의 오류 응답(401/403/404/422)이 선언돼 있지 않다. 200만 문서화돼 있다.
> 어떤 상황에 어떤 코드가 오는지는 8장 참고.

---

## 2. 상태 흐름

```
기간 등록 → 계산 → (항목 수정) → 급여 확정 → 기간 마감
POST periods  POST calculate  POST adjustments  PATCH confirm  PATCH close
```

- **근태 확정이 선행되어야 한다.** 미확정 근태가 남은 직원은 계산되지 않고 `skipped`로 돌아온다.
- **확정(`confirmed`)** 된 급여가 명세서 발송 대상이다.
- **마감(`closed`)** 하면 재계산과 금액 수정이 막힌다. 명세서를 보낸 뒤 금액이 바뀌면 직원이 받은
  종이와 시스템 값이 갈라지기 때문이다.
- 확정·마감 모두 해제할 수 있다 (`confirmed=false`, `closed=false`).

---

## 3. 엔드포인트

| 메서드 | 경로 | 권한 | 용도 |
|---|---|---|---|
| GET | `/payroll/periods` | — | 급여 기간 목록 (최근 달부터) |
| POST | `/payroll/periods` | 관리팀 | 급여 기간 등록 |
| PATCH | `/payroll/periods/{periodId}/close` | 관리팀 | 기간 마감 / 해제 |
| POST | `/payroll/periods/{periodId}/calculate` | 관리팀 | 급여 계산 |
| GET | `/payroll/periods/{periodId}/ledger` | 관리팀 | 급여대장 (기간 전 직원) |
| GET | `/payroll/{payrollId}` | **본인 또는 관리팀** | 급여 단건 = 명세서 |
| PATCH | `/payroll/{payrollId}/confirm` | 관리팀 | 급여 확정 / 해제 |
| POST | `/payroll/{payrollId}/adjustments` | 관리팀 | 항목 금액 수정 |
| GET | `/payroll/{payrollId}/adjustments` | 관리팀 | 수정 이력 |
| GET | `/payroll/employees/{employeeId}` | **본인 또는 관리팀** | 내 명세서 목록 (최근 달부터) |

`apps/mobile`(S-601)이 쓰는 것은 굵게 표시한 2개뿐이다. 나머지는 `apps/admin` 전용이다.

`/payroll/insurance-rates/*`(보험 요율)는 태그가 달라 **6장**에 따로 정리했다.

---

### GET /payroll/periods

급여 기간 목록. 최근 달부터.

**응답** `200` — `PayrollPeriodResponse[]`

---

### POST /payroll/periods — 관리팀

급여 기간 등록. 기간의 시작·종료일이 **근태를 모으는 범위**가 된다.
급여 마감일이 달의 말일과 다르면 그 실제 범위를 넣어야 한다.

**요청** `PayrollPeriodRequest`
**응답** `200` — `PayrollPeriodResponse`

---

### PATCH /payroll/periods/{periodId}/close — 관리팀

| 파라미터 | 위치 | 필수 | 기본 | 설명 |
|---|---|---|---|---|
| `periodId` | path | ✅ | | |
| `closed` | query | | `true` | `false`면 마감 해제 |

**응답** `200` — `PayrollPeriodResponse`

---

### POST /payroll/periods/{periodId}/calculate — 관리팀

근태 판정 결과의 항목별 시간에 시급과 배율을 곱해 지급 항목을 만들고, 지급총액에 그 해 요율을 곱해
4대보험을 공제한다.

- **관리팀이 손으로 넣은 항목(식대·소득세 등)은 지우지 않는다.** 재계산할 때마다 사라지면 매달 다시
  입력해야 하기 때문이다.
- **소득세는 간이세액표 기준이라 자동 계산하지 않는다.** 넣으면 주민세가 그 10%로 따라 계산된다.
- 미확정 근태가 남은 직원은 계산하지 않고 `skipped`로 알린다. 조용히 0원으로 넘기지 않는다.

**응답** `200` — `PayrollCalculateResult`

`skipped`가 비어 있지 않으면 화면에서 반드시 명단을 보여줘야 한다. 성공 개수만 보여주면 급여가
빠진 채로 이체된다.

실제 응답 (2026-08-26, 기간 `id=1`):

```json
{
  "periodId": 1, "targetYm": 202608,
  "targets": 12, "calculated": 0,
  "skipped": [
    { "employeeId": 19, "employeeName": "사원019",
      "reason": "근태 데이터 없음 — 세콤 수집과 사번 매칭을 확인하세요" }
  ]
}
```

- **대상은 12명이다.** 직무마스터의 급여계산대상 여부로 서버가 거른다 (명세서 A-601)
- `reason`은 **사용자에게 그대로 보여줘도 되는 한국어**다. 화면에서 문구를 만들지 않는다
- 근태가 하나도 없으면 `calculated`가 0이고 전원이 `skipped`로 온다. 오류가 아니다

---

### GET /payroll/periods/{periodId}/ledger — 관리팀

한 기간의 전 직원 급여.

| 파라미터 | 위치 | 필수 | 설명 |
|---|---|---|---|
| `periodId` | path | ✅ | |
| `corporation` | query | | 법인으로 거른다. 급여대장이 법인별로 작성되기 때문 |

**응답** `200` — `PayrollResponse[]` (페이지네이션 없음)

---

### GET /payroll/{payrollId} — 본인 또는 관리팀

급여 단건. `items`를 순서대로 출력하면 그대로 명세서가 된다.

**응답** `200` — `PayrollResponse`
**오류** `404` — `급여를 찾을 수 없습니다. id={id}`

---

### PATCH /payroll/{payrollId}/confirm — 관리팀

| 파라미터 | 위치 | 필수 | 기본 |
|---|---|---|---|
| `payrollId` | path | ✅ | |
| `confirmed` | query | | `true` |

**응답** `200` — `PayrollResponse`

---

### POST /payroll/{payrollId}/adjustments — 관리팀

항목 금액 수정. 식대·소득세처럼 **자동 계산되지 않는 항목을 새로 넣을 때도 이 API를 쓴다.**

- 지급 항목을 고치면 지급총액이 달라지므로 **4대보험을 다시 계산한다.**
- 사유가 필수다. 원값·수정값·수정자와 함께 이력으로 남는다.

**요청** `PayrollAdjustRequest`
**응답** `200` — `PayrollResponse`

---

### GET /payroll/{payrollId}/adjustments

누가 언제 무엇을 얼마에서 얼마로 고쳤는지.

**응답** `200` — `AdjustmentResponse[]`

---

### GET /payroll/employees/{employeeId} — 본인 또는 관리팀

내 명세서 목록. 최근 달부터.

**응답** `200` — `PayrollResponse[]`

> 본인용 화면에서는 **로그인한 본인의 `employeeId`만** 넣는다. 다른 직원 id를 넣는 코드를
> `apps/mobile`에 두지 않는다. 서버 권한 검증 여부는 8장 참고.

---

## 4. 스키마

### PayrollResponse

급여 한 건 — 명세서가 그대로 그려지는 형태. `items`를 순서대로 출력하면 명세서가 된다.
**항목이 늘어도 화면 코드를 고칠 필요가 없다.**

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | int64 | |
| `employeeId` | int64 | |
| `employeeName` | string | |
| `employeeNo` | string | |
| `departmentName` | string | |
| `corporation` | string | |
| `targetYm` | int32 | `202608` |
| `hourlyWage` | int32 | 시급 |
| `ordinaryWage` | int32 | 통상임금 |
| `costType` | string | |
| `totalPayment` | int32 | 지급총액 |
| `totalDeduction` | int32 | 공제총액 |
| `calculatedAmount` | int32 | 자동 계산된 금액 |
| `finalAmount` | int32 | 최종 금액 |
| `modified` | boolean | 관리팀이 금액을 고쳤는지 |
| `modifyReason` | string | |
| `confirmed` | boolean | |
| `items` | `Item[]` | 명세서 줄 |

`calculatedAmount`(자동계산)와 `finalAmount`(최종)를 나눠 보낸다. 관리팀이 금액을 고쳤으면 두 값이
다르고, 그 차이가 왜 생겼는지는 수정 이력에 있다.

**화면에 최종 금액으로 쓰는 값은 `finalAmount`다.** `totalPayment - totalDeduction`을 앱에서 계산하지
않는다 (계산은 전부 서버).

### Item — 명세서 한 줄

| 필드 | 타입 | 설명 |
|---|---|---|
| `code` | string | 항목 코드 |
| `name` | string | **표시명. 화면에 그대로 쓴다** |
| `kind` | `PAYMENT` / `DEDUCTION` | 지급 / 공제 |
| `minutes` | int32 | 시간 (분) |
| `rate` | number | 배율 |
| `amount` | int32 | 금액 |
| `basis` | string | 산출 근거 — "왜 이 금액인가"를 되물을 때 그대로 보여준다 |

**항목 이름을 앱에 매핑 테이블로 두지 않는다.** `name`과 `kind`를 서버가 준다.
`code`로 분기해 순서를 바꾸거나 이름을 붙이면 항목이 늘 때마다 앱을 고쳐야 한다.

### PayrollPeriodRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `targetYm` | int32 | ✅ | `200001`~`299912` |
| `startDate` | date | ✅ | 근태 수집 시작 |
| `endDate` | date | ✅ | 근태 수집 종료 |
| `payDate` | date | | 지급일 |

### PayrollPeriodResponse

`id`, `targetYm`, `startDate`, `endDate`, `payDate`, `closed`(boolean)

### PayrollAdjustRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `itemCode` | enum | ✅ | 5장 항목 코드 |
| `amount` | int32 | ✅ | 수정할 금액 |
| `reason` | string(≤255) | ✅ | 사유. 비울 수 없다 |

### AdjustmentResponse

`id`, `itemCode`, `itemName`, `beforeAmount`, `afterAmount`, `reason`,
`modifiedById`, `modifiedByName`, `modifiedAt`(date-time)

### PayrollCalculateResult

| 필드 | 타입 | 설명 |
|---|---|---|
| `periodId` | int64 | |
| `targetYm` | int32 | |
| `targets` | int32 | 대상 인원 |
| `calculated` | int32 | 계산된 인원 |
| `skipped` | `Skipped[]` | 계산되지 않은 직원 |

`Skipped` = `employeeId`, `employeeName`, `reason`

---

## 5. 항목 코드

`PayrollAdjustRequest.itemCode`가 받는 값이다. **표시명은 서버 `Item.name`을 쓴다.**
아래는 코드 목록일 뿐 화면 문구가 아니다.

`BASIC` `OVERTIME` `NIGHT` `HOLIDAY` `HOLIDAY_OT` `WEEKLY_HOLIDAY` `DUTY` `ANNUAL_LEAVE`
`MEAL` `JOB_ALLOWANCE` `POSITION_ALLOWANCE` `BONUS` `VEHICLE` `ETC_PAY`
`PENSION` `HEALTH` `EMPLOYMENT` `CARE` `INCOME_TAX` `LOCAL_TAX`
`YEAR_END_INCOME_TAX` `YEAR_END_LOCAL_TAX` `HEALTH_ADJUST` `CARE_ADJUST` `ETC_DEDUCTION`

지급인지 공제인지는 **서버 `Item.kind`가 판정한다.** 코드 이름을 보고 앱에서 나누지 않는다.

문서에 근거가 있는 코드는 셋뿐이다 — `MEAL`(식대), `INCOME_TAX`(소득세, 간이세액표라 자동계산 안 함),
`LOCAL_TAX`(소득세의 10%로 따라 계산됨). **나머지 코드의 정확한 뜻은 확인되지 않았다.**

---

## 6. 보험 요율

Swagger `8. 보험 요율` 태그다. 경로가 `/payroll/` 아래라 급여와 같이 둔다.
**4대보험 요율을 연도별로 등록해 두면 급여 계산이 그 해 요율을 가져다 쓴다.**
요율 자체는 관리팀이 넣는 데이터지 앱이 계산하는 값이 아니다.

전부 `apps/admin` 전용이다. `apps/mobile`에 넣지 않는다.

### 엔드포인트

| 메서드 | 경로 | 권한 | 용도 |
|---|---|---|---|
| GET | `/payroll/insurance-rates?year=` | — | 그 해의 요율 목록 |
| GET | `/payroll/insurance-rates/years` | — | 요율이 등록된 연도 목록 (최근 해부터) |
| POST | `/payroll/insurance-rates` | 관리팀 | 요율 등록 |
| PUT | `/payroll/insurance-rates/{id}` | 관리팀 | 요율 수정 |
| POST | `/payroll/insurance-rates/copy?fromYear=&toYear=` | 관리팀 | 지난해 요율을 새해로 복사 |

`year`, `fromYear`, `toYear`는 **모두 필수 쿼리 파라미터**다. 기본값이 없다.
`/years`의 응답은 정수 배열(`int32[]`)이고, 나머지는 `InsuranceRateResponse`다.

급여와 마찬가지로 **오류 응답이 스펙에 선언돼 있지 않다.** 200만 문서화돼 있다.

---

### POST /payroll/insurance-rates — 관리팀

> **`baseItemCode`를 비우면 사고가 난다.** 장기요양처럼 **다른 공제 금액이 기준인 항목**은
> `baseItemCode`를 반드시 지정해야 한다. 비우면 지급총액에 곱해져 **금액이 30배**가 된다.
> (스펙 원문의 경고다. 화면에서 이 항목을 빈 채로 저장할 수 있게 두면 안 된다.)

**요청** `InsuranceRateRequest`
**응답** `200` — `InsuranceRateResponse`

---

### POST /payroll/insurance-rates/copy — 관리팀

연초에 네 건을 손으로 다시 넣는 대신 복사하고 바뀐 것만 고친다.
**이미 등록된 항목은 덮어쓰지 않는다.**

| 파라미터 | 위치 | 필수 | 설명 |
|---|---|---|---|
| `fromYear` | query | ✅ | 복사 원본 연도 |
| `toYear` | query | ✅ | 복사 대상 연도 |

**응답** `200` — `InsuranceRateResponse[]`

> **복사만 하고 두면 작년 요율로 급여가 나간다.** 고시된 새 요율과 대조해야 한다.
> 화면에서 복사 직후 "새 요율과 대조하세요"를 반드시 띄운다. 성공 토스트만 띄우면
> 바뀐 요율을 아무도 확인하지 않은 채 급여가 계산된다.

---

### 스키마

#### InsuranceRateRequest

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `applyYear` | int32 | ✅ | `2000`~`2999` |
| `itemCode` | enum | ✅ | 5장 항목 코드 (급여와 같은 25개) |
| `rate` | number | ✅ | **`0`~`1` 사이의 비율이다.** `0.045`이지 `4.5`가 아니다 |
| `baseItemCode` | enum | | 이 금액을 기준으로 곱한다. 비우면 지급총액 기준 |
| `autoCalculate` | boolean | | |
| `roundUnit` | int32 | | `1` 이상 |

#### InsuranceRateResponse

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | int64 | |
| `applyYear` | int32 | |
| `itemCode` | string | |
| `itemName` | string | **표시명. 화면에 그대로 쓴다** |
| `rate` | number | 비율 (`0.045`) |
| `ratePercent` | number | 퍼센트 표기용 값 |
| `baseItemCode` | string | |
| `baseItemName` | string | 기준 항목의 표시명 |
| `autoCalculate` | boolean | |
| `roundUnit` | int32 | |

**`rate`와 `ratePercent`를 서버가 둘 다 준다. 화면에서 `rate * 100`을 계산하지 않는다.**
항목 이름도 `itemName`·`baseItemName`을 그대로 쓴다. 코드로 매핑 테이블을 만들지 않는다.

---

## 7. 앱 관점 정리

### S-601 급여명세서 조회 (`apps/mobile`)

| 단계 | 호출 |
|---|---|
| 목록 | `GET /payroll/employees/{본인 employeeId}` |
| 상세 | `GET /payroll/{payrollId}` → `items` 순서대로 렌더 |

- 로딩·에러·빈 상태를 다 만든다. **확인일 기준 응답이 빈 배열이라 빈 상태를 가장 먼저 만나게 된다.**
- 명세서 줄은 `items`를 그대로 그린다. 항목 이름·지급공제 구분·산출 근거 전부 서버 값이다.
- 금액은 세 자리 콤마, 시간은 `minutes` → `8시간 20분`. 둘 다 `src/lib/format.ts`.
- **급여액을 `console.log`·에러 메시지·크래시 리포트에 넣지 않는다.**

### 관리팀 화면 (`apps/admin`)

기간 등록 → 계산 → 항목 수정 → 확정 → 마감. `closed`가 true면 계산·수정이 서버에서 막힌다.
계산 결과의 `skipped` 명단은 반드시 노출한다.

보험 요율(6장)은 이 흐름과 별개로 **연초에 한 번** 손대는 화면이다. 요율이 그 해에 등록돼 있지
않으면 계산이 어떻게 도는지는 확인되지 않았다 — 계산 전에 `GET /payroll/insurance-rates?year=`로
그 해 요율이 있는지 먼저 보여주는 편이 안전하다.

**관리팀 급여 API를 `apps/mobile`에 넣지 않는다.**

---

## 8. 미확정 — 확인이 필요한 것

| # | 항목 | 왜 문제인가 |
|---|---|---|
| 1 | **인증 방식** | 지금은 `X-Debug-Employee-No` 스텁. 최종 방식이 정해져야 `src/lib/api.ts`가 완성된다 |
| 2 | **권한의 서버 검증 여부** | `GET /payroll/employees/{employeeId}`에 남의 id를 넣으면 막히는지 확인되지 않았다. 클라이언트만 막는 상태면 사고다 |
| 3 | **오류 응답 미문서화** | 401/403/404/422가 스펙에 선언돼 있지 않다. 어떤 규칙 위반에 422가 오는지 목록이 필요하다 |
| 4 | **명세서 발송** | "확정된 급여가 명세서 발송 대상"이라고만 돼 있고 발송 API가 없다. PDF·알림 엔드포인트 없음 |
| 5 | **페이지네이션 없음** | 급여대장·명세서 목록이 배열을 통째로 준다. 인원이 늘면 대응이 필요하다 |
| 6 | **근태 데이터 없음** | 계산이 전원 `skipped`로 끝난다. `PayrollResponse`·`Item`·수정 이력의 실제 응답을 아직 눈으로 보지 못했다 |
| 7 | **S-601 화면 상세 스펙** | 명세서 8장 5번. 필드·정렬·버튼 동작이 정의돼 있지 않다 |
| 8 | **항목 코드 뜻** | 25개 중 3개만 문서에 근거가 있다 (5장) |
| 9 | **CORS 오리진** | `http://localhost:5173` 하나만 허용돼 있다. 관리팀 화면을 배포하면 서버에 추가해야 한다 |
| 10 | **`autoCalculate`·`roundUnit`의 뜻** | 보험 요율의 두 필드에 설명이 없다. 무엇이 자동 계산되는지, 절사인지 반올림인지 모른다. **화면에서 기본값을 임의로 정하지 않는다** |
| 11 | **요율이 없는 해의 계산** | 그 해 요율이 등록돼 있지 않을 때 계산이 막히는지 0원으로 도는지 확인되지 않았다 |
| 12 | **`baseItemCode`가 필요한 항목** | "장기요양처럼"이라고만 돼 있다. 25개 코드 중 어느 것이 기준 항목을 요구하는지 목록이 없다. 비우면 금액이 30배가 되므로 화면에서 막아야 하는데 무엇을 막을지 모른다 |
| 13 | **등록된 요율 데이터** | 실제 응답을 아직 보지 못했다. 요율이 몇 건 들어 있는지, 어느 해까지 있는지 확인이 필요하다 |

API 소개문에는 급여가 아직 "없는 것"으로 적혀 있다. 태그는 이미 구현돼 있으므로 소개문이
갱신되지 않은 것으로 보이나, 안정화 여부는 확인이 필요하다.
