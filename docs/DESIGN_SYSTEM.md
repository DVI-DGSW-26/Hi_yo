# 디자인 시스템 — 수치 레퍼런스

`DESIGN_RULES.md`가 "하지 말 것"이라면, 이 문서는 **"정확히 어떤 값을 쓸 것인가"**다.
여기 없는 값은 쓰지 않는다. 필요하면 만들기 전에 사람에게 묻는다.

모든 값은 `@hr/tokens`에 정의되어 있다. 아래 표는 그 값이 무엇이고 어디에 쓰는지의 설명이다.
**표의 숫자를 코드에 직접 적지 않는다. 반드시 토큰을 import해서 쓴다.**

---

## 1. 컬러

```ts
import { colors } from '@hr/tokens';
```

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `primary` | `#00C471` | Primary 버튼 배경, 선택된 날짜, 게이지 채움, 핵심 숫자, `확정` 상태 |
| `primaryPress` | `#00B267` | Primary 버튼 눌림 상태 **전용**. 다른 곳에 쓰지 않는다 |
| `textStrong` | `#191F28` | 화면 제목, 섹션 제목, 값, 금액 |
| `textBody` | `#4E5968` | 본문, Secondary 버튼 글자, 부서명 등 |
| `textWeak` | `#8B95A1` | 라벨, 보조 설명, 요일, 캡션, 중립 상태값 |
| `textDisabled` | `#D1D6DB` | 값이 아직 없을 때 ("아직이에요"), 누를 수 없는 날짜 |
| `white` | `#FFFFFF` | 화면 배경, 섹션 배경, Primary 버튼 글자 |
| `divider` | `#F2F4F6` | 섹션 구분 띠, 게이지 트랙, Secondary 버튼 눌림 배경 |
| `border` | `#E5E8EB` | 얇은 구분선 |
| `borderStrong` | `#D1D6DB` | Secondary 버튼 보더 |
| `danger` | `#E24B4A` | 오류, 누락, 반려, `danger` 버튼 (`DESIGN_ADMIN.md` 5장) |
| `focusRing` | `#191F28` | 키보드 포커스 표시 **전용**. `:focus-visible`에만 쓴다 |
| `scrim` | `rgba(25,31,40,0.4)` | 모달 뒤를 덮는 막. 하단 시트와 관리팀 `Dialog`가 같이 쓴다 |

`focusRing`에 `primary`를 쓰지 않는다. 흰 배경 대비가 **2.3:1**이라 포커스 표시에 필요한
3:1에 못 미치고, 포커스는 화면 어디에나 생겨서 그린 예산이 의미를 잃는다.
값은 `textStrong`과 같지만(대비 16:1) 의미가 달라 이름을 따로 둔다.

### 그린 사용 예산

**한 화면에 `primary`가 등장하는 지점은 최대 2곳.** (`primaryPress`는 세지 않는다)

| 화면 | 1곳 | 2곳 |
|---|---|---|
| 근태 현황 | 게이지 채움 | `퇴근하기` 버튼 |
| 연차 신청 | 선택된 날짜 | `신청하기` 버튼 |
| 마이페이지 | 근속일수 숫자 | `정보 수정 요청` 버튼 |
| 재직증명서 | `발급받기` 버튼 | **없음** |
| 급여명세서 | 실수령액 숫자 | **없음** (`PDF 저장`은 secondary) |

조회가 목적인 화면은 1곳 이하가 정상이다. 억지로 채우지 않는다.

---

## 2. 타이포그래피

```ts
import { typography, fontFamily } from '@hr/tokens';
```

폰트는 **Pretendard** 하나. weight는 **400과 500만**. 600 이상은 프로젝트에 존재하지 않는다.

| 토큰 | 크기 | weight | lineHeight | letterSpacing | 색 | 쓰는 곳 |
|---|---|---|---|---|---|---|
| `headline` | 22 | 500 | 30 | -0.4 | `textStrong` | 화면의 핵심 메시지. 화면당 1개 |
| `sectionTitle` | 16 | 500 | 24 | 0 | `textStrong` | 섹션 제목 |
| `body` | 17 | 400 | 26 | 0 | `textStrong` | 리스트의 값, 본문 |
| `bodySmall` | 15 | 400 | 23 | 0 | `textStrong` / `textWeak` | 리스트 라벨, 달력 날짜 |
| `label` | 13 | 400 | 20 | 0 | `textWeak` | 게이지 캡션, 보조 설명 |
| `caption` | 12 | 400 | 18 | 0 | `textWeak` | 요일, 최소 단위 메타 정보 |

### 별도 취급하는 값

