import { describe, expect, it } from 'vitest';
import {
  authorizeUrl,
  codeExchangeBody,
  discoveryOf,
  nextRefreshDelayMs,
  readAuthorizeCallback,
  readTokenResponse,
  refreshBody,
} from './oidc';

/**
 * 앱이 Keycloak 과 직접 붙는 부분.
 *
 * **여기가 틀리면 로그인이 끝나지 않고, 그것을 실기기에서야 안다.** 중계 경로 때 이미
 * 같은 자리에서 두 번 당했다 — `redirect` 를 안 붙여 토큰이 앱으로 올 수 없던 코드
 * (2026-09-01)와, 배포 빌드에서만 슬래시가 셋이 되던 것(2026-09-08).
 *
 * 값은 2026-09-09 discovery 실제 응답에서 가져왔다.
 */

const ISSUER = 'https://api.dvi-ind.com/dauth/realms/dvi';
const REDIRECT = 'hr://auth/callback';

describe('discoveryOf — issuer 하나로 주소 셋을 만든다', () => {
  it('세 경로를 만든다', () => {
    expect(discoveryOf(ISSUER)).toEqual({
      authorizationEndpoint: `${ISSUER}/protocol/openid-connect/auth`,
      tokenEndpoint: `${ISSUER}/protocol/openid-connect/token`,
      endSessionEndpoint: `${ISSUER}/protocol/openid-connect/logout`,
    });
  });

  // issuer 를 환경변수로 받는다. 끝에 슬래시가 붙어 오면 `//protocol` 이 된다.
  it('끝 슬래시가 있어도 같은 주소를 만든다', () => {
    expect(discoveryOf(`${ISSUER}/`)).toEqual(discoveryOf(ISSUER));
  });
});

