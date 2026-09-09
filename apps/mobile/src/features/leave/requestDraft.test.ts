import { describe, expect, it } from 'vitest';
import { needsTime, nextRange, requestTimes, selectedDates, submitHint } from './requestDraft';
import type { LeaveTypeChoice } from './LeaveTypeSection';
import type { RequestType } from './api';

/**
 * S-301 신청서가 갖춰졌는지 보는 부분.
 *
 * **여기가 틀리면 신청서가 조용히 안 나가거나, 엉뚱한 날짜·시각으로 나간다.** 둘 다
 * 직원이 알아채기 어려운 사고다 — 버튼은 항상 눌리기로 확정돼 있어서(2026-08-24)
 * 막힌 이유를 문구가 대신 말해야 한다.
 *
 * **며칠이 깎이는지는 여기서 확인하지 않는다.** 서버가 센다 (`CLAUDE.md` 3장).
 */

const ANNUAL: RequestType = {
  id: 1,
  code: 'ANNUAL',
  name: '연차휴가',
  deductLeave: true,
  deductPay: false,
  needTime: false,
  halfDay: false,
  amStartTime: null,
  amEndTime: null,
  pmStartTime: null,
  pmEndTime: null,
};

const HALF_DAY: RequestType = {
  ...ANNUAL,
  id: 2,
  code: 'HALF_DAY',
  name: '반차',
  needTime: true,
  halfDay: true,
  amStartTime: '09:00:00',
  amEndTime: '13:00:00',
  pmStartTime: '13:00:00',
  pmEndTime: '18:00:00',
};

/** 반차인데 서버가 시각을 안 실어 준 경우 */
const HALF_DAY_WITHOUT_TIMES: RequestType = {
  ...HALF_DAY,
  amStartTime: null,
  amEndTime: null,
  pmStartTime: null,
  pmEndTime: null,
};

/** 외출·조퇴 — 시각을 사용자가 직접 적는다 */
const EARLY_LEAVE: RequestType = {
  ...ANNUAL,
  id: 3,
  code: 'EARLY_LEAVE',
  name: '조퇴',
  needTime: true,
  halfDay: false,
};

function choice(over: Partial<LeaveTypeChoice> = {}): LeaveTypeChoice {
  return { half: 'AM', startTime: '', endTime: '', ...over };
}

describe('nextRange — 달력을 누를 때', () => {
  it('처음 누르면 시작일이 된다', () => {
    expect(nextRange({}, '2026-09-10')).toEqual({ start: '2026-09-10' });
  });

  it('뒤를 누르면 기간이 잡힌다', () => {
    expect(nextRange({ start: '2026-09-10' }, '2026-09-14')).toEqual({
      start: '2026-09-10',
      end: '2026-09-14',
    });
  });

  it('시작일보다 앞을 누르면 그 날이 새 시작일이다 — 거꾸로 잡히지 않는다', () => {
    expect(nextRange({ start: '2026-09-10' }, '2026-09-07')).toEqual({ start: '2026-09-07' });
  });

  it('기간이 이미 잡혀 있으면 새로 시작한다', () => {
    expect(nextRange({ start: '2026-09-10', end: '2026-09-14' }, '2026-09-21')).toEqual({
      start: '2026-09-21',
    });
  });

  it('같은 날을 다시 누르면 하루짜리 기간이 된다', () => {
    expect(nextRange({ start: '2026-09-10' }, '2026-09-10')).toEqual({
      start: '2026-09-10',
      end: '2026-09-10',
    });
  });
});

describe('selectedDates — 고른 날 채우기', () => {
  it('아무것도 안 골랐으면 비어 있다', () => {
    expect(selectedDates({})).toEqual([]);
  });

  it('시작일만 골랐으면 하루다', () => {
    expect(selectedDates({ start: '2026-09-10' })).toEqual(['2026-09-10']);
  });

  it('사이를 다 채운다 — 주말도 뺀 채로 두지 않는다. 거르는 것은 서버다', () => {
    expect(selectedDates({ start: '2026-09-11', end: '2026-09-14' })).toEqual([
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
    ]);
  });

  it('달을 넘겨도 이어진다', () => {
    expect(selectedDates({ start: '2026-09-30', end: '2026-10-01' })).toEqual([
      '2026-09-30',
      '2026-10-01',
    ]);
  });
});

