/**
 * 52시간 알림 단계의 표기.
 *
 * **단계는 서버가 정한 `alertLevel`을 그대로 쓴다.** 분을 보고 다시 판단하지 않는다 —
 * 스키마가 "프런트가 분 단위로 다시 판단하면 서버와 기준이 어긋난다"고 적고 있다.
 *
 * **관리팀 화면(`apps/admin`의 같은 이름 파일)과 문구를 맞춰 둔다.** 같은 값을 두 앱이
 * 다르게 말하면 안 된다. 한쪽을 고치면 다른 쪽도 고친다 — 공용 자리로 올릴지는
 * 문구 규칙(`DESIGN_RULES.md` 6장)이 정해질 때 같이 본다.
 */

const LEVEL_LABEL: Record<number, string> = {
  0: '여유 있어요',
  1: '48시간을 넘겼어요',
  2: '52시간이 코앞이에요',
  3: '52시간을 넘겼어요',
};

export function alertLevelText(level: number): string {
  // 서버가 새 단계를 늘릴 수 있다. 모르는 값은 숫자를 그대로 보여주고 지어내지 않는다.
  return LEVEL_LABEL[level] ?? `단계 ${level}`;
}

export function alertLevelTone(level: number): 'done' | 'error' | 'neutral' {
  return level >= 2 ? 'error' : 'neutral';
}

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
