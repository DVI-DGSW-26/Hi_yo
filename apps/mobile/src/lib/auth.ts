import axios from 'axios';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import {
  authorizeUrl,
  codeExchangeBody,
  discoveryOf,
  readAuthorizeCallback,
  readTokenResponse,
  refreshBody,
  type TokenSet,
} from './oidc';
import { queryClient } from './queryClient';
import { isCallbackUrl } from './relayCallback';

/**
 * DVI 통합 로그인(Keycloak) — **앱이 직접 붙는다** (2026-09-10 전환).
 *
 * 그전에는 서버가 중계했다. 그 경로는 **없어지지 않고** 관리팀 웹과 이 앱의 웹판이
 * 계속 쓴다 (백엔드 30·31·32번 회신, 2026-09-09) — 웹판은 `auth.web.ts` 다.
 *
 * **왜 옮겼나.** 중계 경로는 액세스 토큰만 주고 갱신 수단이 없었다. 수명이 15분이라
 * 직원이 15분마다 다시 로그인해야 했다. 직접 붙으면 `refresh_token` 을 받는다.
 *
 * 흐름
 * 1. 로그인 버튼 → PKCE 한 쌍을 만들어 보관하고 시스템 브라우저로 Keycloak 을 연다
 * 2. Keycloak 이 `hr://auth/callback?code=...&state=...` 로 앱을 깨운다
 * 3. `state` 를 대조하고 `code` 를 토큰으로 바꾼다 — 이때 `code_verifier` 를 같이 낸다
 * 4. 액세스·갱신 토큰을 `expo-secure-store` 에 둔다 (`CLAUDE.md` 2장)
 *
 * **`expo-auth-session` 을 쓰지 않았다.** 그쪽은 `expo-web-browser` 까지 딸려와 둘이
 * 늘고, **이미 실기기에서 통과한 딥링크 경로를 갈아엎게 된다** (2026-09-08 확인).
 * PKCE 해시에 필요한 `expo-crypto` 하나만 더했다 (`CLAUDE.md` 7장).
 *
 * **콜백 주소는 등록돼 있다** — `hi-yo-app` + `hr://auth/callback` 으로 authorization
 * 요청을 보내면 Keycloak 이 로그인 화면을 준다 (2026-09-10 실호출로 확인).
 */

const TOKEN_KEY = 'hr.accessToken';
const REFRESH_KEY = 'hr.refreshToken';
/** 브라우저에 다녀오는 동안 보관하는 PKCE 한 쌍. 로그인이 끝나면 지운다 */
const PENDING_KEY = 'hr.loginPending';

const issuer = process.env.EXPO_PUBLIC_OIDC_ISSUER ?? '';
const clientId = process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? '';

if (__DEV__ && (!issuer || !clientId)) {
  throw new Error(
    'EXPO_PUBLIC_OIDC_ISSUER / EXPO_PUBLIC_OIDC_CLIENT_ID 가 없습니다. apps/mobile/.env.example 을 보세요.',
  );
}

/**
 * 메모리에 든 토큰.
 *
 * SecureStore는 비동기라 매 요청마다 기다릴 수 없다. 앱이 뜰 때 한 번 읽어 여기 두고,
 * `authHeaders()`는 이 값만 본다.
 */
let memoryToken: string | null = null;
let memoryRefreshToken: string | null = null;

/** 401 자동 재로그인을 한 번만 하기 위한 표시. 앱이 살아 있는 동안만 유지된다 */
let loginRetried = false;

async function readSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // 기기 보안 저장소를 못 쓰는 경우. 이번 실행에서는 다시 로그인한다.
    return null;
  }
}

async function writeSecure(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // 저장에 실패해도 이번 실행은 메모리 토큰으로 돈다.
  }
}

/** 앱이 뜰 때 한 번 부른다. 저장해 둔 토큰을 메모리로 올린다 */
export async function loadToken(): Promise<string | null> {
  memoryToken = await readSecure(TOKEN_KEY);
  memoryRefreshToken = await readSecure(REFRESH_KEY);
  return memoryToken;
}

export function getToken(): string | null {
  return memoryToken;
}

/**
 * 받은 토큰 묶음을 보관한다.
 *
 * **여기서 재시도 표시를 지우지 않는다.** 토큰을 받은 것과 그 토큰이 통하는 것은 다르다 —
 * 그룹에 없거나 인사 정보에 연결되지 않은 계정도 로그인은 되고 토큰도 받는다.
 * 여기서 지우면 `401 → 로그인 → 토큰 → 401`이 끝없이 돈다.
 */
