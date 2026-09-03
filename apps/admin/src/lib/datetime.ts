/**
 * 날짜·시각 표기. **KST 고정이다.**
 *
 * 관리팀 화면에는 날짜 라이브러리가 없다. 모바일은 `date-fns-tz`를 쓰지만 이것 하나 때문에
 * 웹 번들에 라이브러리를 더하지 않았다 — `Intl`과 `Date.UTC`로 되는 범위다.
 * 라이브러리가 필요해지면 사람에게 먼저 묻는다 (`CLAUDE.md` 7장).
 *
 * 숫자 포맷(금액·근무시간)은 `@hr/format`에 있다. 여기에는 날짜만 둔다.
 */

const KST = 'Asia/Seoul';

/**
 * 오늘 (`yyyy-MM-dd`), **KST 기준**.
 *
 * 기기 타임존을 따라가면 월말·월초에 하루 또는 한 달이 밀린다. 근태·급여 화면에서
 * 기준일이 하루 밀리면 다른 주를 보게 된다.
 *
 * `en-CA` 로캘이 `yyyy-MM-dd`를 준다.
 */
export function todayInKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: KST }).format(new Date());
}

/**
 * 올해, **KST 기준**. 연말에 기기 타임존을 따라가면 한 해가 밀린다.
 * 공휴일·단체연차처럼 연도로 거르는 화면이 같이 쓴다.
 */
export function currentYear(): number {
  return Number(todayInKst().slice(0, 4));
}

/**
 * `yyyy-MM-dd`가 속한 달의 첫날과 마지막 날.
 * 달의 길이는 `Date.UTC`로 구한다 — 다음 달 0일이 이번 달 마지막 날이다.
 */