| 용도 | 크기 | weight | 색 |
|---|---|---|---|
| 화면 핵심 숫자 (실수령액, 근무시간) | 26~28 | 500 | `primary` 또는 `textStrong` |
| 버튼 글자 | 17 | 500 | 버튼 종류에 따름 |

### 금지

- **본문에 13px 이하를 쓰지 않는다.** 13 이하는 라벨·캡션 전용
- 11px 미만 금지
- weight 600, 700 금지
- 굵기로 강조하지 않는다. 크기와 색으로 한다

### 글꼴 확대 대응

시스템 글꼴 크기를 키운 사용자가 있다. 고정 높이 안에 텍스트를 가두지 않는다.
버튼과 달력처럼 높이가 고정된 요소는 `maxFontSizeMultiplier`를 준다 (버튼 1.4, 달력 1.3).

---

## 3. 여백과 라운드

```ts
import { spacing, radius } from '@hr/tokens';
```

375px 기준 고정값이다. **임의로 줄이지 않는다.** 답답해 보이는 화면의 원인은 대부분 여백 부족이다.

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `screenX` | 24 | 화면 좌우 패딩 |
| `sectionY` | 28 | 섹션 상하 패딩 |
| `sectionTitleGap` | 20 | 섹션 제목 아래 여백 |
| `rowGap` | 18 | 리스트 항목 사이 |
| `tight` | 8 | 붙어 있는 두 요소 사이 — 라벨↔입력칸, 값↔보조 문구, 오류 문구↔필드 |
| `ctaX` | 20 | 하단 CTA 영역 좌우 패딩 |
| `navHeight` | 52 | 상단 네비게이션 높이 |
| `sideNavWidth` | 200 | 관리팀 화면 좌측 메뉴 폭 |
| `rowHeight` | 44 | 한 줄의 **최소** 높이. 모바일 리스트 행과 관리팀 표 행이 같이 쓴다 |
| `dividerHeight` | 10 | 섹션 구분 띠 높이 |

`rowHeight`는 최소 터치 영역 44×44에서 온 값이라 줄이지 않는다.
**고정 높이로 쓰지 않는다** — 글꼴을 키우면 이보다 커져야 한다.

### 무엇을 토큰으로 만드는가

**여러 화면·컴포넌트에서 반복되는 값만 토큰으로 둔다.** 한 곳에서만 쓰는 숫자는
그 컴포넌트 안에 두고, **두 번째로 쓰이는 순간** 올린다.
전부 토큰으로 만들면 이름을 찾는 비용이 값을 고정하는 이득보다 커진다.

| 라운드 | 값 | 쓰는 곳 |
|---|---|---|
| `radius.button` | 14 | 버튼 |
| `radius.gauge` | 5 | 게이지 |
| `radius.chip` | 8 | 칩, 입력 필드 |
| (달력 날짜) | 10 | Calendar 내부 고정 |

---

## 4. 화면 구조

**흰 배경 위에 회색 띠로 섹션을 나눈다.** 카드를 회색 배경에 띄우지 않는다.

```
┌──────────────────────┐
│ 상단 네비 (52)        │
├──────────────────────┤
│ Section              │  흰 배경, 좌우 24, 상하 28
│   headline           │
│   Gauge              │
├──────────────────────┤
│ SectionDivider (10)  │  회색 띠, 화면 전체 폭
├──────────────────────┤
│ Section              │
│   SectionTitle       │
│   ListRow            │
│   ListRow            │
├──────────────────────┤
│ SectionDivider (10)  │
├──────────────────────┤
│ Section              │
├──────────────────────┤
│ 하단 CTA (좌우 20)    │  Button (primary, cta)
└──────────────────────┘
```

### 금지

- 그림자(`shadowColor`, `elevation`) 금지. 전부 0
- 그라디언트, blur 금지
- 카드 중첩 금지
- 가로 스크롤, 캐러셀 금지
- 한쪽 면 보더 + 라운드 조합 금지

---

## 5. 컴포넌트

```ts
import { Button, ListRow, TextField, SectionTitle, Section, SectionDivider, Gauge, StatusText, Calendar, Sheet, ConfirmSheet, SelectSheet, QueryState, MutationError } from '@/components';
```

**새 컴포넌트를 즉석에서 만들지 않는다.** 아래를 조합한다. 없으면 사람에게 묻는다.

### Button

```tsx
<Button label="퇴근하기" onPress={handlePress} />
<Button label="PDF 저장" variant="secondary" onPress={save} />
<Button label="신청하기" loading={isPending} onPress={submit} />
```

| prop | 값 | 기본 |
|---|---|---|
| `variant` | `primary` \| `secondary` | `primary` |
| `size` | `cta` (높이 54) \| `inline` (높이 44) | `cta` |
| `loading` | boolean | false |

