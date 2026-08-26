/**
 * 화면에 나가는 숫자의 표기. 모바일과 관리팀 화면이 같이 쓴다.
 *
 * 서버가 계산한 값을 표기 형태로만 바꾼다. **재계산·검산·보정을 하지 않는다.**
 * 같은 급여 금액을 두 앱이 다르게 그리는 일이 없도록 여기 한 곳에 둔다.
 *
 * 날짜·시각(KST 고정)은 여기 없다. `date-fns-tz`가 필요해서 앱에 남겨두었다.
 */

/**
 * 근무시간. 서버는 분 단위 정수를 준다.
 *
 *   500 → "8시간 20분"
 *   480 → "8시간"
 *    20 → "20분"
 *     0 → "0분"
 *
 * `8.33시간` 같은 소수 표기를 쓰지 않는다.
 */
export function formatMinutes(minutes: number): string {
  assertFinite(minutes, 'formatMinutes');

  const sign = minutes < 0 ? '-' : '';
  const total = Math.abs(Math.trunc(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return `${sign}${mins}분`;
  if (mins === 0) return `${sign}${hours}시간`;
  return `${sign}${hours}시간 ${mins}분`;
}

/**
 * 금액. 서버는 원 단위 정수를 준다.
 *
 *   3847200 → "3,847,200"
 *   -120000 → "-120,000"
 *
 * 단위(`원`)는 붙이지 않는다. 붙이는 위치는 화면이 정한다.
 * 원 단위 절사는 서버를 따른다. 여기서 반올림하지 않는다.
 */
export function formatAmount(won: number): string {
  assertFinite(won, 'formatAmount');
  return groupDigits(Math.trunc(won));
}

/**
 * 연차 일수.
 *
 *   1    → "1일"
 *   0.5  → "0.5일"
 *   0.25 → "0.25일"
 *
 * 불필요한 0을 붙이지 않는다 (`1.0일` X).
 * 차감 단위(반차·반반차 허용 여부)는 서버가 정한다. 여기서 반올림하지 않는다.
 */
export function formatLeaveDays(days: number): string {
  assertFinite(days, 'formatLeaveDays');
  return `${trimZeros(days)}일`;
}

/** `202608` → `2026년 8월`. 급여 대상월은 정수로 온다. */
export function formatTargetYm(targetYm: number): string {
  assertFinite(targetYm, 'formatTargetYm');
  const year = Math.trunc(targetYm / 100);
  const month = Math.trunc(targetYm) % 100;
  return `${year}년 ${month}월`;
}

/** Hermes의 Intl 지원 편차를 타지 않도록 세 자리 구분을 직접 처리한다. */
function groupDigits(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.abs(value));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 0.50 → "0.5", 1.0 → "1". 부동소수 잔여값(0.30000000000000004)을 흘리지 않는다. */
function trimZeros(value: number): string {
  return String(Number(value.toFixed(4)));
}

function assertFinite(value: number, caller: string): void {
  if (!Number.isFinite(value)) {
    // 값 자체를 메시지에 넣지 않는다. 급여액이 로그·크래시 리포트에 남을 수 있다.
    throw new Error(`${caller}: 유한한 숫자가 아닌 값이 들어왔습니다.`);
  }
}
