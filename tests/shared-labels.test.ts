import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as shared from '../packages/format/src/labels';
import * as adminAttendance from '../apps/admin/src/features/attendance/labels';
import * as mobileAttendance from '../apps/mobile/src/features/attendance/labels';
import * as adminDuty from '../apps/admin/src/features/duty/labels';
import * as mobileDuty from '../apps/mobile/src/features/duty/labels';

/**
 * **두 앱이 같은 값을 다르게 말하지 않는지 지킨다.**
 *
 * 52시간 단계와 경비교대 슬롯은 원래 앱마다 표가 따로 있었다. 두 파일 다 주석에
 * 「한쪽을 고치면 다른 쪽도 고친다」고 적어 뒀지만 그것을 지키는 것이 아무것도 없었다.
 *
 * **2026-09-03에 `@hr/format` 으로 올렸다.** 이 리포에는 CI가 없어서, 아무도
 * `npm test` 를 치지 않으면 테스트도 주석과 같기 때문이다. 이제 어긋나려면 누군가
 * **표를 앱 안에 다시 만들어야** 한다 — 이 파일이 보는 것이 그것이다.
 *
 * 문구 자체가 맞는지는 `packages/format/src/labels.test.ts` 가 본다. 여기는
 * **두 앱이 여전히 그 하나를 쓰는지**만 본다.
 */

/**
 * 이 프로젝트는 `@` 를 모바일로 걸어 둔다 (`vitest.config.mts`). 모바일과 관리팀이
 * 같은 이름으로 다른 곳을 가리켜서 둘을 같이 걸 수가 없다.
 *
 * **관리팀 파일이 `@/` 를 쓰기 시작하면 조용히 모바일 파일로 풀린다.** 오류도 안 나고
 * 통과해서, 두 앱을 비교한다고 믿으면서 실은 모바일을 두 번 비교하게 된다.
 */
const ADMIN_FILES = [
  '../apps/admin/src/features/attendance/labels.ts',
  '../apps/admin/src/features/duty/labels.ts',
];

it.each(ADMIN_FILES)('%s 가 `@/` 를 쓰지 않는다 — 쓰면 모바일 파일로 잘못 풀린다', (path) => {
  const source = readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
  expect(source).not.toMatch(/from\s+'@\//);
});

describe('52시간 단계 — 두 앱이 같은 것을 쓴다', () => {
  // 같은 값이 아니라 **같은 함수**여야 한다. 어느 쪽이든 표를 다시 만들면 여기서 갈린다.
  it('두 앱이 공용 함수를 그대로 내보낸다', () => {
    expect(mobileAttendance.alertLevelText).toBe(shared.alertLevelText);
    expect(adminAttendance.alertLevelText).toBe(shared.alertLevelText);
    expect(mobileAttendance.alertLevelTone).toBe(shared.alertLevelTone);
    expect(adminAttendance.alertLevelTone).toBe(shared.alertLevelTone);
  });
});

describe('경비교대 슬롯 — 두 앱이 같은 표를 쓴다', () => {
  // 이름과 빈 값 처리는 일부러 다르다(아래). 코드를 말로 바꾸는 부분만 같아야 한다.
  it.each(['LUNCH', 'DINNER', 'SUPPER'])('%s 를 같은 말로 바꾼다', (code) => {
    expect(mobileDuty.slotLabel(code)).toBe(shared.slotName(code));
    expect(adminDuty.slotText(code)).toBe(shared.slotName(code));
  });
});

describe('일부러 다른 것 — 자리의 성질이 달라서다', () => {
  /*
   * 다르다는 것 자체를 박아 둬야 나중에 「버그인가?」 하지 않는다.
   * 관리팀은 표 칸이라 빈 칸에도 자리를 남겨야 하고, 모바일은 줄을 아예 안 그린다.
   */
  it('슬롯이 없을 때', () => {
    expect(mobileDuty.slotLabel(null)).toBeNull();
    expect(adminDuty.slotText(null)).toBe('—');
  });

  it('당직 시각이 한쪽만 있을 때', () => {
    expect(mobileDuty.timeRangeText('08:00:00', null)).toBeNull();
    expect(adminDuty.timeRangeText('08:00:00', null)).toBe('—');
  });

  it('둘 다 있을 때는 자르는 규칙이 같다', () => {
    expect(mobileDuty.timeRangeText('08:00:00', '17:00:00')).toBe(
      adminDuty.timeRangeText('08:00:00', '17:00:00'),
    );
  });
});
