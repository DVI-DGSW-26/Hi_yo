import { describe, expect, it } from 'vitest';
import { HALF_DAY_SLOTS, halfDayHint, halfDayLabel, halfDayText, halfDayTimes } from './halfDay';
import type { RequestType } from './api';

/**
 * 반차 시각. **서버가 준다** (2026-09-02부터). 그전에는 앱이 값을 갖고 있었다.
 *
 * 여기서 지키는 것은 **앱이 시각을 지어내지 않는다**는 것이다. 안 실려 오면 안 온 대로
 * 두고 화면이 그 사실을 적는다 — 틀린 시각으로 신청서가 나가는 것보다 안 나가는 편이 낫다.
 *
 * (예전에는 오전 끝과 오후 시작이 맞물리는지도 봤다. 그 값을 이제 앱이 갖고 있지 않아
 * 확인할 대상이 아니다 — 서버가 정한다.)
 */

const HALF_DAY: RequestType = {
  id: 1,
  code: 'HALF_DAY',
  name: '반차',
  deductLeave: true,
  deductPay: false,
  needTime: true,
  halfDay: true,
  amStartTime: '09:00:00',
  amEndTime: '13:00:00',
  pmStartTime: '13:00:00',
  pmEndTime: '18:00:00',
};

/** 서버가 시각을 안 실어 준 경우. `halfDay`가 참인데 시각이 비어 있을 수 있다 */
const WITHOUT_TIMES: RequestType = {
  ...HALF_DAY,
  amStartTime: null,
  amEndTime: null,
  pmStartTime: null,
  pmEndTime: null,
};

describe('halfDayTimes — 서버로 보내는 시각', () => {
  it('종류에 실려 온 값을 그대로 쓴다', () => {
    expect(halfDayTimes(HALF_DAY, 'AM')).toEqual({ startTime: '09:00:00', endTime: '13:00:00' });
    expect(halfDayTimes(HALF_DAY, 'PM')).toEqual({ startTime: '13:00:00', endTime: '18:00:00' });
  });

  // 앱이 시각을 만들어 넣으면 틀린 시각으로 신청서가 나간다. 그게 가장 나쁜 결과다.
  it('시각이 안 왔으면 만들어 내지 않는다', () => {
    expect(halfDayTimes(WITHOUT_TIMES, 'AM')).toBeUndefined();
    expect(halfDayTimes(WITHOUT_TIMES, 'PM')).toBeUndefined();
    expect(halfDayTimes(undefined, 'AM')).toBeUndefined();
  });

  // 서버가 돌려주는 것과 같은 `HH:mm:ss` 로 보낸다. `HH:mm` 으로 보내면 형식이 어긋난다.
  it('초까지 붙은 모양 그대로 보낸다', () => {
    for (const slot of HALF_DAY_SLOTS) {
      const times = halfDayTimes(HALF_DAY, slot);
      expect(times?.startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(times?.endTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }
  });
});

describe('HALF_DAY_SLOTS — 고르는 차례', () => {
  it('오전이 먼저다', () => {
    expect(HALF_DAY_SLOTS).toEqual(['AM', 'PM']);
  });
});

describe('화면 표기', () => {
  it('초를 떼고 적는다', () => {
    expect(halfDayText(HALF_DAY, 'AM')).toBe('오전 09:00 ~ 13:00');
    expect(halfDayText(HALF_DAY, 'PM')).toBe('오후 13:00 ~ 18:00');
    expect(halfDayHint(HALF_DAY, 'PM')).toBe('13:00 ~ 18:00');
  });

  // 시각이 없다고 줄이 통째로 비면 무엇을 고른 건지 알 수 없다. 이름은 남긴다.
  it('시각이 없으면 이름만 적는다', () => {
    expect(halfDayText(WITHOUT_TIMES, 'AM')).toBe('오전');
    expect(halfDayHint(WITHOUT_TIMES, 'AM')).toBeUndefined();
  });

  it('이름은 오전 · 오후다', () => {
    expect(halfDayLabel('AM')).toBe('오전');
    expect(halfDayLabel('PM')).toBe('오후');
  });
});
