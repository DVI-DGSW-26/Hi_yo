import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { hasToken, markAuthenticated } from '@/lib/auth';

/**
 * 로그인한 사람이 누구이고 무엇을 할 수 있는가 (`GET /auth/me`).
 *
 * **토큰 안의 `resource_access`를 직접 읽지 않는다.** Keycloak 롤과 앱 권한을 대조하는
 * 기간이라 앱 DB의 권한이 이긴다 — 토큰에는 `user`만 있는데 실제로는 관리팀인 사람이 있다.
 * 토큰을 보고 화면을 그리면 관리 메뉴가 사라지고, 눌러도 되는 버튼이 안 보인다.
 * **`/auth/me`가 서버의 실제 판정값이다.** (백엔드 「HRM 로그인 연동 안내」 2026-08-31)
 *
 * 기자재 관리(jagigo)의 `/auth/me`와 필드가 다르다 — `roles` 배열이 아니라 `role`·`admin`이다.
 * 서버가 주는 것이 Keycloak 롤이 아니라 앱 권한이라 이름을 일부러 다르게 뒀다고 한다.
 */
export interface AuthMe {
  /** 다른 API의 `employeeId` 자리에 그대로 쓴다 */
  employeeId: number;
  /** 사번. 없는 직원이 많아 표시용으로만 쓴다 */
  employeeNo: string | null;
  /** 헤더에 표시할 이름 */
  name: string;
  role: 'EMPLOYEE' | 'ADMIN';
  /** 관리 메뉴를 보여줄지 */
  admin: boolean;
}

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export function useAuthMe() {
  return useQuery({
    queryKey: authKeys.me,
    // 토큰이 없으면 부를 것도 없다. 화면이 먼저 로그인으로 안내한다.
    enabled: hasToken(),
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
