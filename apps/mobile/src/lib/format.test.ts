import { describe, expect, it } from 'vitest';
import { formatInKst, formatServerDate, formatServerDateTime, formatTime } from './format';

/**
 * 모바일의 날짜·시각. **KST 고정이다.**
 *
 * 테스트는 `America/New_York`에서 돈다 (`vitest.config.mts`). 폰은 사용자가 들고
 * 해외로 나가는 기기라, 기기 타임존을 따라가면 출장 중에 근태가 어긋난다.
 */

it('테스트가 서울 밖 타임존에서 돈다 — 이 전제가 깨지면 아래가 전부 무의미하다', () => {
  expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).not.toBe('Asia/Seoul');
});

describe('formatTime — 서버 일시에서 시각만', () => {
  it('UTC 를 서울 시각으로 옮긴다', () => {
    expect(formatTime('2026-08-24T08:52:00Z')).toBe('17:52');
  });

  // 서울이 UTC 보다 앞서므로 UTC 늦은 밤이 서울에서는 다음 날 아침이다.
  it('날짜 경계를 넘겨도 맞는다', () => {
    expect(formatTime('2026-08-23T23:52:00Z')).toBe('08:52');
  });

  it('기기 타임존을 따라가지 않는다', () => {
    // 뉴욕이면 04:52 가 된다.
    expect(formatTime('2026-08-24T08:52:00Z')).not.toBe('04:52');
  });
});

describe('formatInKst — 기반 함수', () => {
  it('패턴을 그대로 따른다', () => {
    expect(formatInKst('2026-08-24T08:52:00Z', 'yyyy-MM-dd')).toBe('2026-08-24');
    expect(formatInKst('2026-08-24T08:52:00Z', 'HH:mm')).toBe('17:52');
  });

  // 값을 메시지에 넣지 않는다 — 크래시 리포트에 남는다.
  it('ISO 8601 이 아니면 던진다', () => {
    expect(() => formatInKst('아무거나', 'HH:mm')).toThrow(/ISO 8601/);
  });
});

describe('formatServerDateTime — 오프셋이 안 붙어 오는 값', () => {
  // 서버는 한국 시간으로 도는데 오프셋을 안 붙이는 응답이 있다 (API_신청결재.md 1장).
  // `new Date('2026-08-29T11:52:32')` 는 그것을 기기 타임존으로 읽는다.
  it('오프셋이 없으면 한국 시간으로 읽는다', () => {
    expect(formatServerDateTime('2026-08-29T11:52:32', 'HH:mm')).toBe('11:52');
  });

  it('오프셋이 이미 있으면 건드리지 않는다', () => {
    expect(formatServerDateTime('2026-08-29T02:52:32Z', 'HH:mm')).toBe('11:52');
    expect(formatServerDateTime('2026-08-29T11:52:32+09:00', 'HH:mm')).toBe('11:52');
  });

  // 날짜부의 `-` 를 오프셋으로 잘못 읽으면 여기서 갈린다.
  it('날짜부의 하이픈을 오프셋으로 착각하지 않는다', () => {
    expect(formatServerDateTime('2026-08-29T11:52:32', 'yyyy-MM-dd')).toBe('2026-08-29');
  });

  it('음수 오프셋도 오프셋으로 본다', () => {
    // 뉴욕 시각으로 온 값. 서울로 옮기면 다음 날 아침이다.
    expect(formatServerDateTime('2026-08-29T20:00:00-04:00', 'yyyy-MM-dd HH:mm')).toBe(
      '2026-08-30 09:00',
    );
  });
});

describe('formatServerDate — 날짜만 오는 값', () => {
  it('yyyy-MM-dd 를 그 날짜 그대로 읽는다', () => {
    expect(formatServerDate('2026-08-29', 'M.d')).toBe('8.29');
  });

  // `new Date('2026-08-29')` 는 UTC 자정이라 서울 밖에서는 하루가 밀린다.
  it('기기 타임존 때문에 하루가 밀리지 않는다', () => {
    expect(formatServerDate('2026-08-29', 'yyyy-MM-dd')).toBe('2026-08-29');
    expect(formatServerDate('2026-01-01', 'yyyy-MM-dd')).toBe('2026-01-01');
  });
});
