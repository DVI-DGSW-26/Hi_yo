import { describe, expect, it } from 'vitest';
import { callbackUrl, isCallbackUrl, loginUrl, readCallbackUrl } from './auth';

/**
 * 로그인 딥링크를 읽는 부분.
 *
 * **여기가 틀리면 로그인이 끝나지 않는다.** 서버가 `hr://auth/callback#token=<JWT>` 로
 * 앱을 깨우는데, 그 문자열에서 토큰을 못 꺼내면 사용자는 브라우저를 다녀오고도 계속
 * 로그인 화면을 본다. 이 언저리에서 이미 한 번 사고가 났다 — `callbackUrl()` 을 만들어
 * 두고 `loginUrl()` 에 붙이지 않아서 **토큰이 앱으로 올 수 없는 코드**였다 (2026-09-01).
 *
 * `expo-linking`·`expo-secure-store` 는 노드에서 읽히게만 한 대역이다
 * (`tests/stubs`. `vitest.config.mts`). 아래 함수들은 그것을 쓰지 않는다 —
 * `loginUrl()` 만 돌아올 주소가 필요해서 대역의 `createURL` 값을 쓴다.
 */

describe('readCallbackUrl — fragment 에서 토큰 꺼내기', () => {
  // fragment 로 오는 이유는 **서버로 전송되지 않아 접근로그에 토큰이 남지 않아서**다.
  it('토큰을 꺼낸다', () => {
    expect(readCallbackUrl('hr://auth/callback#token=abc.def.ghi')).toEqual({
      token: 'abc.def.ghi',
    });
  });

  it('서버가 보낸 사유를 꺼낸다', () => {
    expect(readCallbackUrl('hr://auth/callback#error=로그인하지 못했습니다.')).toEqual({
      error: '로그인하지 못했습니다.',
    });
  });

  it('퍼센트 인코딩을 푼다', () => {
    expect(readCallbackUrl('hr://auth/callback#error=%EA%B6%8C%ED%95%9C%20%EC%97%86%EC%9D%8C')).toEqual(
      { error: '권한 없음' },
    );
  });

  it('다른 값이 같이 와도 토큰을 찾는다', () => {
    expect(readCallbackUrl('hr://auth/callback#state=xyz&token=abc&expires=3600')).toEqual({
      token: 'abc',
    });
  });
});

describe('readCallbackUrl — 쿼리로 오는 경우', () => {
  // 일부 환경이 fragment 대신 쿼리로 넘겨줄 수 있어 둘 다 본다.
  it('쿼리에서도 꺼낸다', () => {
    expect(readCallbackUrl('hr://auth/callback?token=abc')).toEqual({ token: 'abc' });
    expect(readCallbackUrl('hr://auth/callback?error=안됨')).toEqual({ error: '안됨' });
  });

  // 쿼리와 fragment 가 같이 오면 fragment 가 먼저다 — 토큰이 오는 자리가 그쪽이다.
  it('둘 다 있으면 fragment 를 먼저 본다', () => {
    expect(readCallbackUrl('hr://auth/callback?token=쿼리&#token=프래그먼트')).toEqual({
      token: '프래그먼트',
    });
  });

  // `?` 가 `#` 뒤에 오면 쿼리 조각을 잘라낼 수 없다. 그래도 fragment 는 읽혀야 한다.
  it('물음표가 우물정 뒤에 있어도 터지지 않는다', () => {
    expect(readCallbackUrl('hr://auth/callback#token=abc?x=1')).toEqual({ token: 'abc?x=1' });
  });
});

describe('readCallbackUrl — 아무것도 없을 때', () => {
  it('토큰도 사유도 없으면 빈 것을 준다', () => {
    expect(readCallbackUrl('hr://auth/callback')).toEqual({});
    expect(readCallbackUrl('hr://auth/callback#state=xyz')).toEqual({});
    expect(readCallbackUrl('')).toEqual({});
  });

  // 빈 토큰을 토큰으로 치면 그 값으로 `Authorization` 헤더를 만들어 계속 401 을 맞는다.
  it('빈 토큰을 토큰으로 치지 않는다', () => {
    expect(readCallbackUrl('hr://auth/callback#token=')).toEqual({});
  });

  it('빈 사유도 사유로 치지 않는다', () => {
    expect(readCallbackUrl('hr://auth/callback#error=')).toEqual({});
  });
});

describe('isCallbackUrl — 이 딥링크가 콜백인가', () => {
  it('콜백 주소를 알아본다', () => {
    expect(isCallbackUrl('hr://auth/callback#token=abc')).toBe(true);
    // 개발 빌드는 앞이 다르다. 뒷부분으로 가린다.
    expect(isCallbackUrl('exp://192.168.0.2:8081/--/auth/callback#token=abc')).toBe(true);
  });

  it('다른 딥링크는 아니다', () => {
    expect(isCallbackUrl('hr://leave')).toBe(false);
    expect(isCallbackUrl('')).toBe(false);
  });
});

describe('loginUrl — redirect 를 반드시 싣는다', () => {
  /*
   * **이것을 빠뜨리면 서버가 웹 기본 콜백으로 돌려보내서 토큰이 앱으로 영영 오지 않는다.**
   * 실제로 그런 코드였다 (2026-09-01 고침). 그래서 여기를 테스트로 박아 둔다.
   */
  it('redirect 에 돌아올 주소를 인코딩해 붙인다', () => {
    const url = loginUrl();
    expect(url).toContain('/auth/login?redirect=');
    expect(url).toContain(encodeURIComponent(callbackUrl()));
  });

  it('돌아올 주소는 콜백으로 알아볼 수 있는 것이다', () => {
    expect(isCallbackUrl(callbackUrl())).toBe(true);
  });
});
