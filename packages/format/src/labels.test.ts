import { describe, expect, it } from 'vitest';
import { alertLevelText, alertLevelTone, slotName } from './labels';

/**
 * 서버 코드를 사람 말로 바꾸는 표. **두 앱이 같이 쓴다.**
 *
 * 원래는 앱마다 따로 갖고 있었고 「한쪽을 고치면 다른 쪽도」라고 적어만 뒀다.
 * 2026-09-03에 여기로 올렸다 — 어긋난 뒤에 알려주는 대신 어긋날 수 없게 했다.
 * 두 앱이 여전히 이걸 쓰는지는 `tests/shared-labels.test.ts` 가 본다.
 */

describe('alertLevelText — 52시간 단계', () => {
  // 인사팀·서버와 맞춘 문구다. 여기가 바뀌면 누가 바꾼 것이다.
  it('네 단계의 문구', () => {
    expect([0, 1, 2, 3].map(alertLevelText)).toEqual([
      '여유 있어요',
      '48시간을 넘겼어요',
      '52시간이 코앞이에요',
      '52시간을 넘겼어요',
    ]);
  });

  // 서버가 새 단계를 늘릴 수 있다. 모르는 값에 말을 지어내지 않는다.
  it.each([4, 9, -1])('모르는 단계 %i 는 숫자를 그대로 보여준다', (level) => {
    expect(alertLevelText(level)).toBe(`단계 ${level}`);
  });
});

describe('alertLevelTone — 52시간 단계의 색', () => {
  /*
   * **2단계와 3단계가 같은 빨강인 것은 부족해서가 아니라 판단이다**
   * (2026-09-03 확정. `DESIGN_RULES.md` 2장 「경고 색을 만들지 않는다」).
   * 넘긴 것과 넘길 것 둘 다 지금 손대야 하는 줄이라 같은 무게로 둔다.
   */
  it('2단계부터 빨강, 그 아래는 무채색', () => {
    expect([0, 1, 2, 3].map(alertLevelTone)).toEqual(['neutral', 'neutral', 'error', 'error']);
  });

  it('모르는 단계도 색이 정해진다', () => {
    expect(alertLevelTone(9)).toBe('error');
    expect(alertLevelTone(-1)).toBe('neutral');
  });
});

describe('slotName — 경비교대 슬롯', () => {
  it('아는 코드는 우리말로', () => {
    expect(slotName('LUNCH')).toBe('중식');
    expect(slotName('DINNER')).toBe('석식');
  });

  // 모르는 코드를 지어내지 않는다 (`CLAUDE.md` 3장).
  it('모르는 코드는 그대로 둔다', () => {
    expect(slotName('SUPPER')).toBe('SUPPER');
    expect(slotName('')).toBe('');
  });

  // 빈 값 처리는 여기 없다. 부르는 쪽이 자리에 맞게 정한다 —
  // 관리팀 표는 `—`, 모바일은 줄을 안 그린다.
  it('빈 값을 다루지 않는다 — 문자열만 받는다', () => {
    expect(slotName('LUNCH')).not.toBe('—');
  });
});