- **한 화면에 `primary`는 1개.** 두 번째 버튼은 반드시 `secondary`
- `disabled` prop은 존재하지 않는다. 누를 수 없는 상황이면 눌렀을 때 인라인 에러로 알린다
- 라벨은 동사로 끝낸다: `확인` (X) → `신청하기` (O)

### ListRow

```tsx
<ListRow label="출근" value="08:52" />
<ListRow label="퇴근" placeholder="아직이에요" />
<ListRow label="계좌정보" value="국민 ****-**-**1234" onPress={goEdit} />
<ListRow label="8.24 ~ 8.26 · 연차휴가" right={<StatusText label="반려했어요" tone="error" />} />
<ListRow label="연차" value="현황·신청" variant="nav" onPress={goLeave} />
```

값이 없을 때 `placeholder`를 쓰면 `textDisabled` 색으로 표시된다.

값 자리에 `StatusText` 같은 요소가 필요하면 `right`에 넣는다. `SectionTitle`의 `right`와 같은 방식이다.
주면 `value`·`placeholder` 대신 그것이 그려진다.

### 강약은 두 종류다

| `variant` | 라벨 | 값 | 쓰는 곳 |
|---|---|---|---|
| `value` (기본) | `bodySmall` / `textWeak` | `body` / `textStrong` | 데이터를 보여주는 줄. `계좌정보 → 국민 ****-**-**1234` |
| `nav` | `body` / `textStrong` | `bodySmall` / `textWeak` | 눌러서 이동하는 줄. 갈 곳의 이름이 주인공이다 |

**메뉴 줄에 기본값을 쓰지 않는다.** 갈 곳의 이름이 흐려지고 설명이 진해져서 거꾸로 읽힌다.

### TextField

```tsx
<TextField label="용도" value={value} onChangeText={setValue} maxLength={100} />
<TextField label="제출처" value={value} onChangeText={setValue} error="100자까지 쓸 수 있어요." />
```

| prop | 설명 |
|---|---|
| `maxLength` | 서버가 받는 한계를 그대로 넣는다. 넘겨서 422를 받게 두지 않는다 |
| `error` | 인라인 오류. `Button`에 `disabled`가 없으므로 막힌 이유는 전부 이 자리로 온다 |

라벨은 필드 위에 둔다. 높이를 고정하지 않는다 — `minHeight`만 버튼과 같은 54를 준다.

TODO: 라벨 위치·오류 표기·비활성 상태는 `DESIGN_RULES.md` 7장이 비어 있어 확정되지 않았다.

### Section / SectionDivider

```tsx
<Section>
  <SectionTitle title="오늘" />
  <ListRow label="출근" value="08:52" />
</Section>
<SectionDivider />
<Section>...</Section>
```

### Gauge

```tsx
<Gauge ratio={0.73} caption="주 52시간까지 13시간 40분" captionRight="73%" />
```

`ratio`는 0~1. 1을 넘겨도 바가 깨지지 않는다. **비율 계산은 서버 값으로 하고 앱에서 근무시간을 합산하지 않는다.**

### StatusText

```tsx
<StatusText label="확정" tone="done" />
<StatusText label="근태 누락" tone="error" />
<StatusText label="검토 대기" />
```

| tone | 색 | 쓰는 상태 |
|---|---|---|
| `done` | `primary` | 확정, 완료, 승인 |
| `error` | `danger` | 오류, 누락, 반려 |
| `neutral` (기본) | `textWeak` | **그 외 전부** — 대기, 검토중, 진행중, 미기록 |

상태를 색으로 구분하려고 새 tone을 만들지 않는다. 뱃지(알약 배경)를 쓰지 않는다.

### Sheet / ConfirmSheet / SelectSheet

**화면 위에 겹치는 것은 전부 아래에서 올라오는 시트다** (2026-08-28 확정).
가운데 대화상자를 쓰지 않는다 — 엄지가 닿아야 하고, iPhone SE(375×667)에서 가운데 상자는
화면을 거의 다 먹는다.

```tsx
<ConfirmSheet
  open={canceling !== undefined}
  title="부탁을 취소할까요"
  description="민수님에게 간 부탁이 사라져요. 그 날 당직은 그대로 내가 서요."
  confirmLabel="취소하기"
  mutation={cancel}
  onConfirm={submit}
  onClose={close}
/>

<SelectSheet
  open={picking}
  title="어떤 근태인가요"
  options={[{ value: 'HALF_DAY', label: '반차', hint: '0.5일' }]}
  selected={typeCode}
  onSelect={setTypeCode}
  onClose={close}
/>
```

