import { describe, expect, it } from 'vitest';
import type { DutySchedule, DutySwap } from './api';
import {
  dutyDateText,
  rosterText,
  scheduleTitle,
  slotLabel,
  swapStatusLabel,
  swapStatusTone,
  swapTitle,
  timeRangeText,
} from './labels';

/**
 * 당직 화면 세 곳(일정·받은 요청·보낸 요청)이 같이 쓰는 표기.
 *
 * 요일 계산이 들어 있어서 **KST 고정이 여기도 걸린다.** 테스트는
 * `America/New_York`에서 돈다 (`vitest.config.mts`).
 */

it('테스트가 서울 밖 타임존에서 돈다', () => {
  expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).not.toBe('Asia/Seoul');
});

describe('swapStatusLabel — 교체 상태', () => {
  it('바꾼 것과 거절한 것을 다르게 적는다', () => {
    expect(swapStatusLabel('AGREED')).toBe('바꿨어요');
    expect(swapStatusLabel('REJECTED')).toBe('거절했어요');
  });

  // 상대가 거절한 것과 그냥 못 본 것은 다르다. 못 본 것이면 다시 부탁할 수 있다.
  it('답이 없어 지난 것을 거절과 구분한다', () => {
    expect(swapStatusLabel('EXPIRED')).toBe('답이 없어 지났어요');
    expect(swapStatusLabel('EXPIRED')).not.toBe(swapStatusLabel('REJECTED'));
  });

  it('기다리는 중이 기본이다', () => {
    expect(swapStatusLabel('PENDING')).toBe('답 기다리는 중');
  });
});

describe('swapStatusTone — 교체 상태의 색', () => {
  // 교체 성립은 되돌릴 수 없는 이정표다 (`DESIGN_SYSTEM.md` 5장).
  it('성립만 그린이다', () => {
    expect(swapStatusTone('AGREED')).toBe('done');
  });

  it('거절만 빨강이다', () => {
    expect(swapStatusTone('REJECTED')).toBe('error');
  });

  // EXPIRED 는 거절이 아니다. 아무도 거절하지 않았는데 빨갛게 두면 상대를 탓하게 된다.
  it('지난 것을 빨강으로 칠하지 않는다', () => {
    expect(swapStatusTone('EXPIRED')).toBe('neutral');
    expect(swapStatusTone('PENDING')).toBe('neutral');
  });
});

describe('slotLabel — 경비교대 슬롯', () => {
  it('아는 코드는 우리말로 적는다', () => {
    expect(slotLabel('LUNCH')).toBe('중식');
    expect(slotLabel('DINNER')).toBe('석식');
  });

  // 모르는 코드를 지어내지 않는다 (`CLAUDE.md` 3장). 서버가 준 값을 그대로 둔다.
  it('모르는 코드는 그대로 둔다', () => {
    expect(slotLabel('SUPPER')).toBe('SUPPER');
  });

  it('슬롯이 없으면 없는 채로 둔다', () => {
    expect(slotLabel(null)).toBeNull();
  });
});

describe('dutyDateText — 당직은 무슨 요일인지가 중요하다', () => {
  it('날짜에 요일을 붙인다', () => {
    expect(dutyDateText('2026-08-29')).toBe('8.29 (토)');
    expect(dutyDateText('2026-08-30')).toBe('8.30 (일)');
    expect(dutyDateText('2026-09-03')).toBe('9.3 (목)');
  });

  // date-fns 의 `i` 는 월요일이 1, 일요일이 7이다. 일요일부터 시작하는 배열에
  // 맞추느라 나머지를 쓰는데, 그 환산이 일요일에서 틀리기 쉽다.
  it('일요일이 밀리지 않는다', () => {
    expect(dutyDateText('2026-08-30')).toContain('(일)');
    expect(dutyDateText('2026-09-06')).toContain('(일)');
  });

  it('요일 일곱 개가 한 주에 다 나온다', () => {
    const week = [
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ];
    expect(week.map((date) => dutyDateText(date).slice(-3))).toEqual([
      '(일)',
      '(월)',
      '(화)',
      '(수)',
      '(목)',
      '(금)',
      '(토)',
    ]);
  });

  // `new Date('2026-08-30')` 은 UTC 자정이라 뉴욕에서 하루 앞 요일이 나온다.
  it('기기 타임존 때문에 하루가 밀리지 않는다', () => {
    expect(dutyDateText('2026-01-01')).toBe('1.1 (목)');
  });
});

describe('rosterText — 명단 이름', () => {
  it('슬롯이 있으면 붙인다', () => {
    expect(rosterText('경비교대', 'LUNCH')).toBe('경비교대 중식');
  });

  it('슬롯이 없으면 이름만 적는다', () => {
    expect(rosterText('경비교대', null)).toBe('경비교대');
  });

  // 명단 이름이 안 와도 빈칸을 그리지 않는다.
  it('이름이 없으면 당직으로 둔다', () => {
    expect(rosterText(null, null)).toBe('당직');
    expect(rosterText(null, 'DINNER')).toBe('당직 석식');
  });
});

describe('timeRangeText — 시각 범위', () => {
  it('초를 떼고 적는다', () => {
    expect(timeRangeText('08:00:00', '17:00:00')).toBe('08:00 ~ 17:00');
  });

  // 한쪽만 있으면 범위가 아니다. `08:00 ~ ` 같은 반쪽을 그리지 않는다.
  it('한쪽만 있으면 그리지 않는다', () => {
    expect(timeRangeText('08:00:00', null)).toBeNull();
    expect(timeRangeText(null, '17:00:00')).toBeNull();
    expect(timeRangeText(null, null)).toBeNull();
  });
});

describe('scheduleTitle · swapTitle — 두 목록이 같은 모양으로 읽힌다', () => {
  const schedule = {
    dutyDate: '2026-08-29',
    rosterName: '경비교대',
    slotCode: 'LUNCH',
  } as DutySchedule;

  const swap = {
    dutyDate: '2026-08-29',
    rosterName: '경비교대',
    slotCode: 'LUNCH',
  } as DutySwap;

  it('일정 제목', () => {
    expect(scheduleTitle(schedule)).toBe('8.29 (토) · 경비교대 중식');
  });

  it('교체 요청 제목이 일정과 같은 모양이다', () => {
    expect(swapTitle(swap)).toBe(scheduleTitle(schedule));
  });
});
