import { createApiClient } from '@hr/api';
import { DEV_AUTH_HEADER, devAuthValue } from './devAuth';

// 관리팀 화면의 유일한 HTTP 클라이언트. fetch를 직접 쓰지 않는다.
// 오류 정규화와 인터셉터는 @hr/api 가 한다. 모바일과 같은 규칙을 쓴다.
const baseURL = import.meta.env.VITE_API_BASE_URL;

if (import.meta.env.DEV && !baseURL) {
  throw new Error(
    'VITE_API_BASE_URL 이 없습니다. apps/admin/.env.example 을 .env 로 복사한 뒤 다시 실행하세요.',
  );
}

// TODO: 인증 방식이 확정되면 authHeaders 를 그것으로 바꾼다.
// 지금 붙는 것은 개발용 스텁 헤더뿐이다 (devAuth.ts). 운영 빌드에는 붙지 않는다.
export const api = createApiClient({ baseURL, authHeaders });

export function authHeaders(): Record<string, string> {
  const devAuth = devAuthValue();
  return devAuth ? { [DEV_AUTH_HEADER]: devAuth } : {};
}

export type { PageResponse, PageParams } from '@hr/api';