export async function setTokens(tokens: TokenSet): Promise<void> {
  memoryToken = tokens.accessToken;
  await writeSecure(TOKEN_KEY, tokens.accessToken);

  // **갱신 토큰이 안 오면 있던 것을 지우지 않는다.** Keycloak 설정에 따라 갱신 응답이
  // 새 갱신 토큰을 안 줄 수 있는데, 그때 지우면 다음 갱신을 못 한다.
  if (tokens.refreshToken !== null) {
    memoryRefreshToken = tokens.refreshToken;
    await writeSecure(REFRESH_KEY, tokens.refreshToken);
  }
}

/** `/auth/me`가 통했다. 여기서만 재시도 표시를 푼다 */
export function markAuthenticated(): void {
  loginRetried = false;
}

/**
 * 로그아웃 — 토큰을 지우고 **받아 둔 것도 같이 버린다.**
 *
 * **캐시를 비우는 것이 토큰을 지우는 것만큼 중요하다** (2026-09-03).
 * 앱은 로그인하러 시스템 브라우저로 갔다 오는 동안에도 **살아 있다.** 토큰만 지우면
 * 급여명세서 금액·근태·인사정보가 쿼리 캐시에 그대로 남아서, 같은 기기에서 다른 사람이
 * 로그인하면 **다시 불러오기 전까지 앞사람 값이 그려진다.** 급여를 다루는 앱에서 그건 사고다.
 */
export async function clearToken(): Promise<void> {
  memoryToken = null;
  memoryRefreshToken = null;
  await writeSecure(TOKEN_KEY, null);
  await writeSecure(REFRESH_KEY, null);
  await writeSecure(PENDING_KEY, null);
  // **캐시 비우기를 `await` 뒤에 둔다.** `AuthGate`가 401을 만나면 렌더 도중에
  // `redirectToLoginOnce()`를 부르는데, 그 자리에서 캐시를 비우면 쿼리를 보고 있는
  // 컴포넌트들이 렌더 중에 갱신된다.
  queryClient.clear();
}

/**
 * 서버가 돌려보낼 앱 주소. 배포 빌드에서 `hr://auth/callback`이 된다.
 *
 * **경로에 앞 슬래시를 붙이지 않는다.** `'/auth/callback'`으로 부르면 배포 빌드에서
 * **`hr:///auth/callback`(슬래시 3개)이 나온다** — 2026-09-08 실기기에서 확인했다.
 * 개발 빌드에서는 드러나지 않는다. 브라우저로도 개발 빌드로도 못 잡고, 배포 APK를
 * 실기기에 올려야 보이는 버그였다.
 */
export function callbackUrl(): string {
  return Linking.createURL('auth/callback');
}

/** base64url. **`+/=` 를 그대로 두면 PKCE 대조가 실패한다** (RFC 7636) */
function toBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBase64Url(byteCount: number): string {
  const bytes = Crypto.getRandomBytes(byteCount);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return toBase64Url(globalThis.btoa(binary));
}

/** PKCE 한 쌍과 state. 난수는 기기 보안 난수를 쓴다 */
async function createPending(): Promise<{ verifier: string; challenge: string; state: string }> {
  const verifier = randomBase64Url(32);
  const state = randomBase64Url(16);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );

  return { verifier, challenge: toBase64Url(digest), state };
}

/**
 * 로그인 화면 주소를 만든다.
 *
 * **돌아올 주소를 반드시 싣는다.** 중계 경로 때 이것을 빠뜨려 **토큰이 앱으로 영영 오지
 * 않는** 코드였던 적이 있다 (2026-09-01 고침). 방식이 바뀌어도 같은 자리다.
 */
export function buildAuthorizeUrl(codeChallenge: string, state: string): string {
  return authorizeUrl({
    issuer,
    clientId,
    redirectUri: callbackUrl(),
    codeChallenge,
    state,
  });
}

async function openLogin(): Promise<void> {
  const pending = await createPending();
  // **브라우저에 다녀오는 사이 앱이 꺼질 수 있다.** 메모리에 두면 verifier 를 잃고
  // 로그인이 끝나지 않는다. 보안 저장소에 둔다.
  await writeSecure(PENDING_KEY, JSON.stringify(pending));
  await Linking.openURL(buildAuthorizeUrl(pending.challenge, pending.state));
}

/** 사용자가 로그인 버튼을 눌렀을 때. 시스템 브라우저가 열린다 */
export async function startLogin(): Promise<void> {
  loginRetried = false;
  await clearToken();
  await openLogin();
}

