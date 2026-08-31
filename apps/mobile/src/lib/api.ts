import { createApiClient } from '@hr/api';
import { DEV_AUTH_HEADER, devAuthValue } from './devAuth';

// 앱의 유일한 HTTP 클라이언트. fetch를 직접 쓰지 않는다.
// 오류 정규화와 인터셉터는 @hr/api 가 한다. 관리팀 화면과 같은 규칙을 쓴다.
// baseURL은 시크릿이 아니므로 EXPO_PUBLIC_ 로 둔다. 토큰·키는 절대 여기 넣지 않는다.
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (__DEV__ && !baseURL) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL 이 없습니다. apps/mobile/.env.example 을 .env 로 복사한 뒤 다시 실행하세요.',
  );
}

// TODO: 인증 방식(토큰 형태, 갱신 규칙)이 확정되면 authHeaders 를 그것으로 바꾼다.
// 토큰은 expo-secure-store에만 저장한다. AsyncStorage를 쓰지 않는다.
// 지금 붙는 것은 개발용 스텁 헤더뿐이다 (devAuth.ts). 릴리스 빌드에는 붙지 않는다.
export const api = createApiClient({ baseURL, authHeaders });

/**
 * axios를 타지 않는 요청에 같은 인증을 붙이기 위한 헤더.
 *
 * 파일 내려받기(expo-file-system)는 자기 네트워크 계층을 쓴다. 인증을 두 군데에 적어두면
 * 방식이 바뀔 때 한쪽이 남는다. 붙일 헤더는 이 함수 하나에서만 만든다.
 */
export function authHeaders(): Record<string, string> {
  const devAuth = devAuthValue();
  return devAuth ? { [DEV_AUTH_HEADER]: devAuth } : {};
}

/** 파일 내려받기처럼 절대 주소가 필요할 때 쓴다 */
export function apiUrl(path: string): string {
  return `${baseURL ?? ''}${path}`;
}

export type { PageResponse, PageParams } from '@hr/api';
export { MAX_PAGE_SIZE } from '@hr/api';

/**
 * 목록 한 쪽의 크기. 폰에서 한 번에 읽을 만한 양이다.
 *
 * 서버 상한(`MAX_PAGE_SIZE` 100)보다 훨씬 작게 둔다. 목록은 `더 보기`로 이어 붙이므로
 * 한 번에 많이 받을 이유가 없고, 첫 화면이 빨리 뜨는 편이 낫다.
 */
export const LIST_PAGE_SIZE = 20;
