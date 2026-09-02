import type { ReactNode } from 'react';
import { formatLeaveDays, formatMinutes } from '@hr/format';

/**
 * 표 셀에서 **0과 빈 값을 한 단 옅게** 그리는 것들 (`DESIGN_ADMIN.md` 3장).
 *
 * 근태 현황은 한 화면에 `0분`이 수십 개다. 값과 같은 검정으로 그리면 실제로 시간이
 * 찍힌 칸이 그 사이에 묻힌다.
 *
 * **지우거나 감추지 않는다.** 0인 것과 값이 없는 것은 다르고 둘 다 그대로 보여야 한다 —
 * 색만 내린다. 포맷은 `@hr/format`을 그대로 거친다. 여기서 숫자를 만들지 않는다
 * (`CLAUDE.md` 5장).
 */
export function dim(value: ReactNode): ReactNode {
  return <span className="dim">{value}</span>;
}

/**
 * 값이 없는 칸. `—` 를 옅게 둔다.
 *
 * **`undefined` 도 같이 받는다.** 서버가 스펙에 있는 필드를 빠뜨려 보내는 일이 있고,
 * 그것을 `=== null` 로만 막으면 `undefined` 가 그대로 포맷 함수까지 가서 앱 전체가
 * 죽는다 (`DESIGN_ADMIN.md` 3장 「빈 상태·로딩·에러」).
 */
export function orDash(value: string | null | undefined): ReactNode {
  return value ?? dim('—');
}

/** 분. 0분이면 옅게 */
export function minutesCell(minutes: number): ReactNode {
  const text = formatMinutes(minutes);
  return minutes === 0 ? dim(text) : text;
}

/** 연차 일수. 0일이면 옅게 */
export function daysCell(days: number): ReactNode {
  const text = formatLeaveDays(days);
  return days === 0 ? dim(text) : text;
}
