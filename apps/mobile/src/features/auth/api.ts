import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { canRefresh, getToken, markAuthenticated, refreshTokens } from '@/lib/auth';
import { nextRefreshDelayMs } from '@/lib/oidc';

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
  refresh: ['auth', 'refresh'] as const,
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

/**
 * 액세스 토큰을 **만료 1분 전에 미리 갱신한다.**
 *
 * 401 을 받고 나서 갱신하면 그 요청은 이미 실패한 뒤다 (서버 안내 2026-09-08).
 * 수명은 **서버가 준 값을 쓴다 — 15분을 코드에 적지 않는다.** Keycloak 설정이라
 * 값이 또 바뀔 수 있다. 관리팀 화면과 같은 규칙이다.
 *
 * **실패해도 로그아웃시키지 않는다.** 지금 토큰이 아직 살아 있을 수 있고, 실제로
 * 죽는 순간 401 이 와서 `AuthGate` 의 재로그인 경로가 받는다. 갱신은 더 나은 경로일
 * 뿐 유일한 경로가 아니다.
 *
 * **웹판에서는 돌지 않는다** — `canRefresh()` 가 `false` 다. 중계 경로의 갱신은
 * 세션 쿠키를 쓰는데 배포 주소가 정해져야 실리고, 붙이는 것은 그 뒤에 따로 한다.
 *
 * 받은 토큰을 쿼리 캐시에 두지 않는다 — 보관은 `setTokens` 한 곳이 한다.
 */
export function useTokenRefresh() {
  return useQuery<number | null>({
    queryKey: authKeys.refresh,
    enabled: getToken() !== null && canRefresh(),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => nextRefreshDelayMs(query.state.data ?? null),
    queryFn: () => refreshTokens(),
  });
}
