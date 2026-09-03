import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@hr/api';

/**
 * 앱의 유일한 쿼리 클라이언트. `src/lib/api.ts` 가 HTTP 하나만 두는 것과 같은 이유다.
 *
 * **화면(`app/_layout.tsx`)이 아니라 여기 있다.** 로그아웃할 때 캐시를 비워야 하는데
 * (`lib/auth.ts` 의 `clearToken`), 화면 파일 안에 있으면 그쪽에서 손이 닿지 않는다.
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
      // 자동 재시도를 켜지 않는다. 재직증명서 발급은 부를 때마다 새 문서번호가 찍힌다.
      retry: false,
    },
  },
});
