import { createApiClient } from '@hr/api';
import { getToken } from './auth';

// 관리팀 화면의 유일한 HTTP 클라이언트. fetch를 직접 쓰지 않는다.
// 오류 정규화와 인터셉터는 @hr/api 가 한다. 모바일과 같은 규칙을 쓴다.
const baseURL = import.meta.env.VITE_API_BASE_URL;

if (import.meta.env.DEV && !baseURL) {
  throw new Error(
    'VITE_API_BASE_URL 이 없습니다. apps/admin/.env.example 을 .env 로 복사한 뒤 다시 실행하세요.',
  );
}

export const api = createApiClient({ baseURL, authHeaders });

/**
 * **세션 쿠키로 인증하는 경로.** 토큰을 붙이지 않는다.
 *
 * 서버 안내(2026-09-08) — 「`Authorization` 헤더는 붙이지 마세요. 세션 쿠키로 인증합니다 —
 * 만료된 토큰으로는 신원을 증명할 수 없어서요.」 갱신을 부르는 시점의 토큰은 이미
 * 만료됐거나 만료 직전이다.
 */
const COOKIE_AUTH_PATHS = new Set(['/auth/refresh', '/auth/logout']);

/**
 * DVI 통합 로그인이 준 액세스 토큰을 붙인다 (`lib/auth.ts`).
 *
 * 토큰이 없으면 헤더를 붙이지 않는다 — 서버가 401을 주고, 화면이 로그인으로 안내한다.
 * 여기서 로그인으로 보내지 않는다. 리다이렉트는 화면의 일이다.
 */
export function authHeaders(url: string | undefined): Record<string, string> {
  if (url !== undefined && COOKIE_AUTH_PATHS.has(url)) return {};

  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type { PageResponse, PageParams } from '@hr/api';
export { MAX_PAGE_SIZE } from '@hr/api';
