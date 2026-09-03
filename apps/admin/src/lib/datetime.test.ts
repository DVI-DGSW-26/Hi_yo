import { describe, expect, it } from 'vitest';
import {
  addMonth,
  currentMonth,
  currentYear,
  dateRangeText,
  formatKstClock,
  formatKstDateTime,
  isInMonth,
  monthGridDates,
  monthRange,
  monthTitle,
  shortDate,
  todayInKst,
  weekdayText,
} from './datetime';

/**
 * **이 파일의 요점은 KST 고정이다.**
 *
 * 테스트는 `America/New_York`에서 돈다 (`vitest.config.mts`). 한국 기기에서만 돌리면
 * "기기 타임존을 따라간다"는 버그가 전부 통과해 버린다 — 해외 출장 중에 근태가
 * 어긋나는 것이 정확히 그 버그다 (`CLAUDE.md` 5장).
 */

it('테스트가 서울 밖 타임존에서 돈다 — 이 전제가 깨지면 아래가 전부 무의미하다', () => {
  expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).not.toBe('Asia/Seoul');
});

describe('todayInKst · currentYear · currentMonth', () => {
  it('yyyy-MM-dd 모양이다', () => {
    expect(todayInKst()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // 뉴욕이 서울보다 13~14시간 늦다. 뉴욕 기준 날짜를 쓰면 하루가 밀린다.
  it('기기 타임존이 아니라 서울 날짜를 준다', () => {
    const seoul = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    expect(todayInKst()).toBe(seoul);
  });

  it('연·월이 그 날짜에서 나온다', () => {
    const today = todayInKst();
    expect(currentYear()).toBe(Number(today.slice(0, 4)));
    expect(currentMonth()).toBe(today.slice(0, 7));
  });
});

describe('monthRange — 그 달의 첫날과 마지막 날', () => {
  it('31일까지 있는 달', () => {
    expect(monthRange('2026-08-15')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('30일까지 있는 달', () => {
    expect(monthRange('2026-09-03')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('2월은 28일이다', () => {
    expect(monthRange('2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('윤년 2월은 29일이다', () => {
    expect(monthRange('2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('모양이 아닌 값이 오면 그대로 돌려준다 — 날짜를 지어내지 않는다', () => {
    expect(monthRange('아무거나')).toEqual({ from: '아무거나', to: '아무거나' });
  });
});

describe('addMonth — 달 넘기기', () => {
  it('연초에서 뒤로 가면 지난 해로 넘어간다', () => {
    expect(addMonth('2026-01', -1)).toBe('2025-12');
  });

  it('연말에서 앞으로 가면 다음 해로 넘어간다', () => {
    expect(addMonth('2026-12', 1)).toBe('2027-01');
  });

  // 1월 31일 기준으로 세면 2월이 3월로 새는 고전적인 버그. 1일 고정이라 안 샌다.
  it('31일이 있는 달에서 하루가 새지 않는다', () => {
    expect(addMonth('2026-01', 1)).toBe('2026-02');
    expect(addMonth('2026-03', -1)).toBe('2026-02');
  });

  it('여러 달을 한 번에 옮긴다', () => {
    expect(addMonth('2026-09', 5)).toBe('2027-02');
    expect(addMonth('2026-02', -14)).toBe('2024-12');
  });

  it('0을 넣으면 그대로다', () => {
    expect(addMonth('2026-09', 0)).toBe('2026-09');
  });

  it('모양이 아닌 값이 오면 그대로 돌려준다', () => {
    expect(addMonth('아무거나', 1)).toBe('아무거나');
  });
});

describe('monthTitle · shortDate · dateRangeText', () => {
  it('달 제목에서 앞의 0을 뗀다', () => {
    expect(monthTitle('2026-09')).toBe('2026년 9월');
    expect(monthTitle('2026-12')).toBe('2026년 12월');
  });

  it('짧은 날짜에서도 앞의 0을 뗀다', () => {
    expect(shortDate('2026-08-24')).toBe('8.24');
    expect(shortDate('2026-01-05')).toBe('1.5');
  });

  it('기간은 물결로 잇는다', () => {
    expect(dateRangeText('2026-08-24', '2026-08-30')).toBe('8.24 ~ 8.30');
  });

  it('모양이 아니면 그대로 돌려준다', () => {
    expect(shortDate('아무거나')).toBe('아무거나');
    expect(monthTitle('아무거나')).toBe('아무거나');
  });
});

describe('weekdayText — 요일', () => {
  // `new Date('2026-08-29')`는 UTC 자정으로 읽혀 뉴욕에서 하루 앞 요일이 나온다.
  // Date.UTC 로 세기 때문에 그 함정에 안 빠진다.
  it('날짜 문자열의 요일을 기기 타임존과 무관하게 준다', () => {
    expect(weekdayText('2026-08-29')).toBe('토');
    expect(weekdayText('2026-08-30')).toBe('일');
    expect(weekdayText('2026-09-03')).toBe('목');
  });

  it('연·월이 바뀌는 경계에서도 맞는다', () => {
    expect(weekdayText('2026-01-01')).toBe('목');
    expect(weekdayText('2025-12-31')).toBe('수');
  });

  it('모양이 아니면 자리만 남긴다', () => {
    expect(weekdayText('아무거나')).toBe('—');
  });
});

describe('monthGridDates — 달력 격자', () => {
  it('일요일로 시작한다', () => {
    const dates = monthGridDates('2026-09');
    expect(weekdayText(dates[0]!)).toBe('일');
  });

  it('주 단위로 떨어진다', () => {
    expect(monthGridDates('2026-09').length % 7).toBe(0);
  });

  // 항상 6주로 고정하면 5주짜리 달에 빈 줄이 남는다. 덮는 만큼만 준다.
  it('그 달을 덮는 만큼만 준다', () => {
    // 2026-02는 1일이 일요일이고 28일이라 딱 4주다.
    expect(monthGridDates('2026-02')).toHaveLength(28);
    expect(monthGridDates('2026-09')).toHaveLength(35);
  });

  it('그 달의 모든 날을 담는다', () => {
    const dates = monthGridDates('2026-09');
    expect(dates).toContain('2026-09-01');
    expect(dates).toContain('2026-09-30');
    expect(dates.filter((date) => isInMonth(date, '2026-09'))).toHaveLength(30);
  });

  it('앞뒤로 붙은 다른 달 날짜가 이어진다 — 격자에 구멍이 없다', () => {
    const dates = monthGridDates('2026-09');
    expect(dates[0]).toBe('2026-08-30');
    expect(dates.at(-1)).toBe('2026-10-03');
  });

  it('모양이 아니면 빈 격자를 준다', () => {
    expect(monthGridDates('아무거나')).toEqual([]);
  });
});

describe('isInMonth', () => {
  it('같은 달만 참이다', () => {
    expect(isInMonth('2026-09-30', '2026-09')).toBe(true);
    expect(isInMonth('2026-10-01', '2026-09')).toBe(false);
  });

  // `2026-09`가 `2026-9`를 삼키거나 하면 안 된다.
  it('앞자리만 같은 달을 삼키지 않는다', () => {
    expect(isInMonth('2026-09-01', '2026-0')).toBe(false);
  });
});

describe('formatKstDateTime — 서버 일시', () => {
  // 서버는 한국 시간으로 도는데 오프셋을 안 붙이는 응답이 있다 (API_신청결재.md 1장).
  it('오프셋이 없으면 한국 시간으로 읽는다', () => {
    expect(formatKstDateTime('2026-08-29T11:52:32')).toBe('8.29 11:52');
  });

  it('오프셋이 있으면 그대로 두고 서울로 옮긴다', () => {
    expect(formatKstDateTime('2026-08-29T02:52:32Z')).toBe('8.29 11:52');
    expect(formatKstDateTime('2026-08-29T11:52:32+09:00')).toBe('8.29 11:52');
  });

  // 뉴욕에서 읽으면 8.28 이 된다. 여기서 갈리면 기기 타임존을 탄 것이다.
  it('기기 타임존을 따라가지 않는다', () => {
    expect(formatKstDateTime('2026-08-29T00:30:00Z')).toBe('8.29 09:30');
  });

  it('읽을 수 없으면 자리만 남긴다', () => {
    expect(formatKstDateTime('아무거나')).toBe('—');
  });
});

describe('formatKstClock — 시각만, 자정 넘긴 퇴근에 +1', () => {
  it('시각만 뽑는다', () => {
    expect(formatKstClock('2026-08-29T09:02:00')).toBe('09:02');
  });

  it('근무일과 같은 날이면 그냥 시각이다', () => {
    expect(formatKstClock('2026-08-29T18:03:00', '2026-08-29')).toBe('18:03');
  });

  // 야간근무는 출근일 다음 날 퇴근한다. `01:30`만 적으면 새벽 출근으로 읽힌다.
  it('근무일보다 뒤면 +1을 붙인다', () => {
    expect(formatKstClock('2026-08-30T01:30:00', '2026-08-29')).toBe('01:30 +1');
  });

  it('근무일을 안 주면 +1을 붙이지 않는다', () => {
    expect(formatKstClock('2026-08-30T01:30:00')).toBe('01:30');
  });

  // 며칠이 밀렸는지는 세지 않는다 — 하루를 넘는 퇴근이 무엇인지 문서에 없다.
  it('이틀 뒤여도 +1이다', () => {
    expect(formatKstClock('2026-08-31T01:30:00', '2026-08-29')).toBe('01:30 +1');
  });

  it('날짜 비교도 서울 기준이다', () => {
    // UTC 로는 8.29 인 시각이 서울에서는 8.30 이다. 서울 기준이라 +1 이 붙는다.
    expect(formatKstClock('2026-08-29T16:30:00Z', '2026-08-29')).toBe('01:30 +1');
  });

  it('읽을 수 없으면 자리만 남긴다', () => {
    expect(formatKstClock('아무거나', '2026-08-29')).toBe('—');
  });
});