/**
 * 401을 만났을 때의 자동 재로그인. **한 번만 간다.**
 *
 * 401이 만료 때문만은 아니다 — Keycloak 그룹에 없거나 인사 정보에 연결되지 않은 계정도
 * 401이고, 그 경우는 다시 로그인해도 계속 401이라 무한 루프에 빠진다.
 */
export async function redirectToLoginOnce(): Promise<boolean> {
  if (loginRetried) return false;

  loginRetried = true;
  await clearToken();
  await openLogin();
  return true;
}

export function loginRetryUsed(): boolean {
  return loginRetried;
}

/** 이 딥링크가 로그인 콜백인가. 두 방식이 같은 경로로 돌아온다 */
export { isCallbackUrl };

/** 웹판에만 실체가 있다. 앱은 `Linking.useURL()` 이 딥링크를 그대로 준다 */
export function pendingCallbackUrl(): string | undefined {
  return undefined;
}

/** 웹판에만 실체가 있다. 앱은 주소창이 없다 */
export function forgetCallbackUrl(): void {
  // 앱에서는 할 일이 없다.
}

/**
 * 토큰 요청.
 *
 * **`api` 인스턴스를 쓰지 않는다.** 그쪽은 HR 서버(`baseURL`)로 가고 `Authorization`
 * 헤더를 붙인다. 여기는 Keycloak 이고, 공개 클라이언트라 실을 시크릿도 없다.
 */
async function postToken(body: string): Promise<TokenSet | null> {
  const { data } = await axios.post(discoveryOf(issuer).tokenEndpoint, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return readTokenResponse(data);
}

/**
 * 콜백을 받아 로그인을 끝낸다.
 *
 * **`state` 를 대조한다.** 다른 곳에서 밀어 넣은 콜백으로 엉뚱한 세션에 붙는 것을 막는다.
 *
 * 오류 메시지에 `code` 나 토큰을 넣지 않는다 (`CLAUDE.md` 2장).
 */
export async function handleCallback(
  url: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { code, state, error } = readAuthorizeCallback(url);
  if (error !== undefined) return { ok: false, error };
  if (code === undefined) return { ok: false, error: '로그인 결과를 받지 못했어요.' };

  const savedRaw = await readSecure(PENDING_KEY);
  if (savedRaw === null) return { ok: false, error: '로그인을 처음부터 다시 해주세요.' };

  let saved: { verifier?: string; state?: string } = {};
  try {
    saved = JSON.parse(savedRaw) as { verifier?: string; state?: string };
  } catch {
    saved = {};
  }

  if (saved.verifier === undefined || saved.state !== state) {
    await writeSecure(PENDING_KEY, null);
    return { ok: false, error: '로그인을 처음부터 다시 해주세요.' };
  }

  try {
    const tokens = await postToken(
      codeExchangeBody({
        clientId,
        code,
        redirectUri: callbackUrl(),
        codeVerifier: saved.verifier,
      }),
    );
    if (tokens === null) return { ok: false, error: '로그인 결과를 받지 못했어요.' };

    await setTokens(tokens);
    return { ok: true };
  } catch {
    // 서버 응답 본문에는 코드·토큰이 섞인다. 화면에 그대로 내보내지 않는다.
    return { ok: false, error: '로그인을 마치지 못했어요. 잠시 후 다시 시도해주세요.' };
  } finally {
    await writeSecure(PENDING_KEY, null);
  }
}

/**
 * 액세스 토큰 갱신.
 *
 * **실패해도 로그아웃시키지 않는다.** 지금 들고 있는 토큰이 아직 살아 있을 수 있고,
 * 토큰이 실제로 죽는 순간 401 이 와서 기존 재로그인 경로가 받는다. 갱신은 **더 나은
 * 경로일 뿐 유일한 경로가 아니다** — 관리팀 화면과 같은 판단이다 (2026-09-09).
 *
 * @returns 남은 수명(초). 갱신하지 못했으면 `null`
 */
export async function refreshTokens(): Promise<number | null> {
  if (memoryRefreshToken === null) return null;

  try {
    const tokens = await postToken(refreshBody({ clientId, refreshToken: memoryRefreshToken }));
    if (tokens === null) return null;

    await setTokens(tokens);
    return tokens.expiresIn;
  } catch {
    return null;
  }
}

/** 갱신을 시도할 수 있는가. 없으면 만료 시 재로그인뿐이다 */
export function canRefresh(): boolean {
  return memoryRefreshToken !== null;
}
