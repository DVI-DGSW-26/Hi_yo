/**
 * 근태 화면의 표기.
 *
 * **52시간 단계 문구는 `@hr/format` 에 있다** (2026-09-03에 올렸다). 관리팀과 같은 값을
 * 다르게 말하면 안 되는 것이라 두 앱이 각자 갖고 있으면 어긋난다. 여기서는 다시 내보내기만
 * 한다 — 부르는 자리를 바꾸지 않으려고 남겨 둔 문이다.
 */

export { alertLevelText, alertLevelTone } from '@hr/format';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * `2026-08-24` 의 요일.
 *
 * `Date.UTC`로 계산해 **기기 타임존을 타지 않는다.** 날짜 문자열의 요일은 달력의 성질이라
 * 시각·타임존과 무관하다. 서버가 `dayOfWeek`를 같이 주지만 형식이 확인되지 않았다
 * (`SATURDAY`인지 `토`인지) — 확인되면 서버 값을 쓴다.
 */
export function weekdayText(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return '';
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? '';
}