describe('authorizeUrl — 로그인 화면으로 보낼 주소', () => {
  const url = authorizeUrl({
    issuer: ISSUER,
    clientId: 'hi-yo-app',
    redirectUri: REDIRECT,
    codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    state: 'st4te',
  });
  const query = new URL(url).searchParams;

  it('authorization 경로로 간다', () => {
    expect(url.startsWith(`${ISSUER}/protocol/openid-connect/auth?`)).toBe(true);
  });

  // **`plain` 을 쓰면 주소를 가로챈 쪽이 그대로 토큰을 받아간다.**
  it('PKCE 는 S256 이다', () => {
    expect(query.get('code_challenge_method')).toBe('S256');
    expect(query.get('code_challenge')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  // 중계 경로 때 `redirect` 를 빠뜨려 토큰이 앱으로 올 수 없었다 (2026-09-01).
  it('돌아올 주소를 싣는다', () => {
    expect(query.get('redirect_uri')).toBe(REDIRECT);
  });

  it('클라이언트와 응답 형식을 싣는다', () => {
    expect(query.get('client_id')).toBe('hi-yo-app');
    expect(query.get('response_type')).toBe('code');
    expect(query.get('state')).toBe('st4te');
  });

  it('openid 스코프를 싣는다', () => {
    expect(query.get('scope')?.split(' ')).toContain('openid');
  });
});

describe('readAuthorizeCallback — 콜백에서 코드 꺼내기', () => {
  it('코드와 state 를 꺼낸다', () => {
    expect(readAuthorizeCallback('hr://auth/callback?code=abc&state=st4te')).toEqual({
      code: 'abc',
      state: 'st4te',
    });
  });

  // 배포 빌드에서 슬래시가 셋이 되던 자리다 (2026-09-08).
  it('슬래시가 셋이어도 읽는다', () => {
    expect(readAuthorizeCallback('hr:///auth/callback?code=abc&state=s')).toEqual({
      code: 'abc',
      state: 's',
    });
  });

  // 사용자가 로그인 화면에서 취소하면 이렇게 온다. 앱이 문구를 지어내지 않는다.
  it('오류는 사람이 읽을 설명을 준다', () => {
    expect(
      readAuthorizeCallback('hr://auth/callback?error=access_denied&error_description=거부했어요'),
    ).toEqual({ error: '거부했어요' });
  });

  it('설명이 없으면 오류 코드를 그대로 준다', () => {
    expect(readAuthorizeCallback('hr://auth/callback?error=access_denied')).toEqual({
      error: 'access_denied',
    });
  });

  it('아무것도 없으면 빈 것을 준다', () => {
    expect(readAuthorizeCallback('hr://auth/callback')).toEqual({});
  });

  // 오류가 코드보다 먼저다 — 둘 다 온 응답을 성공으로 읽으면 안 된다.
  it('오류가 있으면 코드보다 먼저 본다', () => {
    expect(readAuthorizeCallback('hr://auth/callback?code=abc&error=bad')).toEqual({
      error: 'bad',
    });
  });
});

describe('codeExchangeBody / refreshBody — 토큰 요청 본문', () => {
  // **`code_verifier` 를 빠뜨리면 PKCE 가 무의미해지고 서버가 400 을 준다.**
  it('교환 본문에 verifier 를 싣는다', () => {
    const body = new URLSearchParams(
      codeExchangeBody({
        clientId: 'hi-yo-app',
        code: 'abc',
        redirectUri: REDIRECT,
        codeVerifier: 'v3rif13r',
      }),
    );
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code_verifier')).toBe('v3rif13r');
    expect(body.get('redirect_uri')).toBe(REDIRECT);
    expect(body.get('client_id')).toBe('hi-yo-app');
  });

  // 공개 클라이언트다. 시크릿을 싣지 않는다 — 앱 번들에 넣을 시크릿이 없다.
  it('시크릿을 싣지 않는다', () => {
    const body = codeExchangeBody({
      clientId: 'hi-yo-app',
      code: 'abc',
      redirectUri: REDIRECT,
      codeVerifier: 'v',
    });
    expect(body).not.toContain('client_secret');
  });

  it('갱신 본문', () => {
    const body = new URLSearchParams(
      refreshBody({ clientId: 'hi-yo-app', refreshToken: 'r3fr3sh' }),
    );
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('r3fr3sh');
  });
});

describe('readTokenResponse — 토큰 응답 읽기', () => {
  it('셋을 꺼낸다', () => {
    expect(
      readTokenResponse({ access_token: 'a', refresh_token: 'r', expires_in: 900 }),
    ).toEqual({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 });
  });

  // **빈 토큰을 토큰으로 치면 그 값으로 헤더를 만들어 계속 401 을 맞는다.**
  it('access_token 이 없거나 비면 실패로 본다', () => {
    expect(readTokenResponse({ refresh_token: 'r' })).toBeNull();
    expect(readTokenResponse({ access_token: '' })).toBeNull();
    expect(readTokenResponse(null)).toBeNull();
    expect(readTokenResponse('그냥 문자열')).toBeNull();
  });

  it('갱신 토큰이 없으면 null 로 둔다', () => {
    expect(readTokenResponse({ access_token: 'a' })).toEqual({
      accessToken: 'a',
      refreshToken: null,
      expiresIn: null,
    });
  });
});

describe('nextRefreshDelayMs — 만료 1분 전에 미리 부른다', () => {
  // 401 을 받고 나서 갱신하면 그 요청은 이미 실패한 뒤다 (서버 안내 2026-09-08).
  it('15분이면 14분 뒤', () => {
    expect(nextRefreshDelayMs(900)).toBe(840_000);
  });

  // 수명이 아주 짧게 와도 30초보다 자주 부르지 않는다.
  it('짧게 와도 30초보다 자주 부르지 않는다', () => {
    expect(nextRefreshDelayMs(30)).toBe(30_000);
    expect(nextRefreshDelayMs(1)).toBe(30_000);
  });

  it('수명을 모르면 주기를 잡지 않는다', () => {
    expect(nextRefreshDelayMs(null)).toBe(false);
  });
});
