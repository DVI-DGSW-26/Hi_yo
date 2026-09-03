import { slotName } from '@hr/format';
import type { DutySchedule, RotationCycle } from './api';

/**
 * 당직 화면의 표기. 명단 목록과 명단 상세가 같이 쓴다.
 *
 * **상태를 색으로 구분하지 않는다.** `PLANNED`·`DONE`·`SWAPPED` 어느 것도 그린으로
 * 칠하지 않는다 — A-601의 `확정`처럼 되돌릴 수 없는 업무 이정표가 아니라 그냥 시점이다.
 * 표 한 열이 통째로 초록이 되면 그린 예산이 의미를 잃는다 (`DESIGN_ADMIN.md` 7장).
 */

const CYCLE_LABEL: Record<RotationCycle, string> = {
  DAILY: '매일',
  // 서버 스펙이 "당직(일직)은 14일마다" 라고 적고 있다. 2주로 바꿔 적지 않는다.
  BIWEEKLY: '14일마다',
  ON_DEMAND: '수시',
};

export function rotationCycleText(cycle: RotationCycle): string {
  return CYCLE_LABEL[cycle];
}

/**
 * 배정 상태.
 *
 * 명세서 1.4는 `예정/확정/완료`로 적고 있으나 API는 `PLANNED/DONE/SWAPPED`를 준다.
 * **`확정`에 해당하는 값이 없고 `교체됨`이 명세서에 없다.** API를 따른다.
 */
const STATUS_LABEL: Record<DutySchedule['status'], string> = {
  PLANNED: '예정',
  DONE: '완료',
  SWAPPED: '교체됨',
};

export function scheduleStatusText(status: DutySchedule['status']): string {
  return STATUS_LABEL[status];
}

/**
 * 경비교대 슬롯.
 *
 * **코드를 말로 바꾸는 표는 `@hr/format` 에 있다** — 모바일과 같은 값을 다르게 말하면
 * 안 된다. 여기서 하는 것은 **빈 값 처리**뿐이다. 표는 빈 칸에도 자리를 남겨야 한다
 * (모바일은 줄을 아예 안 그린다 — 자리의 성질이 달라서다).
 */
export function slotText(slotCode: string | null): string {
  return slotCode == null ? '—' : slotName(slotCode);
}

// 요일은 `lib/datetime.ts`의 `weekdayText`를 쓴다. 당직만 쓰는 값이 아니라 올렸다.
//
// `DutyScheduleResponse.dayOfWeek`도 있지만 `SATURDAY`인지 `토`인지 확인하지 못했다 —
// 개발 서버에 배정이 한 건도 없다. 확인되면 서버 값을 쓰도록 바꾼다.

/**
 * `08:00 ~ 17:00` — 서버가 주는 시각은 `08:00:00` 형태다.
 * 날짜가 없어 타임존을 따질 것이 없고, 초는 화면에 쓰지 않아 잘라낸다.
 */
export function timeRangeText(startTime: string | null, endTime: string | null): string {
  if (startTime == null || endTime == null) return '—';
  return `${startTime.slice(0, 5)} ~ ${endTime.slice(0, 5)}`;
}
