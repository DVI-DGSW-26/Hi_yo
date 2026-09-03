/**
 * `expo-linking` 대역.
 *
 * **테스트하려는 함수들은 이걸 쓰지 않는다.** `readCallbackUrl`·`isCallbackUrl` 은
 * 문자열만 다루는데, 같은 파일(`lib/auth.ts`)이 위에서 `expo-linking` 을 불러와서
 * 노드에서 그대로 읽으면 모듈을 못 찾는다. **읽히게만 하는 것이 목적이다.**
 *
 * `createURL` 만 값이 쓰인다 — `loginUrl()` 이 붙이는 `redirect` 를 확인하려면
 * 돌아올 주소가 정해져 있어야 한다. 실제 값은 개발 빌드마다 다르다.
 */
export const STUB_CALLBACK_URL = 'hr://auth/callback';

export function createURL(path: string): string {
  return `hr://${path.replace(/^\//, '')}`;
}

export function openURL(): Promise<void> {
  throw new Error('테스트에서 브라우저를 열지 않는다');
}

export function useURL(): string | null {
  return null;
}
