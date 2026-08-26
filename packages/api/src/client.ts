import axios, { type AxiosInstance } from 'axios';
import { toApiError } from './error';

/**
 * HTTP 클라이언트를 만든다. 앱마다 하나만 만들고, `fetch`를 직접 쓰지 않는다.
 *
 * 인증과 주소는 앱이 넣는다. 모바일은 `expo-secure-store`와 `EXPO_PUBLIC_`,
 * 관리팀 화면은 브라우저와 `VITE_`로 사정이 다르기 때문이다.
 * **이 파일에 인증 방식을 넣지 않는다.**
 */

export interface ApiClientOptions {
  baseURL: string | undefined;
  /**
   * 매 요청에 붙일 헤더. 함수로 받는 이유는 토큰이 갱신되어도 인스턴스를 다시
   * 만들지 않기 위해서다.
   */
  authHeaders?: () => Record<string, string>;
  /** 기본 10초 */
  timeoutMs?: number;
}

export function createApiClient({
  baseURL,
  authHeaders,
  timeoutMs = 10_000,
}: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    for (const [name, value] of Object.entries(authHeaders?.() ?? {})) {
      config.headers.set(name, value);
    }
    return config;
  });

  // 오류는 전부 ApiError 하나로 정규화된다. 화면은 axios 오류 형태를 알 필요가 없다.
  // 여기서 응답 본문을 로그에 남기지 않는다. 급여액·주민번호·계좌번호가 섞일 수 있다.
  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(toApiError(error)),
  );

  return client;
}
