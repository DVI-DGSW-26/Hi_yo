import axios from 'axios';

// 앱의 유일한 HTTP 클라이언트. fetch를 직접 쓰지 않는다.
// baseURL은 시크릿이 아니므로 EXPO_PUBLIC_ 로 둔다. 토큰·키는 절대 여기 넣지 않는다.
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// TODO: 인증 방식(토큰 형태, 갱신 규칙)이 확정되면 인터셉터를 붙인다.
// 토큰은 expo-secure-store에만 저장한다. AsyncStorage를 쓰지 않는다.
// 에러 로깅을 붙일 때 급여액·주민번호·계좌번호·토큰이 메시지에 섞이지 않는지 확인한다.
