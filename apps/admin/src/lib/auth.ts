/**
 * DVI 통합 로그인(Keycloak) 연동.
 *
 * 서버가 로그인 중계까지 한다. **프런트에 OIDC 라이브러리를 넣지 않는다** —
 * 로그인 URL로 브라우저를 통째로 보내면 서버가 Keycloak을 거쳐 토큰을 들고 돌아온다.
 * (백엔드 「HRM 로그인 연동 안내」 2026-08-31)
 *
 * 흐름
 * 1. 로그인 버튼 → `oauth2/authorization/keycloak` 로 **화면 이동** (XHR 아님)
 * 2. 서버가 `<프런트>/auth/callback#token=<JWT>` 로 돌려보낸다
 * 3. 토큰을 보관하고 이후 요청에 `Authorization: Bearer` 로 붙인다
 *
 * **토큰을 `localStorage`에 두지 않는다.** XSS 한 번에 털리고, 이 토큰 하나로 전 직원의
 * 인사·급여가 열린다. 탭 안에서만 사는 `sessionStorage`에 두고, 그것도 막혀 있으면
 * 메모리에만 둔다.
 *
 * **토큰을 로그·오류 메시지에 넣지 않는다** (`CLAUDE.md` 2장).
 */

const TOKEN_KEY = 'hr.accessToken';
/** 401 자동 재로그인을 한 번만 하기 위한 표시 */
const RETRIED_KEY = 'hr.loginRetried';

/** `sessionStorage`가 막혀 있어도 화면은 돌아야 한다. 그 경우 이 값만 쓴다 */
let memoryToken: string | null = null;

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // 사생활 보호 모드 등. 메모리에만 남는다 — 새로고침하면 다시 로그인한다.
  }
}

export function getToken(): string | null {
  return memoryToken ?? readSession(TOKEN_KEY);
}

export function hasToken(): boolean {
  return getToken() !== null;
}

/**
 * 콜백에서 받은 토큰을 보관한다.
 *
 * **여기서 재시도 표시를 지우지 않는다.** 토큰을 받은 것과 그 토큰이 통하는 것은 다르다 —
 * 그룹에 없거나 인사 정보에 연결되지 않은 계정도 로그인은 되고 토큰도 받는다.
 * 여기서 지우면 `401 → 로그인 → 토큰 → 401`이 끝없이 돈다.
 * 표시는 `/auth/me`가 실제로 통했을 때만 지운다 (`markAuthenticated`).
 */
export function setToken(token: string): void {
  memoryToken = token;
  writeSession(TOKEN_KEY, token);
}

/**
 * `/auth/me`가 통했다 — 이 토큰으로 서버가 사람을 알아본다.
 *
 * **여기서만 재시도 표시를 지운다.** 다음에 토큰이 만료되면 그때 다시 한 번 조용히
 * 다녀올 수 있어야 한다.
 */
export function markAuthenticated(): void {
  writeSession(RETRIED_KEY, null);
}

/** 로그아웃 — 보관한 토큰을 지우는 것이 전부다. 전 서비스 동시 로그아웃은 아직 없다 */
export function clearToken(): void {
  memoryToken = null;
  writeSession(TOKEN_KEY, null);
}

/**
 * 로그인 시작 주소. **`api` 인스턴스로 부르지 않는다** — 브라우저가 통째로 이동해야
 * Keycloak 로그인 화면(OTP 포함)이 뜬다.
 */
export function loginUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}/oauth2/authorization/keycloak`;
}

/** 사용자가 로그인 버튼을 눌렀을 때. 표시를 지우고 무조건 간다 */
export function startLogin(): void {
  writeSession(RETRIED_KEY, null);
  clearToken();
  window.location.assign(loginUrl());
}

/**
 * 401을 만났을 때의 자동 재로그인. **한 번만 간다.**
 *
 * 401이 만료 때문만은 아니다 — Keycloak 그룹에 없거나 인사 정보에 연결되지 않은
 * 계정도 401이고, 그 경우는 다시 로그인해도 계속 401이라 무한 루프에 빠진다.
 * 응답으로는 구분되지 않고 서버 로그에만 이유가 남는다.
 *
 * @returns 이동을 시작했으면 `true`. 이미 한 번 갔다 왔으면 `false` —
 *   그때는 화면이 "다시 로그인" 버튼과 함께 사유를 안내한다.
 */
export function redirectToLoginOnce(): boolean {
  if (readSession(RETRIED_KEY) !== null) return false;

  writeSession(RETRIED_KEY, '1');
  clearToken();
  window.location.assign(loginUrl());
  return true;
}

/** 자동 재로그인을 이미 써버렸는가. 안내 문구를 가르는 데 쓴다 */
export function loginRetryUsed(): boolean {
  return readSession(RETRIED_KEY) !== null;
}

/**
 * 콜백 URL의 fragment에서 결과를 꺼낸다.
 *
 * **쿼리스트링이 아니라 fragment다.** fragment는 서버로 전송되지 않아 nginx 접근로그에
 * 토큰이 남지 않는다. 꺼낸 뒤에는 주소창에서도 지운다.
 */
export function readCallbackHash(hash: string): { token?: string; error?: string } {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('token');
  const error = params.get('error');
  return {
    ...(token ? { token } : {}),
    ...(error ? { error } : {}),
  };
}