| | 쓰는 곳 |
|---|---|
| `Sheet` | 바탕. 직접 쓰는 일은 드물다. 두 시트가 이 위에 선다 |
| `ConfirmSheet` | 되돌릴 수 없는 동작을 한 번 더 묻는다 |
| `SelectSheet` | 목록에서 하나 고른다. **고르면 바로 닫힌다** — 확인 버튼을 두지 않는다 |

- **그림자를 쓰지 않는다.** 떠 있는 느낌은 뒤를 덮는 `colors.scrim`이 낸다
- 위쪽 두 귀만 둥글다(16). 아래는 화면 끝에 붙는다
- **높이를 고정하지 않는다.** 내용만큼 자라고 화면의 80%를 넘으면 그 안에서 스크롤한다
- 하단 여백은 `useSafeAreaInsets`로 받는다
- **`danger` 버튼이 없다.** 실행 버튼은 `primary`이고, 무엇이 사라지는지는 `description`이 적는다.
  시트가 이미 그 동작 하나만 놓고 묻는 자리라 색을 더 쓰지 않는다
- 왼쪽은 `닫기`다. `취소`가 아니다 (7장)
- **그린 예산은 시트를 따로 센다.** 시트가 떠 있는 동안 뒤 화면은 누를 수 없어서
  한 번에 보이는 `primary`는 여전히 하나다

`description`은 **무엇이 일어나는지 구체적으로** 적는다. `정말 하시겠어요?` (X)
되돌릴 수 없으면 그 사실을 적는다.

### Calendar

연차 신청(S-301)과 당직 스케줄(S-503)이 같이 쓴다.

```tsx
<Calendar
  month={currentMonth}
  markers={{ '2026-10-14': 'full', '2026-10-20': 'duty' }}
  selected={selectedDates}
  isDisabled={(iso) => iso < todayIso}
  onPressDate={handleSelect}
/>
```

| prop | 설명 |
|---|---|
| `markers` | `{ 'yyyy-MM-dd': MarkerType }`. 서버 데이터를 그대로 넣는다 |
| `selected` | 선택된 날짜 배열. 선택된 날짜는 그린 배경이 되고 점은 숨겨진다 |
| `isDisabled` | 누를 수 없는 날짜 판정. **잔여연차 초과 판단은 화면에서 서버 값으로 한다** |

**`isDisabled`에 확정되지 않은 도메인 규칙을 넣지 않는다.** 위 예시의 `iso < todayIso`는
"지난 날짜에는 신청할 수 없다"는 규칙을 전제하는데, 그건 문서에 없다. 근거 없이 막으면
달력의 대부분이 죽어 보이고, 규칙이 다를 때 조용히 틀린다. 고르는 것은 열어두고 판정은 서버가 한다.

MarkerType: `full`(연차) / `half`(반차) / `duty`(당직) / `group`(단체연차)

---

## 6. 숫자 포맷

```ts
import { formatMinutes, formatAmount, formatLeaveDays, formatTime } from '@/lib/format';
```

**화면에 나가는 모든 숫자는 이 함수를 거친다.** 컴포넌트에서 직접 계산하거나 포맷하지 않는다.

| 함수 | 입력 | 출력 |
|---|---|---|
| `formatMinutes(500)` | 분 단위 정수 | `8시간 20분` |
| `formatAmount(3847200)` | 원 단위 정수 | `3,847,200` |
| `formatLeaveDays(0.5)` | 일수 | `0.5일` |
| `formatTime(iso)` | ISO 문자열 | `08:52` (KST 고정) |

### 서버와의 약속

- 근무시간은 **분 단위 정수**로 받는다. `8.33` 같은 소수를 받지 않는다
- 금액은 **원 단위 정수**로 받는다
- 날짜·시각은 ISO 8601, 표시는 **KST 고정**. 기기 타임존을 따라가지 않는다
- `8.33시간` 같은 소수 표기를 화면에 쓰지 않는다

---

## 7. 문구

전부 **해요체**. 자세한 규칙은 `DESIGN_RULES.md` 6장.

| 상황 | 쓰지 않는다 | 쓴다 |
|---|---|---|
| 완료 | 신청되었습니다 | 신청했어요 |
| 값 없음 | 미기록 / 데이터 없음 | 아직이에요 |
| 불가 | 잔여 연차가 없어요 | 올해 연차를 다 썼어요. 다음 연차는 1월 1일에 생겨요 |
| 다이얼로그 좌측 버튼 | 취소 | 닫기 |
| 오류 | 조회 실패 | 지금은 불러올 수 없어요 |

느낌표를 쓰지 않는다. "죄송합니다", "잠시만 기다려주세요" 대신 무엇을 하면 되는지 쓴다.
