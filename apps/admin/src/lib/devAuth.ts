/**
 * 개발용 스텁 인증. **임시다.**
 *
 * 서버가 지금 사내 OAuth 대신 `X-Debug-Employee-No: employee:<직원 id>` 헤더로 돌고 있다.
 * (docs/API_급여.md 1장)
 *
 * 최종 인증 코드를 이 파일에 섞지 않는다. 방식이 확정되면 **이 파일을 통째로 지우고**
 * api.ts만 바꾼다.
 *
 * 값은 직원 id일 뿐 시크릿이 아니라서 `VITE_`로 둘 수 있다. `VITE_` 값은 번들에 평문으로
 * 들어간다. 시크릿을 여기 넣지 않는다. 그리고 개발 모드에서만 붙인다.
 */

export const DEV_AUTH_HEADER = 'X-Debug-Employee-No';

/**
 * 붙일 헤더 값. 개발 모드가 아니거나 설정이 없으면 undefined다.
 *
 * 관리팀 화면이므로 **부서가 `관리`인 재직 직원의 id**를 쓴다. 아닌 id면 목록 조회가 403이다.
 *
 * **id를 이 파일에 적지 않는다.** 시드 데이터라서 서버를 다시 심으면 바뀐다 —
 * 2026-08-28에 실제로 바뀌어 그전에 쓰던 `1`이 401이 됐다. 고르는 방법은 `.env.example`에 있다.
 */
export function devAuthValue(): string | undefined {
  if (!import.meta.env.DEV) return undefined;

  const employeeId = import.meta.env.VITE_DEV_EMPLOYEE_ID;
  if (!employeeId) return undefined;

  return `employee:${employeeId}`;
}
