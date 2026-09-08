import { format, getDay, parseISO } from 'date-fns';
import type { PlannedDay } from './api';

/**
 * 연차사용계획서에서 고른 날을 다루는 부분.
 *
 * **화면에서 떼어 냈다.** 하루씩 넣고 반차는 `0.5`라는 규칙이 서버 스키마에 박혀 있어서
 * (`PlannedDay`) 눈으로만 확인하기에는 틀리기 쉽다. 여기 모아 두고 테스트로 못 박는다.
 *
 * **여기서 날짜를 거르지 않는다.** 주말·공휴일·중복·기한은 전부 서버가 422로 판정한다
 * (`docs/API_연차.md` 10장). 앱이 미리 막으면 서버 규칙이 바뀔 때 두 곳이 어긋난다.
 */

/** 서식의 표기. 연차는 1, 반차는 0.5다 */
export type PlanKind = 'FULL' | 'HALF';

export const HALF_DAY = 0.5;

/** 고른 날 묶음. 키는 `yyyy-MM-dd` */
export type PickedDays = Record<string, PlanKind>;

/** 한 번 누르면 연차, 두 번이면 반차, 세 번이면 뺀다 */
export function cycleDay(picked: PickedDays, iso: string): PickedDays {
  const next = { ...picked };
  if (next[iso] === undefined) next[iso] = 'FULL';
  else if (next[iso] === 'FULL') next[iso] = 'HALF';
  else delete next[iso];
  return next;
}

/** 고른 날을 날짜순으로 */
export function sortedDates(picked: PickedDays): string[] {
  return Object.keys(picked).sort();
}

/**
 * 서버에 보낼 모양으로. **하루씩 넣는다** — 기간으로 묶지 않는다.
 *
 * 합계를 내지 않는다는 것과 다르다. `plannedDays`(합계)는 서버가 세어 응답에 담아 준다.
 */
export function toPlannedDays(picked: PickedDays): PlannedDay[] {
  return sortedDates(picked).map((date) => ({
    date,
    days: picked[date] === 'HALF' ? HALF_DAY : 1,
  }));
}

/**
 * 화면에 적을 사용계획일수.
 *
 * **서버가 센 값이 있으면 그것을 쓴다.** 이 함수는 아직 내지 않아 서버 값이 없는 동안
 * 고른 것을 세어 보여주려는 것뿐이다 (`CLAUDE.md` 3장 — 계산은 서버가 한다).
 */
export function countPickedDays(picked: PickedDays): number {
  return toPlannedDays(picked).reduce((sum, day) => sum + day.days, 0);
}

/** `9월 3일 (목)`. `date-fns` 로케일을 더하지 않고 요일만 우리 배열에서 꺼낸다 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function dayLabel(iso: string): string {
  const date = parseISO(iso);
  return `${format(date, 'M월 d일')} (${WEEKDAYS[getDay(date)]})`;
}
