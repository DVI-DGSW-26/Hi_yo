import { queryClient } from './queryClient';

/**
 * DVI 통합 로그인(Keycloak) 연동 — **웹**.
 *
 * `auth.ts` 의 웹판이다. Metro 가 웹 번들에서만 이 파일을 고른다(`.web.ts`).
 * 부르는 쪽은 그대로 두려고 **내보내는 이름과 모양(async 포함)을 앱판과 똑같이 맞췄다.**
 *
 * 앱판과 다른 것은 셋이다.
 *
 * 1. **토큰을 `expo-secure-store` 에 못 둔다.** 브라우저에는 그런 것이 없다.
 *    `CLAUDE.md` 2장이 `expo-secure-store` 만 쓰라고 한 것은 기기 이야기이고,
 *    웹에서 무엇을 쓸지는 **관리팀 화면이 이미 정해 뒀다** — `sessionStorage` 이고,
 *    막혀 있으면 메모리다. `localStorage` 를 쓰지 않는다: XSS 한 번에 털리고
 *    이 토큰 하나로 본인 급여·주민번호가 열린다. 탭을 닫으면 사라지는 편이 낫다.
 *    (`apps/admin/src/lib/auth.ts` 와 같은 판단이다)
 *
 * 2. **재로그인 표시도 `sessionStorage` 에 둔다.** 앱은 로그인하러 브라우저에 다녀오는
 *    동안에도 살아 있어서 모듈 변수가 유지되지만, **웹은 페이지가 통째로 다시 뜬다.**
 *    변수로 두면 표시가 매번 초기화돼 `401 → 로그인 → 401` 이 끝없이 돈다.
 *
 * 3. **돌아오는 곳이 딥링크가 아니라 이 사이트의 `/auth/callback` 이다.**
 *    `hr://auth/callback` 과 **별개의 주소라 서버에 따로 등록해야 한다.**
 *    등록되지 않은 주소면 서버가 400 과 함께 그 주소를 그대로 찍어 준다.
 */

const TOKEN_KEY = 'hr.accessToken';
/** 401 자동 재로그인을 한 번만 하기 위한 표시 */
const RETRIED_KEY = 'hr.loginRetried';

/** `sessionStorage` 가 막혀 있어도(사생활 보호 모드 등) 화면은 돌아야 한다 */
let memoryToken: string | null = null;

/**
 * **모듈이 뜰 때 주소창을 한 번 본다.** 로그인 콜백이면 통째로 붙들어 두고,
 * 주소창에서는 fragment 를 즉시 지운다.
 *
 * 왜 훅을 안 쓰나 — `Linking.useURL()` 은 첫 렌더에 `null` 을 주고 `getInitialURL()`
 * **프로미스**가 풀린 뒤에야 값을 준다. 그 사이에 `app/auth/callback.tsx` 의
 * `<Redirect href="/" />` 가 effect 에서 먼저 돌아 주소를 `/` 로 바꾼다. 프로미스가
 * 풀릴 때는 `#token=` 이 이미 없다 — **토큰을 영영 못 받고 로그인이 무한히 돈다.**
 * 모듈 로드는 렌더보다 먼저라 이 자리에서는 확실히 원래 주소를 본다.
 *
 * **여기서 주소창을 지우지는 않는다.** 모듈 로드 시점에 `replaceState` 를 불러 봤는데
 * 뒤이어 뜨는 expo-router 가 원래 주소를 되돌려서 `#token=` 이 그대로 남았다
 * (2026-09-10 브라우저에서 확인). 지우는 것은 라우터가 자리 잡은 뒤 `forgetCallbackUrl()`
 * 이 한다.
 */
let captured: string | undefined = (() => {
  try {
    const href = window.location.href;
    if (!href.includes("/auth/callback")) return undefined;
    return href;
  } catch {
    return undefined;
  }
})();

/**
 * 다 썼다 — 붙들어 둔 것을 버리고 **주소창에서 `#token=` 을 지운다.**
 *
 * 토큰이 주소창·방문기록·referer 에 남지 않게 한다 (`CLAUDE.md` 2장). 경로는 그대로
 * 두어 라우터가 하던 일(`/auth/callback` → `/`)을 방해하지 않는다.
 */
export function forgetCallbackUrl(): void {
  captured = undefined;
  try {
    if (window.location.hash === "") return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    // 주소창을 못 고쳐도 화면 흐름을 막지 않는다.
  }
}

