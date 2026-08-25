import axios from 'axios';
import { toApiError } from './apiError';
import { DEV_AUTH_HEADER, devAuthValue } from './devAuth';

// 앱의 유일한 HTTP 클라이언트. fetch를 직접 쓰지 않는다.
// baseURL은 시크릿이 아니므로 EXPO_PUBLIC_ 로 둔다. 토큰·키는 절대 여기 넣지 않는다.
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (__DEV__ && !baseURL) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL 이 없습니다. apps/mobile/.env.example 을 .env 로 복사한 뒤 다시 실행하세요.',
  );
}

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// TODO: 인증 방식(토큰 형태, 갱신 규칙)이 확정되면 이 인터셉터를 그것으로 바꾼다.
// 토큰은 expo-secure-store에만 저장한다. AsyncStorage를 쓰지 않는다.
// 지금 붙는 것은 개발용 스텁 헤더뿐이다 (devAuth.ts). 릴리스 빌드에는 붙지 않는다.
api.interceptors.request.use((config) => {
  const devAuth = devAuthValue();
  if (devAuth) {
    config.headers.set(DEV_AUTH_HEADER, devAuth);
  }
  return config;
});

// 오류는 전부 ApiError 하나로 정규화된다. 화면은 axios 오류 형태를 알 필요가 없다.
// 여기서 응답 본문을 로그에 남기지 않는다. 급여액·주민번호·계좌번호가 섞일 수 있다.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);

/**
 * 목록 응답의 공통 봉투. 배열이 아니라 이 모양으로 온다.
 *
 * `page`는 0부터다. **급여 엔드포인트만 예외적으로 배열을 그대로 준다** (docs/API_급여.md 1장).
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** 목록 요청의 공통 파라미터. 서버는 Spring Pageable을 평평한 쿼리로 받는다. */
export interface PageParams {
  page?: number;
  size?: number;
  sort?: string[];
}