export function monthRange(isoDate: string): { from: string; to: string } {
  const [year, month] = isoDate.split('-').map(Number);
  if (year === undefined || month === undefined) return { from: isoDate, to: isoDate };

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = isoDate.slice(0, 7);
  return { from: `${prefix}-01`, to: `${prefix}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * 이번 달 (`yyyy-MM`), **KST 기준**. 달력 화면이 처음 여는 달이다.
 */
export function currentMonth(): string {
  return todayInKst().slice(0, 7);
}

/**
 * `yyyy-MM` 에서 달을 옮긴다. `addMonth('2026-01', -1)` → `2025-12`.
 *
 * `Date.UTC` 로 센다 — 기기 타임존을 타면 월말·월초에 한 달이 밀린다.
 * 날짜를 1일로 고정해 계산하므로 31일이 있는 달에서 하루가 새지 않는다.
 */
export function addMonth(month: string, delta: number): string {
  const [year, monthNo] = month.split('-').map(Number);
  if (year === undefined || monthNo === undefined) return month;

  const moved = new Date(Date.UTC(year, monthNo - 1 + delta, 1));
  const movedMonth = String(moved.getUTCMonth() + 1).padStart(2, '0');
  return `${moved.getUTCFullYear()}-${movedMonth}`;
}

/** `2026-09` → `2026년 9월` */
export function monthTitle(month: string): string {
  const [year, monthNo] = month.split('-').map(Number);
  if (year === undefined || monthNo === undefined) return month;
  return `${year}년 ${monthNo}월`;
}

/**
 * 달력 격자에 깔 날짜들. **일요일로 시작하는 주 단위**로 앞뒤를 채운다.
 *
 * 그 달을 덮는 데 필요한 만큼만 준다 (4~6주). 항상 6주로 고정하면 5주짜리 달에
 * 빈 줄이 하나 남는다.
 *
 * 앞뒤로 붙는 다른 달 날짜도 같이 온다 — 격자를 채우려면 필요하다. 그 날들을
 * 어떻게 그릴지는 화면이 정한다.
 */
export function monthGridDates(month: string): string[] {
  const [year, monthNo] = month.split('-').map(Number);
  if (year === undefined || monthNo === undefined) return [];

  const first = new Date(Date.UTC(year, monthNo - 1, 1));
  const lastDay = new Date(Date.UTC(year, monthNo, 0)).getUTCDate();
  const leading = first.getUTCDay();
  const weeks = Math.ceil((leading + lastDay) / 7);

  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNo - 1, 1 - leading + index));
    const isoMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
    const isoDay = String(date.getUTCDate()).padStart(2, '0');
    return `${date.getUTCFullYear()}-${isoMonth}-${isoDay}`;
  });
}

/** 그 날짜가 `yyyy-MM` 달에 속하는가. 격자 앞뒤에 붙은 다른 달 날짜를 가른다 */
export function isInMonth(isoDate: string, month: string): boolean {
  return isoDate.startsWith(`${month}-`);
}
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * `yyyy-MM-dd`의 요일.
 *
 * `Date.UTC`로 계산해 **기기 타임존을 타지 않는다.** 날짜 문자열의 요일은 달력의 성질이라
 * 시각·타임존과 무관하다. `new Date('2026-08-29')`는 UTC 자정으로 읽혀 한국에서 하루가 밀린다.
 */
export function weekdayText(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return '—';
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? '—';
}

/** `8.24 ~ 8.30` — 기간 한 칸에 넣는 표기 */
export function dateRangeText(from: string, to: string): string {
  return `${shortDate(from)} ~ ${shortDate(to)}`;
}

/** `8.24` */
export function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  if (month === undefined || day === undefined) return isoDate;
  return `${month}.${day}`;
}

/**
 * 서버 일시를 `8.24 19:41`로. **타임존이 안 붙어 오는 값에 쓴다.**
 *
 * 서버는 한국 시간으로 돌지만 일시에 오프셋을 붙이지 않는 응답이 있다
 * (`API_신청결재.md` 1장). `new Date('2026-08-29T11:52:32')`는 그것을 **기기 타임존**으로
 * 읽는다. 오프셋이 이미 있으면 건드리지 않으므로 어느 쪽이 오더라도 안전하다.
 */
export function formatKstDateTime(value: string): string {
  const date = new Date(hasTimeZone(value) ? value : `${value}+09:00`);
  if (Number.isNaN(date.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  // `month: 'numeric'` 을 줘도 `en-CA` 는 `08` 로 채워 준다 — 로캘의 숫자 패턴이 이긴다.
  // 그대로 쓰면 같은 표에서 `shortDate` 는 `8.24`, 이쪽은 `08.24` 가 된다 (2026-09-03).
  const trim = (type: string) => String(Number(get(type)));
  return `${trim('month')}.${trim('day')} ${get('hour')}:${get('minute')}`;
}

/**
 * 서버 일시에서 **시각만** 뽑아 `09:02`로. 하루를 보는 표에서 날짜는 이미 제목에 있다.
 *
 * **자정을 넘긴 퇴근에 `+1`을 붙인다.** 야간근무는 출근일 다음 날 퇴근하고, 서버는
 * 그것을 `checkOutAt`의 **날짜**로 표현한다 (`AttendanceCorrectionRequest` 스키마 설명).
 * `01:30`만 적으면 새벽에 출근한 것으로 읽힌다.
 *
 * `baseDate`는 그 줄의 근무일(`yyyy-MM-dd`)이다. **며칠이 밀렸는지는 세지 않는다** —
 * 하루를 넘는 퇴근이 무엇인지가 문서에 없다.
 */
export function formatKstClock(value: string, baseDate?: string): string {
  const date = new Date(hasTimeZone(value) ? value : `${value}+09:00`);
  if (Number.isNaN(date.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const clock = `${get('hour')}:${get('minute')}`;
  const onDate = `${get('year')}-${get('month')}-${get('day')}`;

  return baseDate !== undefined && onDate !== baseDate ? `${clock} +1` : clock;
}

/** 끝에 `Z` 또는 `+09:00` 같은 오프셋이 붙어 있는지. 날짜부의 `-`와 섞이지 않게 뒤에서 본다 */
function hasTimeZone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
}
