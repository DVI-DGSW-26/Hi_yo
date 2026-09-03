import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **모바일은 글자를 자르지 않는다** (2026-09-03 확정. `DESIGN_RULES.md` 3장).
 *
 * 폰에는 잘린 것을 펴 볼 방법이 없다 — 마우스를 올려 `title`을 보는 자리가 없다.
 * 관리팀 달력은 `title`이 있는데도 이름을 지키기로 했는데, 펴 볼 수단이 아예 없는
 * 쪽에서 더 자를 이유가 없다.
 *
 * **규칙을 주석에만 적어 두면 안 지켜진다.** 이 리포에서 이미 두 번 그랬다 —
 * 52시간 문구와 경비교대 슬롯이 「한쪽을 고치면 다른 쪽도」라고 적혀만 있었다.
 * 그래서 이 규칙은 테스트가 지킨다.
 *
 * **정말 필요한 자리가 생기면** 이 테스트를 조용히 고치지 말고 사람에게 묻는다.
 * 규칙(`DESIGN_RULES.md` 3장)과 여기를 같이 고쳐야 한다.
 */

const MOBILE_SRC = fileURLToPath(new URL('../apps/mobile', import.meta.url));

function mobileFiles(): string[] {
  return globSync('**/*.{ts,tsx}', { cwd: MOBILE_SRC, exclude: ['node_modules/**'] })
    .filter((path) => path.startsWith('app') || path.startsWith('src'))
    .filter((path) => !path.endsWith('.test.ts'));
}

describe('모바일은 글자를 자르지 않는다', () => {
  const files = mobileFiles();

  // 파일을 못 찾으면 아래가 전부 통과해 버린다. 세는 것부터 확인한다.
  it('훑을 파일이 있다', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)('%s 에 numberOfLines 가 없다', (path) => {
    const source = readFileSync(`${MOBILE_SRC}/${path}`, 'utf8');
    expect(source).not.toMatch(/numberOfLines/);
  });

  // `ellipsizeMode` 는 `numberOfLines` 없이는 아무 일도 안 하지만, 같이 들어오는 짝이라
  // 여기서 같이 막는다. 하나만 막으면 다음 사람이 짝을 맞춰 넣는다.
  it.each(files)('%s 에 ellipsizeMode 가 없다', (path) => {
    const source = readFileSync(`${MOBILE_SRC}/${path}`, 'utf8');
    expect(source).not.toMatch(/ellipsizeMode/);
  });
});
