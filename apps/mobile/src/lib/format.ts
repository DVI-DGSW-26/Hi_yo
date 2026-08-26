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

// TODO: 날짜의 화면 표기 형식(`2026.08.24` / `2026년 8월 24일` 등)은
// DESIGN_SYSTEM.md 6장에 정의돼 있지 않다. 확정되면 프리셋 함수로 추가한다.
// 확정 전까지는 formatInKst에 pattern을 직접 넘긴다.

// 마스킹(주민번호·계좌번호·연락처·이메일)은 서버가 마스킹된 값을 준다 (명세서 7.2).
// 클라이언트에서 원본을 받아 가리는 함수를 여기에 만들지 않는다.
