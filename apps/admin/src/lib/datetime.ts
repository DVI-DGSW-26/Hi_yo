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
  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
}

/** 끝에 `Z` 또는 `+09:00` 같은 오프셋이 붙어 있는지. 날짜부의 `-`와 섞이지 않게 뒤에서 본다 */
function hasTimeZone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
}
