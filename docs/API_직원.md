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
| PUT | `/employees/{id}` | **관리팀** | 인적사항 수정. **2026-09-09에 `residentNo`가 빠졌다** — 이제 부른다 (5장 1번) |
| PATCH | `/employees/{id}/assignment` | **관리팀** | 부서 · 직무 (2026-09-02에 열렸다). **`null`은 「비운다」** |
| PATCH | `/employees/{id}/resident-no` | **관리팀** | 주민등록번호 (2026-09-02에 열렸다). 응답에 값은 없다 |
| GET | `/employees/{id}/bank-account` | 관리팀 또는 본인 | **계좌 원문.** 급여 이체·통장 대조용 (2026-09-09에 열렸다) |
| PUT | `/employees/{id}/bank-account` | 본인 | **직원이 수정할 수 있는 유일한 항목** |
| GET | `/employees/{id}/resident-no` | **관리팀** | 주민등록번호. 기본은 가려서, `?full=true`면 원문 (2026-09-09에 열렸다) |
| PATCH | `/employees/{id}/status` | **관리팀** | 휴직 · 복직 · 퇴사 |
| PATCH | `/employees/{id}/employee-no` | **관리팀** | 사번 부여 |
| GET | `/employees/{id}/status-history` | 관리팀 | 재직상태 변경 이력 |
| POST | `/employees/sync-secom` | **관리팀** | 세콤 인사정보를 직원으로 옮긴다 |

**`PUT`에서 빠져나온 경로가 넷이다** — 사번 · 재직상태 · 부서직무 · 주민번호.
앞의 둘은 스펙이 이유를 적어두었다 — "이력이 남아야 해서 각각 별도 API로 뺐다".
뒤의 둘은 2026-09-02에 우리 요청으로 열렸다 (5장 1번).

**`PATCH` 둘의 요청 본문 필드 이름은 Swagger로 확인하지 못했다** (2026-09-07, 개발 서버가
내려가 있다). 회신이 이름을 적어 준 `departmentId`·`jobId`와, `employee-no`가
`{ employeeNo }`인 것과 같은 모양인 `{ residentNo }`로 붙여 뒀다. **서버가 열리면
가장 먼저 대조한다.**

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

### `BankAccount` (조회에 실리는 계좌)

`bankName` `bankAccountMasked` `accountHolder`

**2026-09-09에 `bankAccount` → `bankAccountMasked`로 바뀌었다** (회신 24번). 값도
`***-***-**6789`처럼 뒤 네 자리만 남겨서 온다 — 스키마 설명이 "원문은 어떤 응답에도
담기지 않는다"고 적고 있다.

**받은 값을 다시 가리지 않는다.** 두 번 가리면 남은 네 자리까지 `*`가 되어 본인도
자기 계좌인지 알아볼 수 없다.

### `BankAccountRawResponse` (계좌 원문)

`employeeId` `employeeName` `bankName` `bankAccount` `accountHolder`

`GET /employees/{id}/bank-account`로만 나온다. **급여 이체·통장 대조 화면에서만 부른다** —
사람을 확인하는 자리에서 부르지 않는다.

### `ResidentNoResponse`

`employeeId` `employeeName` `registered` `masked` `full`

`masked`가 `900101-1******`다. `full`은 **`?full=true`로 부른 경우에만** 채워지고
아니면 `null`이다. **그 호출은 서버가 따로 로그에 남긴다** — 4대보험·연말정산 신고
기능에서만 부르고, 사람 대조·오타 확인에는 `masked`로 충분하다.

### `EmployeeCreateRequest`

필수 `name` `corporation` `hireDate`
선택 `employeeNo` `legalName` `nationality` `departmentId` `jobId` `jobGrade` `workSite`
`originalHireDate` `birthDate` `gender` `phone` `email` `address` `emergencyContact` `residentNo`

**사번이 선택이다.** 스펙이 이유를 적어두었다 — "연차관리대장에 사번이 없는 직원이 실재한다."

### `EmployeeUpdateRequest`

`name` `legalName` `nationality` `corporation` `departmentId` `jobId` `jobGrade` `workSite`
`originalHireDate` `hireDate` `birthDate` `gender` `phone` `email` `address`
`emergencyContact` (필수는 `name` `corporation` `hireDate`)

**`residentNo`가 2026-09-09에 빠졌다** (회신 25번). 등록은 `POST`, 수정은
`PATCH /employees/{id}/resident-no` 하나다. 그전에는 여기에 필드가 있어서 전체 교체로
읽혔고, 그래서 앱이 `PUT`을 부르지 않았다.

**안 실은 값은 보존된다.** 서버가 그렇게 확인해 줬다 — 원래도 지우지 않았고 값이 비어
있으면 기존 값을 그대로 두고 넘어갔다고 한다. 다만 **값을 「비우는」 방법은 확인되지
않았다** — 빈 문자열이 지우는지 그대로 두는지 모른다. 지우는 동작이 필요해지면 묻는다.

**계좌 필드가 없다.** 스키마 설명이 "계좌정보는 별도 API로 분리했다"고 적고 있다.

### `BankAccountUpdateRequest`

필수 `bankName` `bankAccount` `accountHolder`

요구사항정의서 2.1 — **계좌정보만 본인 수정 가능, 즉시 반영 + 관리팀 알림.**
알림 발송 API는 이 태그에 없다. 서버가 보내는 것으로 보인다.

