import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { clearToken, hasToken, markAuthenticated, setToken } from '@/lib/auth';

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
  refresh: ['auth', 'refresh'] as const,
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

/**
 * 세션 쿠키를 실어 보내는 요청. **갱신과 로그아웃 둘뿐이다.**
 *
 * 쿠키가 `SameSite=Lax` 라 **프런트와 API 가 같은 사이트(`*.dvi-ind.com`)여야 실린다**
 * (서버 안내 2026-09-08). 개발은 `localhost` 라 다른 사이트여서 쿠키가 실리지 않는다 —
 * 그래서 개발 중에는 갱신이 401 로 조용히 실패하는 것이 정상이고, 화면은 지금까지처럼
 * 401 을 만나 로그인으로 안내한다. **배포 주소가 정해져야 실제로 도는지 확인된다.**
 */
const WITH_SESSION_COOKIE = { withCredentials: true } as const;

/**
 * 액세스 토큰 갱신 (`GET /auth/refresh`).
 *
 * **만료되기 1분 전에 미리 부른다.** 401 을 받고 나서 갱신하면 그 요청은 이미 실패한
 * 뒤다 (서버 안내). 수명은 **응답의 `expiresIn` 을 쓴다 — 15분을 코드에 적지 않는다.**
 * Keycloak 설정이라 값이 또 바뀔 수 있다.
 *
 * **실패해도 로그아웃시키지 않는다.** 지금 들고 있는 토큰은 아직 살아 있고, 갱신이
 * 막히는 사정이 여럿이다 — 배포 직후(서버가 인증 정보를 메모리에 들고 있어 배포하면
 * 날아간다)·쿠키가 안 실리는 개발 환경. 토큰이 실제로 죽는 순간 401 이 오고,
 * 그때 화면이 재로그인으로 보낸다 (`AuthGate`). 갱신은 **더 나은 경로일 뿐 유일한
 * 경로가 아니다.**
 *
 * 받은 토큰을 쿼리 캐시에 두지 않는다 — 보관은 `setToken` 한 곳이 한다.
 */
export function useTokenRefresh() {
  // 타입을 명시한다 — 다음 갱신 시각을 `state.data` 에서 읽어야 하는데, 추론으로는
  // 그 자리가 `{}` 가 된다 (`refetchInterval` 이 자기 결과 타입을 다시 참조한다).
  return useQuery<TokenLifetime>({
    queryKey: authKeys.refresh,
    enabled: hasToken(),
    retry: false,
    staleTime: Infinity,
    // 창을 다시 볼 때마다 갱신할 이유가 없다. 시각은 아래 주기가 잡는다.
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const expiresIn = query.state.data?.expiresIn;
      if (expiresIn == null) return false;
      // 만료 1분 전. 수명이 아주 짧게 오더라도 30초보다 자주 부르지 않는다.
      return Math.max(expiresIn - 60, 30) * 1000;
    },
    queryFn: async ({ signal }) => {
      const { data } = await api.get<RefreshedToken>('/auth/refresh', {
        ...WITH_SESSION_COOKIE,
        signal,
      });
      setToken(data.token);
      return { expiresIn: data.expiresIn };
    },
  });
}

/** 갱신 응답. `token` 은 보관만 하고 화면으로 내보내지 않는다 */
interface RefreshedToken {
  token: string;
  /** 초. 이 값으로 다음 갱신 시각을 잡는다 */
  expiresIn: number;
}

/** 쿼리에 남기는 것 — **수명뿐이다.** 토큰은 캐시에 두지 않는다 */
interface TokenLifetime {
  expiresIn: number;
}

/**
 * 로그아웃 (`POST /auth/logout`).
 *
 * **서버가 하는 일은 「새 토큰이 더 안 나오게」 막는 것까지다.** 이미 발급된 토큰은
 * JWT 라 서버가 거둬들일 수 없고 만료까지 유효하다 — **프런트가 토큰을 지워야
 * 로그아웃이 완성된다** (서버 안내 2026-09-08). 공용 PC 를 생각하면 이쪽이 실제로 중요하다.
 *
 * 그래서 **요청이 실패해도 토큰을 지운다.** 서버 세션이 남는 것보다 이 브라우저에
 * 토큰이 남는 것이 위험하다. 이미 로그아웃 상태여도 서버는 200 을 준다.
 *
 * **Keycloak 세션은 끊기지 않는다.** 다시 로그인하면 비밀번호를 묻지 않고 바로 들어온다 —
 * 계정을 바꾸는 경로는 아직 없다 (`docs/01_물어볼_것.md` 32번).
 */
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout', undefined, WITH_SESSION_COOKIE);
    },
    onSettled: () => {
      clearToken();
      window.location.assign('/');
    },
  });
}
