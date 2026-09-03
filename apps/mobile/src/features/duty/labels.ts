import { slotName } from '@hr/format';
import { formatServerDate } from '@/lib/format';
import type { DutySchedule, DutySwap, DutySwapStatus } from './api';

/**
 * 당직 화면이 같이 쓰는 표기. 화면 세 곳(일정·받은 요청·보낸 요청)이 같은 문구를 써야 해서
 * 한자리에 둔다.
 *
 * 상태를 색으로 구분하려 하지 않는다 — 확정만 그린, 반려만 빨강, 나머지는 무채색이다
 * (`DESIGN_SYSTEM.md` 5장 StatusText).
 */

/**
 * `EXPIRED`와 `REJECTED`를 다른 문구로 쓴다. 상대가 거절한 것과 그냥 못 본 것은 다르고,
 * 못 본 것이면 다시 부탁할 수 있다. API가 이 구분을 화면에 요구한다.
 */
export function swapStatusLabel(status: DutySwapStatus): string {
  switch (status) {
    case 'AGREED':
      return '바꿨어요';
    case 'REJECTED':
      return '거절했어요';
    case 'EXPIRED':
      return '답이 없어 지났어요';
    default:
      return '답 기다리는 중';
  }
}

export function swapStatusTone(status: DutySwapStatus): 'done' | 'error' | 'neutral' {
  if (status === 'AGREED') return 'done';
  if (status === 'REJECTED') return 'error';
  // EXPIRED는 거절이 아니다. 빨강으로 칠하지 않는다.
  return 'neutral';
}

/**
 * 경비교대 슬롯.
 *
 * **코드를 말로 바꾸는 표는 `@hr/format` 에 있다** — 관리팀과 같은 값을 다르게 말하면
 * 안 된다. 여기서 하는 것은 **빈 값 처리**뿐이다. 슬롯이 없으면 줄을 아예 안 그린다
 * (관리팀 표는 같은 자리에 `—` 를 그린다 — 자리의 성질이 달라서다).
 */
export function slotLabel(slotCode: string | null): string | null {
  return slotCode === null ? null : slotName(slotCode);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * `8.29 (토)` — 당직은 무슨 요일인지가 중요하다.
 *
 * 요일은 날짜에서 뽑는다. `DutyScheduleResponse.dayOfWeek`도 있지만 어떤 형태로 오는지
 * (`SATURDAY`인지 `토`인지) 확인하지 못했다 — 개발 서버에 배정이 한 건도 없다.
 * 확인되면 서버 값을 쓰도록 바꾼다.
 */
export function dutyDateText(dutyDate: string): string {
  // date-fns의 `i`는 월요일이 1, 일요일이 7이다. 일요일부터 시작하는 배열에 맞춰 나머지를 쓴다.
  const index = Number(formatServerDate(dutyDate, 'i')) % 7;
  return `${formatServerDate(dutyDate, 'M.d')} (${WEEKDAYS[index]})`;
}

/** `경비교대 중식` — 명단 이름에 슬롯이 있으면 붙인다 */
export function rosterText(rosterName: string | null, slotCode: string | null): string {
  const slot = slotLabel(slotCode);
  const name = rosterName ?? '당직';
  return slot === null ? name : `${name} ${slot}`;
}

/** 일정 한 줄의 제목. `8.29 (토) · 경비교대 중식` */
export function scheduleTitle(schedule: DutySchedule): string {
  return `${dutyDateText(schedule.dutyDate)} · ${rosterText(schedule.rosterName, schedule.slotCode)}`;
}

/**
 * `08:00 ~ 17:00` — 서버가 주는 시각은 `08:00:00` 형태의 시각 문자열이다.
 * 날짜가 없어 타임존을 따질 것이 없고, 초는 화면에 쓰지 않아 잘라낸다.
 * 한쪽만 있으면 범위가 아니므로 그리지 않는다.
 */
export function timeRangeText(startTime: string | null, endTime: string | null): string | null {
  if (startTime === null || endTime === null) return null;
  return `${startTime.slice(0, 5)} ~ ${endTime.slice(0, 5)}`;
}

/** 교체 요청 한 줄의 제목. 일정과 같은 형태로 읽히게 맞춘다 */
export function swapTitle(swap: DutySwap): string {
  return `${dutyDateText(swap.dutyDate)} · ${rosterText(swap.rosterName, swap.slotCode)}`;
}
