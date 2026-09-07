import { describe, expect, it } from 'vitest';
import { countPickedDays, cycleDay, dayLabel, sortedDates, toPlannedDays } from './planDays';

/**
 * 연차사용계획서에서 고른 날.
 *
 * **여기가 틀리면 직원이 엉뚱한 날에 쉰다.** 서버는 `date`와 `days`를 그대로 받아
 * 계획서로 남기고, 그 종이가 나중에 증빙이 된다. 값이 `1`·`0.5`가 아니면 422다
 * (`PlannedDay` 스키마 — 연차 단위가 하루와 반차뿐이다, ADR 0002).
 */

describe('cycleDay — 연차 → 반차 → 빼기', () => {
  it('처음 누르면 연차다', () => {
    expect(cycleDay({}, '2026-09-10')).toEqual({ '2026-09-10': 'FULL' });
  });

  it('한 번 더 누르면 반차다', () => {
    expect(cycleDay({ '2026-09-10': 'FULL' }, '2026-09-10')).toEqual({ '2026-09-10': 'HALF' });
  });

  it('또 누르면 빠진다', () => {
    expect(cycleDay({ '2026-09-10': 'HALF' }, '2026-09-10')).toEqual({});
  });

  it('다른 날은 건드리지 않는다', () => {
    expect(cycleDay({ '2026-09-10': 'FULL' }, '2026-09-11')).toEqual({
      '2026-09-10': 'FULL',
      '2026-09-11': 'FULL',
    });
  });

  it('원본을 고치지 않는다', () => {
    const picked = { '2026-09-10': 'FULL' } as const;
    cycleDay(picked, '2026-09-10');
    expect(picked).toEqual({ '2026-09-10': 'FULL' });
  });
});

describe('toPlannedDays — 서버에 보낼 모양', () => {
  /*
   * **하루씩 넣는다.** 기간으로 묶지 않는다 — 서버가 `days` 배열의 항목마다
   * 근무일인지 보고 판정한다.
   */
  it('연차는 1, 반차는 0.5다', () => {
    expect(toPlannedDays({ '2026-09-10': 'FULL', '2026-09-11': 'HALF' })).toEqual([
      { date: '2026-09-10', days: 1 },
      { date: '2026-09-11', days: 0.5 },
    ]);
  });

  it('날짜순으로 보낸다', () => {
    expect(
      toPlannedDays({ '2026-09-11': 'FULL', '2026-09-09': 'FULL', '2026-09-10': 'FULL' }).map(
        (day) => day.date,
      ),
    ).toEqual(['2026-09-09', '2026-09-10', '2026-09-11']);
  });

  it('고른 날이 없으면 빈 배열이다', () => {
    expect(toPlannedDays({})).toEqual([]);
  });
});

describe('countPickedDays — 아직 안 낸 동안만 쓰는 합계', () => {
  /*
   * **낸 뒤에는 서버가 센 `plannedDays`를 쓴다** (`CLAUDE.md` 3장 — 계산은 서버가 한다).
   * 이 값은 고르는 중에 화면에 적어 주려는 것뿐이다.
   */
  it('반차를 0.5로 센다', () => {
    expect(countPickedDays({ '2026-09-10': 'FULL', '2026-09-11': 'HALF' })).toBe(1.5);
  });

  it('반차만 둘이면 1이다', () => {
    expect(countPickedDays({ '2026-09-10': 'HALF', '2026-09-11': 'HALF' })).toBe(1);
  });

  it('없으면 0이다', () => {
    expect(countPickedDays({})).toBe(0);
  });
});

describe('sortedDates', () => {
  it('날짜순이다', () => {
    expect(sortedDates({ '2026-10-01': 'FULL', '2026-09-30': 'HALF' })).toEqual([
      '2026-09-30',
      '2026-10-01',
    ]);
  });
});

describe('dayLabel', () => {
  it('요일까지 적는다', () => {
    // 2026-09-10 은 목요일이다
    expect(dayLabel('2026-09-10')).toBe('9월 10일 (목)');
  });

  it('일요일도 맞다', () => {
    // 2026-09-13 은 일요일이다
    expect(dayLabel('2026-09-13')).toBe('9월 13일 (일)');
  });
});