describe('requestTimes — 신청에 실을 시각', () => {
  it('연차는 시각을 싣지 않는다', () => {
    expect(requestTimes(choice({ type: ANNUAL }))).toBeUndefined();
  });

  it('반차는 종류 응답에 실려 온 시각을 그대로 쓴다', () => {
    expect(requestTimes(choice({ type: HALF_DAY, half: 'AM' }))).toEqual({
      startTime: '09:00:00',
      endTime: '13:00:00',
    });
    expect(requestTimes(choice({ type: HALF_DAY, half: 'PM' }))).toEqual({
      startTime: '13:00:00',
      endTime: '18:00:00',
    });
  });

  it('반차 시각이 안 실려 왔으면 만들어 넣지 않는다', () => {
    expect(requestTimes(choice({ type: HALF_DAY_WITHOUT_TIMES }))).toBeUndefined();
  });

  it('직접 적는 종류는 다 적어야 나간다 — 반쪽짜리는 보내지 않는다', () => {
    expect(
      requestTimes(choice({ type: EARLY_LEAVE, startTime: '14:00', endTime: '' })),
    ).toBeUndefined();
    expect(
      requestTimes(choice({ type: EARLY_LEAVE, startTime: '14:00', endTime: '17:30' })),
    ).toEqual({ startTime: '14:00:00', endTime: '17:30:00' });
  });
});

describe('needsTime — 시각을 실어야 하는 종류인가', () => {
  it('연차는 아니다', () => {
    expect(needsTime(choice({ type: ANNUAL }))).toBe(false);
  });

  it('반차와 직접 적는 종류는 그렇다', () => {
    expect(needsTime(choice({ type: HALF_DAY }))).toBe(true);
    expect(needsTime(choice({ type: EARLY_LEAVE }))).toBe(true);
  });
});

describe('submitHint — 아직 낼 수 없는 이유', () => {
  it('날짜부터 짚는다', () => {
    expect(submitHint(0, choice({ type: ANNUAL }), 'sig')).toBe('달력에서 날짜를 골라주세요.');
  });

  it('종류를 안 골랐으면 그것을 짚는다', () => {
    expect(submitHint(1, choice(), 'sig')).toBe('무엇을 신청하는지 골라주세요.');
  });

  it('직접 적는 종류인데 덜 적었으면 시각을 짚는다', () => {
    expect(submitHint(1, choice({ type: EARLY_LEAVE, startTime: '14:00' }), 'sig')).toBe(
      '시작 시각과 종료 시각을 적어주세요.',
    );
  });

  it('반차 시각이 안 왔으면 관리팀에 알리라고 한다 — 사용자가 채울 수 있는 칸이 아니다', () => {
    expect(submitHint(1, choice({ type: HALF_DAY_WITHOUT_TIMES }), 'sig')).toBe(
      '반차 시각을 서버에서 받지 못했어요. 관리팀에 알려주세요.',
    );
  });

  it('서명은 마지막에 짚는다 — 다 채우고 나서 서명하는 것이 종이와 같은 차례다', () => {
    expect(submitHint(1, choice({ type: ANNUAL }), '')).toBe('서명을 해주세요.');
  });

  it('다 채웠으면 아무 말도 하지 않는다', () => {
    expect(submitHint(1, choice({ type: ANNUAL }), 'sig')).toBeUndefined();
    expect(
      submitHint(1, choice({ type: HALF_DAY }), 'sig'),
    ).toBeUndefined();
  });

  it('잔여 초과는 여기서 말하지 않는다 — 서버가 판정한다', () => {
    expect(submitHint(365, choice({ type: ANNUAL }), 'sig')).toBeUndefined();
  });
});
