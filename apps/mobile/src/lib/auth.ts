import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { queryClient } from './queryClient';

/**
 * DVI 통합 로그인(Keycloak) 연동 — 모바일.
 *
 * 관리팀 화면(`apps/admin/src/lib/auth.ts`)과 같은 흐름이다. 다른 것은 둘뿐이다 —
 * **돌아오는 곳이 웹 주소가 아니라 앱 딥링크(`hr://auth/callback`)이고,
 * 토큰을 `expo-secure-store`에 둔다** (`CLAUDE.md` 2장. `AsyncStorage`를 쓰지 않는다).
 *
 * 흐름
 * 1. 로그인 버튼 → 시스템 브라우저로 `/auth/login?redirect=<앱 딥링크>` 열기
 * 2. 서버가 `hr://auth/callback#token=<JWT>` 로 돌려보낸다 → OS가 앱을 깨운다
 * 3. 토큰을 SecureStore에 넣고 이후 요청에 `Authorization: Bearer` 로 붙인다
 *
 * **`expo-web-browser`를 쓰지 않았다.** 앱 안에서 열리는 로그인 시트가 더 매끄럽지만
 * 라이브러리가 하나 늘어난다 (`CLAUDE.md` 7장). 이미 있는 `expo-linking`으로 시스템
 * 브라우저를 열어도 같은 결과가 나온다. 시트가 필요해지면 그때 제안한다.
 *
 * **`hr://auth/callback`이 아직 등록되지 않았다** (2026-09-01 실호출 확인).
 * 그 주소로 `redirect`를 넣어 부르면 서버가 이렇게 답한다 —
 * `400 등록되지 않은 콜백 주소입니다. 백엔드에 이 주소를 알려주세요: hr://auth/callback`
 *
 * 커스텀 스킴을 받아주지 않는 것이 아니라 **등록만 안 된 것이다.** 등록되면 그날 바로
 * 돈다. 개발 빌드는 앞이 달라지므로 로그인 화면이 `callbackUrl()` 값을 띄우고,
 * 기기에서 읽어 그 값도 같이 등록을 요청한다.
 */

const TOKEN_KEY = 'hr.accessToken';

/**
 * 메모리에 든 토큰.
 *
 * SecureStore는 비동기라 매 요청마다 기다릴 수 없다. 앱이 뜰 때 한 번 읽어 여기 두고,
 * `authHeaders()`는 이 값만 본다.
 */
let memoryToken: string | null = null;

/** 401 자동 재로그인을 한 번만 하기 위한 표시. 앱이 살아 있는 동안만 유지된다 */
let loginRetried = false;

/** 앱이 뜰 때 한 번 부른다. 저장해 둔 토큰을 메모리로 올린다 */
export async function loadToken(): Promise<string | null> {
  try {
    memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // 기기 보안 저장소를 못 쓰는 경우. 이번 실행에서는 다시 로그인한다.
    memoryToken = null;
  }
  return memoryToken;
}

export function getToken(): string | null {
  return memoryToken;
}

/**
 * 콜백에서 받은 토큰을 보관한다.
 *
 * **여기서 재시도 표시를 지우지 않는다.** 토큰을 받은 것과 그 토큰이 통하는 것은 다르다 —
 * 그룹에 없거나 인사 정보에 연결되지 않은 계정도 로그인은 되고 토큰도 받는다.
 * 여기서 지우면 `401 → 로그인 → 토큰 → 401`이 끝없이 돈다.
 */
export async function setToken(token: string): Promise<void> {
  memoryToken = token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // 저장에 실패해도 이번 실행은 메모리 토큰으로 돈다. 앱을 다시 켜면 로그인한다.
  }
}

/** `/auth/me`가 통했다. 여기서만 재시도 표시를 푼다 */
export function markAuthenticated(): void {
  loginRetried = false;
}

