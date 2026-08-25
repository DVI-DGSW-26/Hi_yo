/**
 * 개발용 스텁 인증. **임시다.**
 *
 * 서버가 지금 사내 OAuth 대신 `X-Debug-Employee-No: employee:<직원 id>` 헤더로 돌고 있다.
 * (docs/API_급여.md 1장)
 *
 * 최종 인증 코드를 이 파일에 섞지 않는다. 방식이 확정되면 **이 파일을 통째로 지우고**
 * api.ts의 인터셉터만 바꾼다. 토큰은 그때도 expo-secure-store에만 둔다.
 *
 * 값은 직원 id일 뿐 시크릿이 아니라서 EXPO_PUBLIC_ 로 둘 수 있다.
 * 그래도 `__DEV__`에서만 붙인다. 릴리스 빌드에 개발용 인증 헤더가 실리면 안 된다.
 */

export const DEV_AUTH_HEADER = 'X-Debug-Employee-No';

/**
 * 붙일 헤더 값. 개발 빌드가 아니거나 설정이 없으면 undefined다.
 *
 * 개발 서버 계정 — `1` 관리팀 / `2` 일반 직원 / `3` 관리팀(결재 2단계)
 */
export function devAuthValue(): string | undefined {
  if (!__DEV__) return undefined;

  const employeeId = process.env.EXPO_PUBLIC_DEV_EMPLOYEE_ID;
  if (!employeeId) return undefined;

  return `employee:${employeeId}`;
}