/** 모듈이 뜰 때 붙들어 둔 콜백 주소. `AuthGate` 가 이것으로 토큰을 꺼낸다 */
export function pendingCallbackUrl(): string | undefined {
  return captured;
}

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
    // 메모리에만 남는다 — 새로고침하면 다시 로그인한다.
  }
}

/** 앱판과 모양을 맞춘다. 웹은 기다릴 것이 없지만 부르는 쪽을 갈라놓지 않는다 */
export async function loadToken(): Promise<string | null> {
  memoryToken = readSession(TOKEN_KEY);
  return memoryToken;
}

export function getToken(): string | null {
  return memoryToken ?? readSession(TOKEN_KEY);
}

/**
 * 콜백에서 받은 토큰을 보관한다.
 *
 * **여기서 재시도 표시를 지우지 않는다.** 토큰을 받은 것과 그 토큰이 통하는 것은 다르다 —
 * 그룹에 없거나 인사 정보에 연결되지 않은 계정도 로그인은 되고 토큰도 받는다.
 * 표시는 `/auth/me` 가 실제로 통했을 때만 지운다(`markAuthenticated`).
 */
export async function setToken(token: string): Promise<void> {
  memoryToken = token;
  writeSession(TOKEN_KEY, token);
}

/** `/auth/me` 가 통했다. 여기서만 재시도 표시를 푼다 */
export function markAuthenticated(): void {
  writeSession(RETRIED_KEY, null);
}

/**
 * 로그아웃 — 토큰을 지우고 **받아 둔 것도 같이 버린다.**
 *
 * 캐시를 비우는 것이 토큰을 지우는 것만큼 중요하다. 같은 브라우저에서 다른 사람이
 * 로그인하면 다시 불러오기 전까지 앞사람의 급여·근태가 그려진다.
 */
export async function clearToken(): Promise<void> {
  memoryToken = null;
  writeSession(TOKEN_KEY, null);
  // 붙들어 둔 콜백도 버린다 — 로그아웃한 뒤에 옛 토큰이 되살아나면 안 된다.
  captured = undefined;
  // 앱판과 같은 이유로 `await` 뒤에 둔다 — 렌더 도중에 캐시를 비우지 않는다.
  queryClient.clear();
}

/**
 * 서버가 돌려보낼 주소. **이 사이트의 `/auth/callback` 이다.**
 *
 * 앱의 `hr://auth/callback` 과 다른 주소이므로 **서버에 따로 등록돼야 한다.**
 * 배포 주소가 바뀌면 여기서 나오는 값도 바뀐다 — 등록을 다시 요청한다.
 */
export function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export function loginUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}/auth/login?redirect=${encodeURIComponent(callbackUrl())}`;
}

/**
 * 사용자가 로그인 버튼을 눌렀을 때.
 *
 * **`api` 인스턴스로 부르지 않는다** — 브라우저가 통째로 이동해야 Keycloak 로그인
 * 화면(OTP 포함)이 뜬다.
 */
export async function startLogin(): Promise<void> {
  writeSession(RETRIED_KEY, null);
  await clearToken();
  window.location.assign(loginUrl());
}

/**
 * 401 을 만났을 때의 자동 재로그인. **한 번만 간다.**
 *
 * 401 이 만료 때문만은 아니다 — 그룹에 없거나 인사 정보에 연결되지 않은 계정도 401 이고,
 * 그 경우는 다시 로그인해도 계속 401 이라 무한 루프에 빠진다.
 */
export async function redirectToLoginOnce(): Promise<boolean> {
  if (readSession(RETRIED_KEY) !== null) return false;

  writeSession(RETRIED_KEY, '1');
  await clearToken();
  window.location.assign(loginUrl());
  return true;
}

export function loginRetryUsed(): boolean {
  return readSession(RETRIED_KEY) !== null;
}

/**
 * 콜백 주소에서 결과를 꺼낸다 — `<사이트>/auth/callback#token=<JWT>`.
 *
 * **fragment 로 온다.** 서버로 전송되지 않아 접근로그에 토큰이 남지 않는다.
 * 앱판과 같은 함수다 — 일부 환경이 쿼리로 넘겨줄 수 있어 둘 다 본다.
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

/** 이 주소가 로그인 콜백인가 */
export function isCallbackUrl(url: string): boolean {
  return url.includes('/auth/callback');
}