/**
 * 로그아웃 — 토큰을 지우고 **받아 둔 것도 같이 버린다.** 전 서비스 동시 로그아웃은 아직 없다.
 *
 * **캐시를 비우는 것이 토큰을 지우는 것만큼 중요하다** (2026-09-03).
 * 앱은 로그인하러 시스템 브라우저로 갔다 오는 동안에도 **살아 있다.** 토큰만 지우면
 * 급여명세서 금액·근태·인사정보가 쿼리 캐시에 그대로 남아서, 같은 기기에서 다른 사람이
 * 로그인하면 **다시 불러오기 전까지 앞사람 값이 그려진다.** 급여를 다루는 앱에서 그건 사고다.
 *
 * 관리팀 화면은 로그아웃이 `window.location`으로 페이지를 통째로 옮겨서 지금도 남지 않지만,
 * 같은 자리에서 같은 것을 보장하도록 그쪽도 여기서 비운다.
 */
export async function clearToken(): Promise<void> {
  memoryToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // 지우지 못해도 메모리에서는 사라진다.
  }
  // **캐시 비우기를 `await` 뒤에 둔다.** `AuthGate`가 401을 만나면 렌더 도중에
  // `redirectToLoginOnce()`를 부르는데, 그 자리에서 캐시를 비우면 쿼리를 보고 있는
  // 컴포넌트들이 렌더 중에 갱신된다. `await` 뒤로 미루면 렌더가 끝난 뒤에 돈다.
  queryClient.clear();
}

/**
 * 서버가 돌려보낼 앱 주소.
 *
 * `app.json`의 `scheme`이 `hr`이라 `hr://auth/callback`이 된다. 개발 중 Expo 개발 빌드에서는
 * 앞이 달라질 수 있어 `expo-linking`에게 만들게 한다 — 그 값을 그대로 서버에 등록한다.
 */
export function callbackUrl(): string {
  return Linking.createURL('/auth/callback');
}

/**
 * 로그인 시작 주소.
 *
 * **`redirect`에 앱 딥링크를 실어 보낸다.** 이것을 빠뜨리면 서버가 웹 기본 콜백으로
 * 돌려보내서 **토큰이 앱으로 영영 오지 않는다.** `callbackUrl()`을 만들어 두고도 여기에
 * 붙이지 않고 있었다 (2026-09-01 고침).
 *
 * 등록되지 않은 주소면 서버가 **400과 함께 그 주소를 그대로 찍어** 준다. 개발 빌드는
 * 앞이 달라지므로 로그인 화면이 그 값을 띄우고, 기기에서 읽어 서버에 등록을 요청한다.
 */
export function loginUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}/auth/login?redirect=${encodeURIComponent(callbackUrl())}`;
}

/** 사용자가 로그인 버튼을 눌렀을 때. 시스템 브라우저가 열린다 */
export async function startLogin(): Promise<void> {
  loginRetried = false;
  await clearToken();
  await Linking.openURL(loginUrl());
}

/**
 * 401을 만났을 때의 자동 재로그인. **한 번만 간다.**
 *
 * 401이 만료 때문만은 아니다 — Keycloak 그룹에 없거나 인사 정보에 연결되지 않은 계정도
 * 401이고, 그 경우는 다시 로그인해도 계속 401이라 무한 루프에 빠진다.
 *
 * @returns 브라우저를 열었으면 `true`. 이미 한 번 갔다 왔으면 `false`
 */
export async function redirectToLoginOnce(): Promise<boolean> {
  if (loginRetried) return false;

  loginRetried = true;
  await clearToken();
  await Linking.openURL(loginUrl());
  return true;
}

export function loginRetryUsed(): boolean {
  return loginRetried;
}

/**
 * 딥링크에서 결과를 꺼낸다 — `hr://auth/callback#token=<JWT>`.
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

/** 이 딥링크가 로그인 콜백인가 */
export function isCallbackUrl(url: string): boolean {
  return url.includes('/auth/callback');
}
