import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@hr/api';

/**
 * 이 화면의 유일한 쿼리 클라이언트. `src/lib/api.ts` 가 HTTP 하나만 두는 것과 같은 이유다.
 *
 * **`main.tsx` 가 아니라 여기 있다.** 로그아웃할 때 캐시를 비워야 하는데
 * (`lib/auth.ts` 의 `clearToken`), 화면 파일 안에 있으면 그쪽에서 손이 닿지 않는다.
 * 모바일도 같은 자리에 같은 이름으로 둔다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 권한 없음·업무 규칙 위반은 다시 불러도 같은 답이 온다. 재시도는 연결·서버 문제에만 한다.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isRetryable) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      // 자동 재시도를 켜지 않는다. 급여 확정·발급처럼 두 번 부르면 안 되는 것들이 있다.
      retry: false,
    },
  },
});
