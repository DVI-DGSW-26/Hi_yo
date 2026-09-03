import { describe, expect, it } from 'vitest';
import { HALF_DAY_SLOTS, halfDaySlot, halfDayText } from './halfDay';

/**
 * 반차 시각. **인사팀이 확정한 값이다** (2026-09-01).
 *
 * 서버가 주지 않아 앱이 들고 있는 값이라, 여기가 틀리면 **틀린 시각으로 신청서가 나간다.**
 * 종류 응답에 시각을 실어달라고 요청해 뒀고, 서버가 주기 시작하면 이 파일과 함께 지운다.
 */

describe('halfDaySlot — 서버로 보내는 시각', () => {
  it('오전은 09:00 ~ 13:00 이다', () => {
    expect(halfDaySlot('AM')).toEqual({
      label: '오전',
      startTime: '09:00:00',
      endTime: '13:00:00',
    });
  });

  it('오후는 13:00 ~ 18:00 이다', () => {
    expect(halfDaySlot('PM')).toEqual({
      label: '오후',
      startTime: '13:00:00',
      endTime: '18:00:00',
    });
  });

  // 서버가 돌려주는 것과 같은 `HH:mm:ss` 로 보낸다. `HH:mm` 으로 보내면 형식이 어긋난다.
  it('초까지 붙은 모양으로 보낸다', () => {
    for (const slot of HALF_DAY_SLOTS) {
      expect(halfDaySlot(slot).startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(halfDaySlot(slot).endTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }
  });

  // 점심시간이 반차에 포함돼서 오전과 오후의 길이가 다르다. 앱이 고칠 일이 아니다.
  it('오전이 끝나는 시각에서 오후가 시작한다 — 사이에 빈 시간이 없다', () => {
    expect(halfDaySlot('AM').endTime).toBe(halfDaySlot('PM').startTime);
  });
});

describe('HALF_DAY_SLOTS — 고르는 차례', () => {
  it('오전이 먼저다', () => {
    expect(HALF_DAY_SLOTS).toEqual(['AM', 'PM']);
  });
});

describe('halfDayText — 화면 표기', () => {
  it('초를 떼고 적는다', () => {
    expect(halfDayText('AM')).toBe('오전 09:00 ~ 13:00');
    expect(halfDayText('PM')).toBe('오후 13:00 ~ 18:00');
  });
});
