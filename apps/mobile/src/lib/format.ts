import { formatInTimeZone } from 'date-fns-tz';

/**
 * 화면에 나가는 값의 유일한 포맷 지점이다.
 * 서버가 계산한 값을 표기 형태로만 바꾼다. 재계산·검산·보정을 하지 않는다.
 * 컴포넌트에서 직접 숫자를 가공하지 않는다.
 */

const KST = 'Asia/Seoul';

/**
 * 근무시간. 서버는 분 단위 정수를 준다 (명세서 7.2).
 *
 *   500 → "8시간 20분"
 *   480 → "8시간"
 *    20 → "20분"
 *     0 → "0분"
 *
 * `8.33시간` 같은 소수 표기를 쓰지 않는다.
 */
export function formatDuration(minutes: number): string {
  assertFinite(minutes, 'formatDuration');

  const sign = minutes < 0 ? '-' : '';
  const total = Math.abs(Math.trunc(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return `${sign}${mins}분`;
  if (mins === 0) return `${sign}${hours}시간`;
  return `${sign}${hours}시간 ${mins}분`;
}

/**
 * 금액. 서버는 원 단위 정수를 준다 (명세서 7.2).
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
 * 서버 일시(ISO 8601)를 KST 고정으로 표기한다 (명세서 7.2).
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

// TODO: 날짜·시각의 화면 표기 형식(`2026.08.24` / `2026년 8월 24일` 등)은
// docs/DESIGN_RULES.md 3장이 확정된 뒤 프리셋 함수로 추가한다.
// 확정 전까지는 화면에서 pattern을 직접 넘긴다.

// 마스킹(주민번호·계좌번호·연락처·이메일)은 서버가 마스킹된 값을 준다 (명세서 7.2).
// 클라이언트에서 원본을 받아 가리는 함수를 여기에 만들지 않는다.

/** Hermes의 Intl 지원 편차를 타지 않도록 세 자리 구분을 직접 처리한다. */
function groupDigits(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.abs(value));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function assertFinite(value: number, caller: string): void {
  if (!Number.isFinite(value)) {
    // 값 자체를 메시지에 넣지 않는다. 급여액이 로그·크래시 리포트에 남을 수 있다.
    throw new Error(`${caller}: 유한한 숫자가 아닌 값이 들어왔습니다.`);
  }
}