**`PUT`이 셋을 전부 덮어쓴다.** 일부만 보내면 나머지가 `null`로 지워진다
(2026-09-02 「조심할 것」). 그래서 화면(S-101 계좌 바꾸기)이 셋을 모두 받는다.

**조회에서 받은 값을 되돌려 보내지 않는다.** 조회가 주는 것은 `bankAccountMasked`(가린 값)라,
화면에 보이는 문자열을 그대로 실어 보내면 **가린 값이 저장돼 급여가 엉뚱한 계좌로 간다.**
바꾸는 화면은 새 값을 처음부터 입력받는다 (2026-09-07). 이 요청의 `bankAccount`는
**원문 필드다** — 조회 쪽 이름만 바뀌었고 여기는 그대로다.

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
- **계좌는 서버가 가려서 준다** (2026-09-09 회신 24번). `bankAccountMasked`를 **그대로
  그린다** — 화면에서 다시 가리지 않는다. 9-02에는 원문이 내려와 화면이 `maskAccountNo`로
  가리고 있었는데, 그러면 개발자 도구·네트워크 로그에 전 직원 계좌번호가 남아 되물었다.
  원문이 필요한 곳은 `GET /employees/{id}/bank-account` 하나고 **급여 이체용이다**
- **주민번호는 서버가 가려서 준다** — `residentNoMasked`가 `901231-1******`다 (회신 15번).
  이쪽은 원칙대로다. 본인용 화면은 등록 여부만 보여준다
- 부서·직무 목록은 자주 바뀌지 않는다. 앱은 1시간 캐시한다

---

## 5. 미확정 — 확인이 필요한 것

### 1. ~~`PUT /employees/{id}`가 전체 교체다~~ — 풀렸다 (2026-09-09)

**2026-09-02에 `PATCH` 둘이 열렸다.** 8-31에 서버가 "방향이 맞다"고 인정한 것이
그대로 들어왔다.

| 무엇 | 어떻게 풀렸나 |
|---|---|
| ~~`residentNo`를 되돌려 보낼 수 없다~~ | **`PATCH /employees/{id}/resident-no`.** 넣는 경로가 생겼다. 여전히 읽을 수는 없고 `residentNoRegistered`만 `true`가 된다 |
| ~~`departmentId`·`jobId`를 되돌려 보낼 수 없다~~ | **조회에 id가 실린다 + `PATCH /employees/{id}/assignment`.** 이름으로 역매핑하지 않는다 |

**A-102에 그 둘을 붙였다** (2026-09-07). 재직상태 · 사번과 합쳐 바꿀 수 있는 것이 넷이다.

**그리고 2026-09-09에 `PUT`도 풀렸다** (회신 25번). `EmployeeUpdateRequest`에서
`residentNo`가 빠졌다 — 스펙에 필드가 없으니 전체 교체로 이름을 고쳐도 주민번호가
지워지지 않는다.

서버 확인으로는 **원래도 지우지 않았다.** 값이 비어 있으면 기존 값을 그대로 두고
넘어갔다고 한다. 스펙에 필드가 있으면 전체 교체로 읽는 것이 맞아서 8-26부터 막아
뒀던 것인데, 그 판단은 코드를 봐야 뒤집히는 것이었다 — 서버도 그렇게 말했다.

**A-102에 이름·연락처·주소를 붙였다** (2026-09-09). 바꿀 수 있는 것이 다섯이 됐다.
`corporation`·`hireDate`는 스펙 필수라 지금 값을 그대로 되돌려 보낸다.

**남은 것 하나 — 값을 「비우는」 방법이다.** 안 실으면 보존되므로 이 화면으로는 값을
지울 수 없다. 연락처가 바뀐 것이 아니라 없어진 경우를 다뤄야 하면 서버에 묻는다.

`phone`·`email`·`address`가 마스킹돼 오는지는 여전히 모른다 (5장 4번).

### 2. 주민등록번호를 어느 화면에서 누가 입력하는가

명세서 A-102의 필드 목록에 주민번호가 없다. 개발 서버 직원 103명 전원이 미등록이다.
관리팀 전용 등록 화면을 만들기로 했으나(`docs/00_문서_인덱스.md`) **누가 입력하는지**는
권한 체계(명세서 8장 1번)와 같이 정해져야 한다.

### 3. ~~마스터 등록·수정 API가 없다~~ — 조회만 만들기로 했다 (2026-09-01)

`GET /departments`·`GET /jobs` 둘뿐이다. A-103은 화면 이름이 "직무·부서 마스터 관리"인데
**관리할 API가 없다.**

**기획이 조회만 만들기로 정했다** (2026-09-01). 값을 고칠 일이 드물어 서버 시드로
관리한다 — **등록·수정 API를 요청하지 않는다.** 화면은 만들었다 (`apps/admin` `/masters`).

`JobItem`이 `workStart`·`workEnd`·`standardMinutes`·`hourlyWage`를 같이 주는 것이
이 화면의 값어치다. 스펙이 이유를 적어 두었다 — **"직원에게 직무가 없으면 근태가
판정되지 않는다."** 근태 현황에서 누가 `판정 전`으로 남을 때 여기를 본다.

### 4. 연락처·이메일 마스킹 여부

3장 `EmployeeDetailResponse` TODO 참고.

---

## 6. 이 문서가 다루지 않는 것

- 재직증명서 — `docs/API_재직증명서.md`
- 급여대상 판정이 급여에 쓰이는 방식 — `docs/API_급여.md`
- 개발 서버의 스텁 인증 id — `docs/00_문서_인덱스.md` 「개발 서버 데이터가 통째로 바뀌었다」
