import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// 워커가 뜨기 전에 박는다. 워커는 별도 프로세스라 여기서 넣은 값을 물려받는다.
// 서울이 아닌 곳으로 두는 것이 요점이다 — 아래 설명 참고.
process.env.TZ = 'America/New_York';

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * 테스트 설정.
 *
 * **순수 로직만 테스트한다.** 화면(React Native·React)은 여기서 다루지 않는다 —
 * 렌더 테스트를 하려면 라이브러리가 여러 개 늘어나고, 지금 필요한 것은 전 화면이
 * 통과하는 **숫자·날짜·문구 변환이 맞는지**다 (`CLAUDE.md` 5장).
 * 레이아웃은 실측으로 본다 (`00_문서_인덱스.md` 「모바일 큰 글꼴 점검」).
 *
 * **프로젝트를 셋으로 나눈다.** 모바일과 관리팀이 `@/` 라는 **같은 이름으로 다른 곳**을
 * 가리켜서, 한 설정에 둘을 같이 넣을 수 없다. 나눠야 각자의 별칭이 선다.
 * 두 앱에 걸친 테스트(52시간 문구가 양쪽에서 같은지)는 `shared` 프로젝트에 둔다.
 *
 * 타임존을 **Asia/Seoul 이 아닌 값으로 고정한다.** 화면은 KST 고정인데 테스트가
 * 한국 기기에서만 돌면 「기기 타임존을 따라간다」는 버그를 못 잡는다. 해외 출장 중에
 * 근태가 어긋나는 것이 정확히 그 버그다 (`CLAUDE.md` 5장).
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'packages',
          include: ['packages/*/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: { alias: { '@': dir('./apps/mobile/src') } },
        test: {
          name: 'mobile',
          include: ['apps/mobile/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: { alias: { '@': dir('./apps/admin/src') } },
        test: {
          name: 'admin',
          include: ['apps/admin/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        /*
         * 두 앱을 같이 불러 비교하는 자리. 양쪽은 상대 경로로 직접 가리킨다.
         *
         * **`@` 는 모바일로 건다.** 여기서 비교하는 관리팀 파일들은 `@/` 를 쓰지
         * 않아서(전부 상대 경로거나 import 가 없다) 지금은 이걸로 충분하다.
         * 관리팀 쪽이 나중에 `@/` 를 쓰기 시작하면 **조용히 모바일 파일로 풀린다** —
         * 그게 제일 위험한 모양이라 `tests/shared-labels.test.ts` 가 그것부터 막는다.
         */
        resolve: { alias: { '@': dir('./apps/mobile/src') } },
        test: {
          name: 'shared',
          include: ['tests/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
