import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { isCompleteTime, toServerTime } from '@/lib/time';
import type { LeaveTypeChoice } from './LeaveTypeSection';
import { halfDayTimes } from './halfDay';

/**
 * S-301에서 신청서 한 장이 갖춰졌는지 보는 부분.
 *
 * **화면에서 떼어 냈다.** 달력을 누를 때 기간이 어떻게 접히는지, 어떤 종류가 시각을
 * 요구하는지, 아직 무엇이 비었는지 — 셋 다 눈으로만 확인하기에는 갈래가 많다.
 * 여기 모아 두고 테스트로 못 박는다.
 *
 * **여기서 며칠이 깎이는지 세지 않는다.** 주말·공휴일·잔여 초과는 전부 서버가 판정한다
 * (`CLAUDE.md` 3장). 이 파일이 아는 것은 **아직 안 채운 칸**까지다.
 */

/** 고른 기간. `yyyy-MM-dd` */
export interface DateRange {
  start?: string;
  end?: string;
}

/**
 * 달력에서 하루를 눌렀을 때의 다음 기간.
 *
 * 시작일이 없거나 이미 기간이 잡혔으면 새로 시작하고, 시작일보다 앞을 누르면
 * 그 날이 새 시작일이 된다 — 거꾸로 잡힌 기간을 만들지 않는다.
 */
export function nextRange(prev: DateRange, iso: string): DateRange {
  if (!prev.start || prev.end) return { start: iso };
  if (iso < prev.start) return { start: iso };
  return { start: prev.start, end: iso };
}

/** 시작일~종료일 사이를 채운다. 며칠이 깎이는지는 여기서 세지 않는다 — 서버가 센다. */
export function selectedDates(range: DateRange): string[] {
  if (!range.start) return [];
  if (!range.end) return [range.start];
  return eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) }).map((date) =>
    format(date, 'yyyy-MM-dd'),
  );
}

/** 시각을 실어야 하는 종류인가. 반차든 직접 적는 것이든 시각 없이 보내지 않는다 */
export function needsTime(value: LeaveTypeChoice): boolean {
  return value.type?.halfDay === true || needsTyped(value);
}

/** 시각을 사용자가 직접 적어야 하는 종류인가. 반차는 값이 정해져 있어 여기 들지 않는다 */
function needsTyped(value: LeaveTypeChoice): boolean {
  return value.type?.needTime === true && !value.type.halfDay;
}

/**
 * 신청에 실을 시각. 필요 없는 종류면 `undefined`다.
 *
 * 직접 적는 종류인데 아직 덜 적었으면 `undefined`를 돌려준다 — 반쪽짜리 시각을
 * 보내지 않는다.
 */
export function requestTimes(
  value: LeaveTypeChoice,
): { startTime: string; endTime: string } | undefined {
  // 반차 시각은 종류 응답에 실려 온다. 안 왔으면 undefined 라 신청이 나가지 않는다.
  if (value.type?.halfDay) return halfDayTimes(value.type, value.half);
  if (!needsTyped(value)) return undefined;
  if (!isCompleteTime(value.startTime) || !isCompleteTime(value.endTime)) return undefined;
  return { startTime: toServerTime(value.startTime), endTime: toServerTime(value.endTime) };
}

/**
 * 아직 낼 수 없는 이유. 버튼은 항상 눌리므로(확정 결정) 막힌 이유를 화면이 이 문구로 적는다.
 *
 * 잔여 초과처럼 **서버가 판단하는 것은 여기서 말하지 않는다.** 화면이 아는 것,
 * 곧 아직 안 채운 칸만 짚는다. 시작이 끝보다 늦은지도 서버가 본다.
 */
export function submitHint(
  dayCount: number,
  value: LeaveTypeChoice,
  signature: string,
): string | undefined {
  if (dayCount === 0) return '달력에서 날짜를 골라주세요.';
  if (!value.type) return '무엇을 신청하는지 골라주세요.';
  if (needsTyped(value) && requestTimes(value) === undefined) {
    return '시작 시각과 종료 시각을 적어주세요.';
  }
  // 반차인데 종류 응답에 시각이 안 실려 왔다. 앱이 만들어 넣지 않으므로 낼 수 없다.
  if (value.type.halfDay && requestTimes(value) === undefined) {
    return '반차 시각을 서버에서 받지 못했어요. 관리팀에 알려주세요.';
  }
  // 마지막에 본다. 다 채우고 나서 서명하는 것이 종이와 같은 차례다.
  if (!signature) return '서명을 해주세요.';
  return undefined;
}
