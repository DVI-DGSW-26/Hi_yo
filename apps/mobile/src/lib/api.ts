import { createApiClient } from '@hr/api';
import { getToken } from './auth';

// 앱의 유일한 HTTP 클라이언트. fetch를 직접 쓰지 않는다.
// 오류 정규화와 인터셉터는 @hr/api 가 한다. 관리팀 화면과 같은 규칙을 쓴다.
// baseURL은 시크릿이 아니므로 EXPO_PUBLIC_ 로 둔다. 토큰·키는 절대 여기 넣지 않는다.
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (__DEV__ && !baseURL) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL 이 없습니다. apps/mobile/.env.example 을 .env 로 복사한 뒤 다시 실행하세요.',
  );
}

// 인증은 DVI 통합 로그인이다 (lib/auth.ts). 토큰은 expo-secure-store 에만 둔다 —
// AsyncStorage 를 쓰지 않는다 (CLAUDE.md 2장).
export const api = createApiClient({ baseURL, authHeaders });

/**
 * axios를 타지 않는 요청에 같은 인증을 붙이기 위한 헤더.
 *
 * 파일 내려받기(expo-file-system)는 자기 네트워크 계층을 쓴다. 인증을 두 군데에 적어두면
 * 방식이 바뀔 때 한쪽이 남는다. 붙일 헤더는 이 함수 하나에서만 만든다.
 */
/**
 * **세션 쿠키로 인증하는 경로.** 토큰을 붙이지 않는다.
 *
 * 서버 안내(2026-09-08·09-10) — 「`Authorization` 헤더는 붙이지 마세요. 세션 쿠키
 * (`HIYO_SESSION`)로 인증합니다 — 만료된 토큰으로는 신원을 증명할 수 없어서요.」
 * 갱신을 부르는 시점의 토큰은 이미 만료됐거나 만료 직전이다.
 *
 * **웹판만 이 경로를 쓴다.** 앱은 Keycloak 과 직접 붙어 자기 `refresh_token` 으로
 * 갱신한다 (`lib/auth.ts`). 목록을 여기 두는 것은 관리팀 화면과 같은 모양이라서다.
 */
const COOKIE_AUTH_PATHS = new Set(['/auth/refresh', '/auth/logout']);

export function authHeaders(url?: string): Record<string, string> {
  if (url !== undefined && COOKIE_AUTH_PATHS.has(url)) return {};

  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 파일 내려받기처럼 절대 주소가 필요할 때 쓴다 */
export function apiUrl(path: string): string {
  return `${baseURL ?? ''}${path}`;
}

export type { PageResponse, PageParams } from '@hr/api';
export { MAX_PAGE_SIZE } from '@hr/api';

/**
 * 목록 한 쪽의 크기. 폰에서 한 번에 읽을 만한 양이다.
 *
 * 서버 상한(`MAX_PAGE_SIZE` 100)보다 훨씬 작게 둔다. 목록은 `더 보기`로 이어 붙이므로
 * 한 번에 많이 받을 이유가 없고, 첫 화면이 빨리 뜨는 편이 낫다.
 */
export const LIST_PAGE_SIZE = 20;
