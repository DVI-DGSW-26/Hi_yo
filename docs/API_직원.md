# 직원 · 마스터 API 명세

Swagger `1. 직원`과 `2. 마스터` 태그를 옮긴 것이다. 원본이 항상 우선한다.

| | |
|---|---|
| 출처 | `https://api.dvi-ind.com/hi-yo/v3/api-docs` (Swagger UI `/hi-yo/swagger-ui/index.html`) |
| API 버전 | `DVI 인사시스템 API` v1 |
| 확인일 | 2026-08-28 |
| 서버 | `https://api.dvi-ind.com/hi-yo` (개발) |

**A-102(직원)·A-103(마스터)·S-101(마이페이지)이 이 태그를 쓴다.**
부서·직무는 직원 등록·수정의 선택지라 같이 둔다.

> **주민등록번호는 어떤 조회 응답에도 담기지 않는다.** 저장할 때 암호화되고, 나가는 것은
> 재직증명서의 마스킹 값뿐이다. 화면이 받을 수 있는 것은 `residentNoRegistered` 불리언이다.

> **`PUT /employees/{id}`는 전체 교체다.** 보내지 않은 필드가 지워진다. 그래서 A-102에
> 인적사항 수정 화면이 없다 — 7장 1번.

---

## 1. 공통

### 인증 · CORS

급여와 같다. `docs/API_급여.md` 1장을 본다.

### 응답 형식

**`GET /employees`만 봉투(`content`/`totalElements`)로 온다.** 나머지는 단건이거나 배열이다.

- `page`는 **0부터**
- **서버가 `size`를 100에서 자른다.** 더 큰 값을 보내도 오류 없이 깎여서 온다
  (2026-08-28 확인. `size=101`·`150`·`500` 모두 응답 `size=100`).
  `packages/api`의 `MAX_PAGE_SIZE`가 이 값이다

### 오류

`docs/API_급여.md`와 같은 모양이다.

---

## 2. 엔드포인트

### 직원

| 메서드 | 경로 | 권한 | 용도 |
|---|---|---|---|
| GET | `/employees/me` | 본인 | 내 정보 |
| GET | `/employees` | **관리팀** | 목록. `corporation`·`status`·`departmentId`·`keyword` + 페이지 |
| GET | `/employees/{id}` | 본인 또는 관리팀 | 단건 |
| POST | `/employees` | **관리팀** | 등록 |
| PUT | `/employees/{id}` | **관리팀** | 인적사항 수정 — **전체 교체** |
| PUT | `/employees/{id}/bank-account` | 본인 | **직원이 수정할 수 있는 유일한 항목** |
| PATCH | `/employees/{id}/status` | **관리팀** | 휴직 · 복직 · 퇴사 |
| PATCH | `/employees/{id}/employee-no` | **관리팀** | 사번 부여 |
| GET | `/employees/{id}/status-history` | 관리팀 | 재직상태 변경 이력 |
| POST | `/employees/sync-secom` | **관리팀** | 세콤 인사정보를 직원으로 옮긴다 |

**사번과 재직상태는 `PUT`에서 빠져 별도 경로로 나와 있다.** 스펙이 이유를 적어두었다 —
"이력이 남아야 해서 각각 별도 API로 뺐다."

`status` 필터는 `ACTIVE` · `ON_LEAVE` · `RESIGNED`.

### 마스터

| 메서드 | 경로 | 용도 |
|---|---|---|
| GET | `/departments` | 부서 목록 — 직원 등록·수정 화면의 선택지 |
| GET | `/jobs` | 직무 목록 |

**등록·수정 API가 없다.** 조회 둘뿐이라 A-103(직무·부서 마스터 관리)은 지금 조회만 만들 수 있다.

---

## 3. 스키마

### `EmployeeResponse`

`id` `employeeNo` `name` `legalName` `nationality` `corporation`
`departmentName` `jobName` `jobGrade` `workSite`
`originalHireDate` `hireDate` `employmentStatus` `employmentStatusLabel` `resignDate`
`payrollTarget` `residentNoRegistered`

- **`legalName`은 공문서용 정식 성명이다.** 외국인의 여권상 풀네임이 들어간다
- **부서·직무가 이름으로만 온다.** `departmentId`·`jobId`는 없다 — 7장 1번의 원인이다

### `EmployeeDetailResponse`

`summary`(위) + `birthDate` `gender` `phone` `email` `address` `emergencyContact` `bankAccount`

TODO: **`phone`·`email`·`address`가 마스킹돼 오는지 확인하지 못했다.** 개발 서버 직원
103명 전원이 이 값들이 `null`이다. `CLAUDE.md` 2장은 연락처·이메일도 마스킹 대상으로 적고 있다.

### `EmployeeCreateRequest`

필수 `name` `corporation` `hireDate`
선택 `employeeNo` `legalName` `nationality` `departmentId` `jobId` `jobGrade` `workSite`
`originalHireDate` `birthDate` `gender` `phone` `email` `address` `emergencyContact` `residentNo`

**사번이 선택이다.** 스펙이 이유를 적어두었다 — "연차관리대장에 사번이 없는 직원이 실재한다."

### `EmployeeUpdateRequest`

`name` `legalName` `nationality` `corporation` `departmentId` `jobId` `jobGrade` `workSite`
`originalHireDate` `hireDate` `birthDate` `gender` `phone` `email` `address`
`emergencyContact` `residentNo` (필수는 `name` `corporation` `hireDate`)

