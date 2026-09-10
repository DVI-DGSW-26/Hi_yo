/**
 * 서버 중계 로그인의 콜백을 읽는 부분. **웹판이 쓴다.**
 *
 * 앱(네이티브)은 2026-09-10에 Keycloak 과 직접 붙는 방식으로 옮겼다(`oidc.ts`). 중계 경로는
 * **없어지지 않는다** — 관리팀 웹과 이 앱의 웹판이 계속 쓴다 (백엔드 회신 2026-09-09).
 * 그래서 이 로직도 남는다. 두 방식이 콜백에서 받는 것이 다르다 —
 * 중계는 **완성된 토큰**, 직접은 **토큰으로 바꿀 코드**다.
 *
 * `auth.ts`·`auth.web.ts` 양쪽이 `isCallbackUrl` 을 쓴다. 어느 방식이든 「이 주소가
 * 로그인 콜백인가」를 판단하는 규칙은 같기 때문이다.
 */

/**
 * 콜백에서 결과를 꺼낸다 — `hr://auth/callback#token=<JWT>`.
 *
 * **fragment로 온다.** 서버로 전송되지 않아 접근로그에 토큰이 남지 않기 때문이다.
 * 일부 환경이 fragment 대신 쿼리로 넘겨줄 수 있어 둘 다 본다.
 */
export function readCallbackUrl(url: string): { token?: string; error?: string } {
  const hashAt = url.indexOf('#');
  const queryAt = url.indexOf('?');

  const parts: string[] = [];
  if (hashAt >= 0) parts.push(url.slice(hashAt + 1));
  if (queryAt >= 0) parts.push(url.slice(queryAt + 1, hashAt >= 0 ? hashAt : undefined));

  for (const part of parts) {
    const params = new URLSearchParams(part);
    const token = params.get('token');
    const error = params.get('error');
    if (token) return { token };
    if (error) return { error };
  }
  return {};
}

/** 이 주소가 로그인 콜백인가. 두 방식이 같은 경로로 돌아온다 */
export function isCallbackUrl(url: string): boolean {
  return url.includes('/auth/callback');
}
