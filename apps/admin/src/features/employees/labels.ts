import type { EmploymentStatus } from './api';

/**
 * 재직상태 표기.
 *
 * **서버가 `employmentStatusLabel`·`statusLabel` 로 말을 같이 준다.** 이 표는 그것이
 * 비었을 때만 쓰는 대비값이다 — 앱이 서버보다 먼저 말을 정하지 않는다.
 *
 * 직원 상세와 재직상태 이력이 같이 쓴다. 두 곳이 같은 상태를 다르게 부르면 안 된다.
 */
export const STATUS_LABEL: Record<EmploymentStatus, string> = {
  ACTIVE: '재직',
  ON_LEAVE: '휴직',
  RESIGNED: '퇴사',
};
