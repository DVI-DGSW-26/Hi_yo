import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * **점 표기(`2026.08.24`)를 쓰지 않는다** (2026-09-03 확정. `DESIGN_RULES.md` 8장).
 *
 * 쓰는 날짜 형식을 다 세어 보니 두 계열이었다 — 좁은 자리의 `M.d` 와 문장·단독 값의
 * `M월 d일`·`yyyy년 M월 d일`. 점 표기는 **앱 전체에 한 곳뿐이었고**(재직증명서 발급 이력)
 * 관리팀에는 짝이 아예 없었다. 세 번째 계열을 만들 이유가 없어 그 한 곳을 고쳤다.
 *
 * 다시 들어오면 여기서 막는다. **필요하다고 판단되면 이 테스트를 조용히 고치지 말고**
 * 사람에게 묻는다 — 규칙(8장)과 여기를 같이 고쳐야 한다.
 */

const APPS = ['../apps/mobile', '../apps/admin'];

/** `yyyy.MM.dd` · `yy.M.d` 처럼 점으로 잇는 날짜 패턴 */
const DOT_DATE = /['"`][^'"`]*y{2,4}\s*\.\s*M{1,2}\s*\.\s*d{1,2}[^'"`]*['"`]/;

function sourcesOf(app: string): { path: string; source: string }[] {
  const root = fileURLToPath(new URL(app, import.meta.url));
  return globSync('**/*.{ts,tsx}', { cwd: root, exclude: ['node_modules/**'] })
    .filter((path) => path.startsWith('app') || path.startsWith('src'))
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => ({ path: `${app}/${path}`, source: readFileSync(`${root}/${path}`, 'utf8') }));
}

describe('날짜를 점으로 잇지 않는다', () => {
  const files = APPS.flatMap(sourcesOf);

  // 파일을 못 찾으면 아래가 통과해 버린다. 세는 것부터 확인한다.
  it('훑을 파일이 있다', () => {
    expect(files.length).toBeGreaterThan(60);
  });

  // 정규식이 헛돌지 않는지 먼저 본다. 이게 없으면 통과가 아무 뜻도 없다.
  it('가드가 실제로 점 표기를 잡는다', () => {
    expect(DOT_DATE.test("format(d, 'yyyy.MM.dd')")).toBe(true);
    expect(DOT_DATE.test("format(d, 'yy.M.d')")).toBe(true);
    // 쓰고 있는 형식들은 걸리지 않아야 한다.
    expect(DOT_DATE.test("format(d, 'M.d')")).toBe(false);
    expect(DOT_DATE.test("format(d, 'yyyy-MM-dd')")).toBe(false);
    expect(DOT_DATE.test("format(d, 'yyyy년 M월 d일')")).toBe(false);
  });

  it.each(files.map((file) => file.path))('%s 에 점 표기가 없다', (path) => {
    const file = files.find((each) => each.path === path);
    expect(DOT_DATE.test(file?.source ?? '')).toBe(false);
  });
});
