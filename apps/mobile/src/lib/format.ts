import { formatInTimeZone } from 'date-fns-tz';

/**
 * 화면에 나가는 값의 유일한 포맷 지점이다. (DESIGN_SYSTEM.md 6장)
 * 서버가 계산한 값을 표기 형태로만 바꾼다. 재계산·검산·보정을 하지 않는다.
 * 컴포넌트에서 직접 숫자를 가공하지 않는다.
 *
 * 숫자 포맷은 `@hr/format`에 있다. 관리팀 화면과 같은 함수를 쓴다 —
 * 같은 급여 금액을 두 앱이 다르게 그리면 안 된다.
 * 여기에는 날짜·시각(KST 고정)만 둔다. `date-fns-tz`가 필요해서다.
 */
export { formatMinutes, formatAmount, formatLeaveDays, formatTargetYm } from '@hr/format';

const KST = 'Asia/Seoul';

/**
 * 시각. 서버 일시(ISO 8601)를 KST 고정으로 표기한다.
 *
 *   "2026-08-24T08:52:00Z" → "17:52"
 *   "2026-08-23T23:52:00Z" → "08:52"
 */
export function formatTime(isoString: string): string {
  return formatInKst(isoString, 'HH:mm');
}

/**
 * KST 고정 표기의 기반 함수.
 *
 * 기기 타임존을 따라가지 않는다. 해외 출장 중에 근태 기록이 어긋나면 사고다.
 * 날짜를 다루는 화면은 반드시 이 함수를 거친다.
 */
export function formatInKst(isoString: string, pattern: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    throw new Error('formatInKst: ISO 8601 형식이 아닌 값이 들어왔습니다.');
  }
  return formatInTimeZone(date, KST, pattern);
}

/**
 * 서버 일시를 KST로 표기한다. **타임존이 안 붙어 오는 값에 쓴다.**
 *
 *   "2026-08-29T11:52:32"       → 한국 시간 11:52 로 읽는다
 *   "2026-08-29T02:52:32Z"      → 그대로 둔다 (이미 타임존이 있다)
 *
 * 서버는 한국 시간으로 돌지만 일시에 오프셋을 붙이지 않는 응답이 있다
 * (`API_신청결재.md` 1장). `new Date("2026-08-29T11:52:32")`는 그것을 **기기 타임존**으로
 * 읽어서, 해외에 있는 사람에게 마감 시각이 몇 시간씩 어긋난다.
 *
 * 오프셋이 이미 있으면 건드리지 않는다 — 어느 쪽이 오더라도 안전하다.
 */
export function formatServerDateTime(value: string, pattern: string): string {
  return formatInKst(hasTimeZone(value) ? value : `${value}+09:00`, pattern);
}

/** 끝에 `Z` 또는 `+09:00` 같은 오프셋이 붙어 있는지. 날짜부의 `-`와 섞이지 않게 뒤에서 본다 */
function hasTimeZone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
}

/**
 * 서버 날짜(`2026-08-24`, 시각 없음)를 KST 자정으로 못 박아 표기한다.
 * 시각을 붙이지 않으면 기기 타임존에 따라 하루 밀린다.
 */
export function formatServerDate(value: string, pattern: string): string {
  return formatInKst(`${value}T00:00:00+09:00`, pattern);
}

// TODO: 날짜의 화면 표기 형식(`2026.08.24` / `2026년 8월 24일` 등)은
// DESIGN_SYSTEM.md 6장에 정의돼 있지 않다. 확정되면 프리셋 함수로 추가한다.
// 확정 전까지는 formatInKst에 pattern을 직접 넘긴다.

// 마스킹(주민번호·계좌번호·연락처·이메일)은 서버가 마스킹된 값을 준다 (명세서 7.2).
// 클라이언트에서 원본을 받아 가리는 함수를 여기에 만들지 않는다.
