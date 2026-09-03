import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as admin from '../apps/admin/src/features/attendance/labels';
import * as mobile from '../apps/mobile/src/features/attendance/labels';
import * as adminDuty from '../apps/admin/src/features/duty/labels';
import * as mobileDuty from '../apps/mobile/src/features/duty/labels';

/**
 * **두 앱이 같은 값을 다르게 말하지 않는지 지킨다.**
 *
 * 52시간 알림 단계는 서버가 `alertLevel`(정수)로 주고, 그것을 사람 말로 바꾸는 표가
 * `apps/admin`과 `apps/mobile`에 **따로** 있다. 두 파일 다 주석에 "한쪽을 고치면 다른
 * 쪽도 고친다"고 적어 뒀지만, **그것을 지키는 것이 아무것도 없었다** (2026-09-03).
 *
 * 어긋나면 같은 직원의 같은 주를 두고 관리팀 화면과 폰이 다른 말을 한다. 그 상태로
 * 「52시간 넘었다면서요」 하는 문의가 오면 어느 쪽이 맞는지 알 수가 없다.
 *
 * 공용 자리로 올릴지는 아직 정하지 않았다 (`DESIGN_RULES.md` 8장). 정해질 때까지는
 * 이 테스트가 그 자리를 대신한다. 올리고 나면 이 파일을 지운다.
 */

/**
 * **이 파일이 서 있는 전제부터 지킨다.**
 *
 * 이 프로젝트는 `@` 를 모바일로 걸어 둔다 (`vitest.config.mts`). 모바일과 관리팀이
 * 같은 이름으로 다른 곳을 가리켜서 둘을 같이 걸 수가 없기 때문이다.
 *
 * **관리팀 파일이 `@/` 를 쓰기 시작하면 조용히 모바일 파일로 풀린다.** 오류가 안 나고
 * 테스트도 통과해서, 두 앱을 비교하고 있다고 믿으면서 실은 모바일을 두 번 비교하게 된다.
 * 그래서 여기서 부르는 관리팀 파일에 `@/` 가 없는지 먼저 본다.
 */
const ADMIN_FILES = ['../apps/admin/src/features/attendance/labels.ts', '../apps/admin/src/features/duty/labels.ts'];

it.each(ADMIN_FILES)('%s 가 `@/` 를 쓰지 않는다 — 쓰면 모바일 파일로 잘못 풀린다', (path) => {
  const source = readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
  expect(source).not.toMatch(/from\s+'@\//);
});

/** 서버가 지금 주는 단계. 스키마에 넷이 정의돼 있다 */
const LEVELS = [0, 1, 2, 3];

describe('52시간 단계 문구 — 두 앱이 같아야 한다', () => {
  it.each(LEVELS)('단계 %i 의 문구가 같다', (level) => {
    expect(mobile.alertLevelText(level)).toBe(admin.alertLevelText(level));
  });

  it.each(LEVELS)('단계 %i 의 색이 같다', (level) => {
    expect(mobile.alertLevelTone(level)).toBe(admin.alertLevelTone(level));
  });

  // 문구가 같기만 하면 되는 게 아니라, 지금 값이 맞는지도 박아 둔다.
  // 여기가 바뀌면 인사팀·서버와 맞춘 문구를 누가 바꾼 것이다.
  it('지금 문구는 이것이다', () => {
    expect(LEVELS.map(mobile.alertLevelText)).toEqual([
      '여유 있어요',
      '48시간을 넘겼어요',
      '52시간이 코앞이에요',
      '52시간을 넘겼어요',
    ]);
  });

  // 색은 셋뿐이라(`DESIGN_SYSTEM.md` 5장) 경고(2)와 초과(3)가 같은 빨강이다.
  // 구분은 문구가 한다. 넘긴 것과 넘길 것 둘 다 지금 손대야 하는 줄이다.
  it('2단계부터 빨강이고 그 아래는 무채색이다', () => {
    expect(LEVELS.map(mobile.alertLevelTone)).toEqual(['neutral', 'neutral', 'error', 'error']);
  });
});

describe('모르는 단계 — 서버가 늘려도 지어내지 않는다', () => {
  it.each([4, 9, -1])('단계 %i 를 숫자 그대로 보여준다', (level) => {
    expect(mobile.alertLevelText(level)).toBe(`단계 ${level}`);
    expect(admin.alertLevelText(level)).toBe(`단계 ${level}`);
  });

  // 모르는 단계를 안전한 쪽(빨강)으로 두는지도 양쪽이 같아야 한다.
  it('모르는 단계의 색도 두 앱이 같다', () => {
    for (const level of [4, 9, -1]) {
      expect(mobile.alertLevelTone(level)).toBe(admin.alertLevelTone(level));
    }
  });
});

/**
 * 경비교대 슬롯 코드도 두 앱에 표가 따로 있다.
 *
 * 이름과 빈 값 처리는 일부러 다르다 — 관리팀은 표 칸이라 `—`를 그려야 하고
 * (`slotText`), 모바일은 줄을 아예 안 그린다 (`slotLabel`). **코드를 사람 말로
 * 바꾸는 부분만** 같아야 한다. 서버가 슬롯을 늘렸을 때 한쪽만 고치면 어긋난다.
 */
describe('경비교대 슬롯 문구 — 두 앱이 같아야 한다', () => {
  const CODES = ['LUNCH', 'DINNER'];

  it.each(CODES)('%s 를 같은 말로 바꾼다', (code) => {
    expect(mobileDuty.slotLabel(code)).toBe(adminDuty.slotText(code));
  });

  it('지금 문구는 이것이다', () => {
    expect(CODES.map((code) => mobileDuty.slotLabel(code))).toEqual(['중식', '석식']);
  });

  // 모르는 코드는 서버가 준 값을 그대로 둔다 — 양쪽 다 지어내지 않아야 한다.
  it.each(['SUPPER', 'NIGHT'])('모르는 코드 %s 를 양쪽 다 그대로 둔다', (code) => {
    expect(mobileDuty.slotLabel(code)).toBe(code);
    expect(adminDuty.slotText(code)).toBe(code);
  });

  // 여기만 일부러 다르다. 다르다는 것 자체를 박아 둬야 나중에 "버그인가?" 하지 않는다.
  it('빈 값 처리는 일부러 다르다 — 관리팀은 표 칸이라 자리를 남긴다', () => {
    expect(mobileDuty.slotLabel(null)).toBeNull();
    expect(adminDuty.slotText(null)).toBe('—');
  });
});

/**
 * `timeRangeText`는 두 앱에 **같은 이름으로** 있고 시각을 자르는 규칙도 같다.
 * 빈 값 처리만 위와 같은 이유로 다르다.
 */
describe('당직 시각 범위 — 자르는 규칙이 같아야 한다', () => {
  it('초를 떼는 방식이 같다', () => {
    expect(mobileDuty.timeRangeText('08:00:00', '17:00:00')).toBe(
      adminDuty.timeRangeText('08:00:00', '17:00:00'),
    );
    expect(mobileDuty.timeRangeText('08:00:00', '17:00:00')).toBe('08:00 ~ 17:00');
  });

  it('한쪽만 있을 때의 처리는 일부러 다르다', () => {
    expect(mobileDuty.timeRangeText('08:00:00', null)).toBeNull();
    expect(adminDuty.timeRangeText('08:00:00', null)).toBe('—');
  });
});
