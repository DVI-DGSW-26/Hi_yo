import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken, markAuthenticated } from '@/lib/auth';

/**
 * 로그인한 사람이 누구인가 (`GET /auth/me`).
 *
 * **토큰 안의 `resource_access`를 직접 읽지 않는다.** Keycloak 롤과 앱 권한을 대조하는
 * 기간이라 앱 DB의 권한이 이긴다. `/auth/me`가 서버의 실제 판정값이다
 * (백엔드 「HRM 로그인 연동 안내」 2026-08-31).
 *
 * 관리팀 화면과 같은 응답을 쓰지만 **`admin`으로 화면을 가르지 않는다** — 본인용 앱이라
 * 관리팀이든 아니든 보는 것이 같다. `employeeId`와 `name`만 쓴다.
 */
export interface AuthMe {
  /** 다른 API의 `employeeId` 자리에 그대로 쓴다 */
  employeeId: number;
  employeeNo: string | null;
  name: string;
  role: 'EMPLOYEE' | 'ADMIN';
  admin: boolean;
}

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export function useAuthMe() {
  return useQuery({
    queryKey: authKeys.me,
    enabled: getToken() !== null,
    // 로그인한 사람은 화면을 옮겨도 그대로다. 화면마다 다시 묻지 않는다.
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<AuthMe>('/auth/me', { signal });
      // 토큰이 실제로 통했다. 이제서야 자동 재로그인을 한 번 더 쓸 수 있게 푼다.
      markAuthenticated();
      return data;
    },
  });
}
