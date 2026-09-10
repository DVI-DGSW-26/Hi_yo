/**
 * DVI 통합 로그인(Keycloak)과 **앱이 직접** 붙는 데 필요한 순수 로직.
 *
 * 서버 중계를 거치지 않고 앱이 OIDC Authorization Code + PKCE 로 붙는다
 * (백엔드 30·31·32번 회신, 2026-09-09). 중계 경로는 **없어지지 않는다** — 관리팀 웹과
 * 이 앱의 웹판이 계속 쓴다. 그래서 이 파일은 앱(네이티브)만 쓴다.
 *
 * **왜 직접 붙나** — 중계 경로는 액세스 토큰만 주고 갱신 수단이 없다. 수명이 15분이라
 * 직원이 15분마다 다시 로그인해야 했다. 직접 붙으면 `refresh_token` 을 받는다.
 *
 * **네트워크도 저장소도 여기서 건드리지 않는다.** 주소를 만들고 응답을 읽는 규칙만 둔다 —
 * 눈으로 확인하기 어려운 자리라 테스트로 못 박는다 (`oidc.test.ts`).
 */

/** 서버가 확인해 준 값 (discovery, 2026-09-09) */
export const OIDC_SCOPE = 'openid profile email';

/**
 * PKCE 방식. **`plain` 을 쓰지 않는다.**
 *
 * discovery 는 `plain` 도 지원한다고 알리지만, `plain` 은 challenge 가 verifier 와 같아서
 * 주소를 가로챈 쪽이 그대로 토큰을 받아갈 수 있다. 급여·주민번호를 여는 토큰이다.
 */
export const CODE_CHALLENGE_METHOD = 'S256';

export interface Discovery {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  endSessionEndpoint: string;
}

/**
 * issuer 하나로 필요한 주소 셋을 만든다.
 *
 * discovery 문서를 매번 받아오지 않는다 — 로그인 첫 화면에서 왕복이 하나 늘고,
 * Keycloak 의 이 세 경로는 표준으로 고정돼 있다 (2026-09-09에 실제 응답으로 확인했다).
 */
export function discoveryOf(issuer: string): Discovery {
  const base = `${issuer.replace(/\/$/, '')}/protocol/openid-connect`;
  return {
    authorizationEndpoint: `${base}/auth`,
    tokenEndpoint: `${base}/token`,
    endSessionEndpoint: `${base}/logout`,
  };
}

export interface AuthorizeParams {
  issuer: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}

/** 로그인 화면으로 보낼 주소 */
export function authorizeUrl({
  issuer,
  clientId,
  redirectUri,
  codeChallenge,
  state,
}: AuthorizeParams): string {
  const query = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: OIDC_SCOPE,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: CODE_CHALLENGE_METHOD,
    state,
  });
  return `${discoveryOf(issuer).authorizationEndpoint}?${query.toString()}`;
}

/**
 * 콜백에서 결과를 꺼낸다 — `hr://auth/callback?code=...&state=...`
 *
 * **중계 경로와 오는 모양이 다르다.** 중계는 fragment 에 완성된 토큰을 실어 줬고,
 * 이쪽은 쿼리에 `code` 가 온다. 아직 토큰이 아니라 **토큰으로 바꿀 표**다.
 *
 * 오류도 쿼리로 온다 (`error`·`error_description`). 사람이 읽을 말이 있으면 그것을 준다 —
 * 앱이 문구를 지어내지 않는다.
 */
export function readAuthorizeCallback(url: string): {
  code?: string;
  state?: string;
  error?: string;
} {
  const queryAt = url.indexOf('?');
  const hashAt = url.indexOf('#');

  const parts: string[] = [];
  if (queryAt >= 0) parts.push(url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined));
  if (hashAt >= 0) parts.push(url.slice(hashAt + 1));

  for (const part of parts) {
    const params = new URLSearchParams(part);
    const error = params.get('error');
    if (error) {
      const description = params.get('error_description');
      return { error: description || error };
    }
    const code = params.get('code');
    if (code) {
      const state = params.get('state');
      return { ...(code ? { code } : {}), ...(state ? { state } : {}) };
    }
  }
  return {};
}

/** 인가 코드를 토큰으로 바꾸는 요청 본문 */
export function codeExchangeBody(params: {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): string {
  return new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  }).toString();
}

/** 갱신 요청 본문 */
export function refreshBody(params: { clientId: string; refreshToken: string }): string {
  return new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: params.clientId,
    refresh_token: params.refreshToken,
  }).toString();
}

/** 토큰 응답에서 쓸 것만 꺼낸다. 나머지는 보지 않는다 */
export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  /** 초. 서버가 준 값을 그대로 쓴다 — 15분을 코드에 적지 않는다 */
  expiresIn: number | null;
}

/**
 * 토큰 응답을 읽는다.
 *
 * **`access_token` 이 없으면 실패로 본다.** 갱신이 조용히 실패했는데 성공으로 읽으면
 * 빈 토큰으로 `Authorization` 헤더를 만들어 계속 401 을 맞는다.
 */
export function readTokenResponse(data: unknown): TokenSet | null {
  if (typeof data !== 'object' || data === null) return null;
  const raw = data as Record<string, unknown>;

  const accessToken = raw.access_token;
  if (typeof accessToken !== 'string' || accessToken === '') return null;

  return {
    accessToken,
    refreshToken: typeof raw.refresh_token === 'string' && raw.refresh_token !== ''
      ? raw.refresh_token
      : null,
    expiresIn: typeof raw.expires_in === 'number' ? raw.expires_in : null,
  };
}

/**
 * 다음 갱신까지 기다릴 밀리초. **만료 1분 전에 미리 부른다.**
 *
 * 401 을 받고 나서 갱신하면 그 요청은 이미 실패한 뒤다 (서버 안내 2026-09-08).
 * 수명이 아주 짧게 오더라도 30초보다 자주 부르지 않는다 — 관리팀 화면과 같은 규칙이다.
 */
export function nextRefreshDelayMs(expiresIn: number | null): number | false {
  if (expiresIn == null) return false;
  return Math.max(expiresIn - 60, 30) * 1000;
}