**계좌 필드가 없다.** 스키마 설명이 "계좌정보는 별도 API로 분리했다"고 적고 있다.

### `BankAccountUpdateRequest`

필수 `bankName` `bankAccount` `accountHolder`

요구사항정의서 2.1 — **계좌정보만 본인 수정 가능, 즉시 반영 + 관리팀 알림.**
알림 발송 API는 이 태그에 없다. 서버가 보내는 것으로 보인다.

### `EmploymentStatusChangeRequest`

필수 `status` `effectiveDate` / 선택 `reason`

**퇴사자도 지우지 않고 상태로만 관리한다.**

### `StatusHistoryResponse`

`id` `status` `statusLabel` `startDate` `endDate` `reason`

스펙 — "퇴사해도 행을 지우지 않고 이력을 남긴다. 재직증명서와 급여가 과거 시점을 설명할 수
있어야 하기 때문이다."

### `JobItem`

`id` `name` `payrollTarget` `hourlyWage` `workStart` `workEnd` `standardMinutes` `active`

> **직무가 없으면 근태가 판정되지 않는다.** 스펙이 적고 있다 — 근태 판정과 급여 계산의
> 기준시간·휴게 규칙이 직무에 붙어 있다. `payrollTarget`이 시급자 여부다.

확인일 기준 6개.

| id | 이름 | 급여대상 | 기준분 | 근무 |
|---|---|---|---|---|
| 1 | 사무직 | 아님 | 480 | 08:00~17:00 |
| 2 | 관리직 | 아님 | 480 | 08:00~17:00 |
| 3 | 가공 | **대상** | 480 | 08:00~17:00 |
| 4 | 압출 | **대상** | 480 | 08:00~17:00 |
| 5 | 생산직 | 아님 | 480 | 08:00~17:00 |
| 6 | 당직전담 | 아님 | 480 | 08:00~17:00 |

### `DepartmentItem`

`id` `name` `sortOrder` `active`

확인일 기준 9개 — 개발 · 생산 · 생산관리 · 품질 · 품질관리 · 해외영업 · 관리 · 압출 · 임원

### `PersonSyncResult`

`read` `created` `updated` `skipped[]`

`POST /employees/sync-secom`의 응답이다. 스펙이 길게 적어두었다.

- **세콤이 아는 것만 채운다.** 쓸 만한 값은 이름 · 카드번호 · 입사일 셋뿐이다 —
  사번과 부서는 비어 있고, **주민번호는 비밀키가 없어 수신 때 버려진다**
- **이미 있는 값은 덮어쓰지 않는다.** 관리팀이 고친 이름을 세콤이 되돌리면 안 된다
- **세콤 명단에서 빠져도 지우지 않는다.** 퇴사 이력과 과거 급여가 남아야 한다
- `skipped`에 넣지 못한 사람과 이유가 나온다 — **조용히 빠지면 그 사람 근태가 통째로 사라진다**

---

## 4. 앱 관점 정리

- 본인용 화면은 `GET /employees/me`만 쓴다. **다른 직원의 id로 조회하지 않는다**
- 계좌·연락처는 서버가 마스킹한 값을 그대로 표시한다. **앱에서 가리거나 풀지 않는다**
- 주민번호는 등록 여부만 보여준다
- 부서·직무 목록은 자주 바뀌지 않는다. 앱은 1시간 캐시한다

---

## 5. 미확정 — 확인이 필요한 것

### 1. `PUT /employees/{id}`가 전체 교체다 (서버)

**A-102 수정 화면과 주민번호 등록 화면을 둘 다 막고 있다.**

보내지 않은 필드가 지워지는데, 되돌려 보낼 수 없는 값이 있다.

- **`residentNo`** — 어떤 조회 응답에도 없다. 한 번 수정할 때마다 지워지고,
  그러면 그 직원은 재직증명서를 발급받지 못한다
- **`departmentId`·`jobId`** — 조회는 `departmentName`·`jobName`만 준다.
  이름으로 id를 역매핑해야 하고, 이름이 겹치거나 부서명이 바뀌면 엉뚱한 부서로 옮겨진다

**요청** — `PATCH /employees/{id}/resident-no`를 열어달라.
`employee-no`·`status`가 이미 같은 이유로 `PUT`에서 빠져나와 있다.

### 2. 주민등록번호를 어느 화면에서 누가 입력하는가

명세서 A-102의 필드 목록에 주민번호가 없다. 개발 서버 직원 103명 전원이 미등록이다.
관리팀 전용 등록 화면을 만들기로 했으나(`docs/00_문서_인덱스.md`) **누가 입력하는지**는
권한 체계(명세서 8장 1번)와 같이 정해져야 한다.

### 3. 마스터 등록·수정 API가 없다

`GET /departments`·`GET /jobs` 둘뿐이다. A-103은 화면 이름이 "직무·부서 마스터 관리"인데
**관리할 API가 없다.** 조회만 만들 수 있다.

### 4. 연락처·이메일 마스킹 여부

3장 `EmployeeDetailResponse` TODO 참고.

---

## 6. 이 문서가 다루지 않는 것

- 재직증명서 — `docs/API_재직증명서.md`
- 급여대상 판정이 급여에 쓰이는 방식 — `docs/API_급여.md`
- 개발 서버의 스텁 인증 id — `docs/00_문서_인덱스.md` 「개발 서버 데이터가 통째로 바뀌었다」
