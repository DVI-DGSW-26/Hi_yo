import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatLeaveDays,
  formatMinutes,
  formatRatePercent,
  formatTargetYm,
} from './index';

/**
 * 화면에 나가는 숫자는 전부 여기를 지난다. 두 앱이 같이 쓰는 자리라
 * 여기가 틀리면 같은 급여를 모바일과 관리팀이 다르게 그린다.
 */

describe('formatMinutes — 근무시간', () => {
  it('시간과 분으로 나눈다', () => {
    expect(formatMinutes(500)).toBe('8시간 20분');
  });

  it('분이 0이면 시간만 적는다', () => {
    expect(formatMinutes(480)).toBe('8시간');
  });

  it('한 시간이 안 되면 분만 적는다', () => {
    expect(formatMinutes(20)).toBe('20분');
    expect(formatMinutes(0)).toBe('0분');
  });

  // `8.33시간` 같은 소수 표기를 쓰지 않는다 (CLAUDE.md 5장).
  it('소수 표기를 쓰지 않는다', () => {
    expect(formatMinutes(500)).not.toContain('.');
    expect(formatMinutes(499)).toBe('8시간 19분');
  });

  // 지각·조퇴 보정처럼 음수가 올 수 있다. 부호가 앞에 하나만 붙어야 한다.
  it('음수는 부호를 앞에 하나만 붙인다', () => {
    expect(formatMinutes(-500)).toBe('-8시간 20분');
    expect(formatMinutes(-20)).toBe('-20분');
    expect(formatMinutes(-480)).toBe('-8시간');
  });

  it('하루를 넘겨도 시간으로만 센다 — 일 단위로 바꾸지 않는다', () => {
    expect(formatMinutes(1500)).toBe('25시간');
  });

  it('유한한 숫자가 아니면 던진다', () => {
    expect(() => formatMinutes(Number.NaN)).toThrow();
    expect(() => formatMinutes(Number.POSITIVE_INFINITY)).toThrow();
  });

  // 던지는 메시지에 값을 넣지 않는다. 크래시 리포트에 근무시간이 남으면 안 된다.
  it('오류 메시지에 값을 담지 않는다', () => {
    expect(() => formatMinutes(Number.NaN)).toThrow(/유한한 숫자가 아닌/);
  });
});

describe('formatAmount — 금액', () => {
  it('세 자리마다 콤마를 찍는다', () => {
    expect(formatAmount(3847200)).toBe('3,847,200');
    expect(formatAmount(1000)).toBe('1,000');
  });

  it('네 자리가 안 되면 콤마가 없다', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(999)).toBe('999');
  });

  it('음수는 부호 뒤부터 센다', () => {
    expect(formatAmount(-120000)).toBe('-120,000');
    expect(formatAmount(-999)).toBe('-999');
  });

  // 단위를 붙이는 자리는 화면이 정한다. 여기서 `원`을 붙이지 않는다.
  it('단위를 붙이지 않는다', () => {
    expect(formatAmount(3847200)).not.toContain('원');
  });

  // 절사는 서버를 따른다. 여기서 반올림하면 서버와 값이 갈린다.
  it('소수는 반올림하지 않고 버린다', () => {
    expect(formatAmount(1234.9)).toBe('1,234');
    expect(formatAmount(-1234.9)).toBe('-1,234');
  });

  it('억 단위도 자리가 맞는다', () => {
    expect(formatAmount(123456789)).toBe('123,456,789');
  });
});

describe('formatLeaveDays — 연차 일수', () => {
  it('반차·반반차를 소수로 적는다', () => {
    expect(formatLeaveDays(0.5)).toBe('0.5일');
    expect(formatLeaveDays(0.25)).toBe('0.25일');
  });

  it('불필요한 0을 붙이지 않는다', () => {
    expect(formatLeaveDays(1)).toBe('1일');
    expect(formatLeaveDays(15)).toBe('15일');
  });

  // 0.1 + 0.2 같은 잔여값이 화면에 새면 안 된다.
  it('부동소수 잔여값을 흘리지 않는다', () => {
    expect(formatLeaveDays(0.1 + 0.2)).toBe('0.3일');
  });

  it('잔여가 음수여도 그대로 적는다 — 여기서 0으로 보정하지 않는다', () => {
    expect(formatLeaveDays(-1.5)).toBe('-1.5일');
  });
});

describe('formatTargetYm — 급여 대상월', () => {
  it('정수를 연·월로 가른다', () => {
    expect(formatTargetYm(202608)).toBe('2026년 8월');
  });

  it('한 자리 달에 0을 남기지 않는다', () => {
    expect(formatTargetYm(202601)).toBe('2026년 1월');
  });

  it('12월이 다음 해로 새지 않는다', () => {
    expect(formatTargetYm(202612)).toBe('2026년 12월');
  });
});

describe('formatRatePercent — 요율', () => {
  // 서버가 준 퍼센트 값을 그대로 적는다. 100을 곱하면 금액이 100배가 된다.
  it('받은 값을 그대로 적는다', () => {
    expect(formatRatePercent(4.5)).toBe('4.5%');
    expect(formatRatePercent(0.9)).toBe('0.9%');
    expect(formatRatePercent(12)).toBe('12%');
  });

  it('자릿수를 임의로 맞추지 않는다', () => {
    expect(formatRatePercent(13.14)).toBe('13.14%');
    expect(formatRatePercent(3.595)).toBe('3.595%');
  });
});
