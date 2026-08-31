import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { currentYear } from '@/lib/datetime';

/**
 * 연차 — 관리팀 (Swagger `6. 연차`). 명세는 `docs/API_연차.md` 에 있다.
 *
 * **잔여는 서버가 계산한다.** `granted - used - pending` 을 화면에서 하지 않는다
 * (명세서 7.2, `CLAUDE.md` 3장). 대장은 서버가 준 네 숫자를 그대로 표기한다.
 *
 * 발생 등록·수정·삭제(`/leave/grants`)는 아직 넣지 않았다. 발생 규칙과 `grantType`
 * 다섯 개의 뜻이 정해지지 않아 등록 화면을 만들 수 없다 (`docs/API_연차.md` 7장 1·4번).
 */

/**
 * 연차관리대장 한 줄.
 *
 * **`noGrant` 는 "연차가 0일" 이 아니라 "아직 안 넣었다" 는 뜻이다.** 서버가 발생이 0인
 * 직원도 목록에 넣어 주는 이유가 그것이다 — 빠진 사람이 목록에서 사라지면 누락을
 * 발견할 방법이 없다.
 *
 * 잔여는 `remaining` 이다. 결재 대기중인 신청까지 뺀 값이고, 화면이 쓰는 값으로
 * 확정돼 있다 (`docs/API_연차.md` 「잔여는 어느 값인가」, 2026-08-31).
 */
export interface LeaveLedgerRow {
  employeeId: number;
  employeeNo: string | null;
  employeeName: string | null;
  /** 법인 */
  corporation: string | null;
  departmentName: string | null;
  fiscalYear: number;
  /** 발생 총 일수. 소수로 온다 (0.5 · 0.25) */
  granted: number;
  used: number;
  /** 결재 대기중인 신청 */
  pending: number;
  remaining: number;
  /** 발생을 아직 넣지 않은 직원 */
  noGrant: boolean;
}

export const leaveKeys = {
  all: ['leave'] as const,
  ledger: (year: number) => [...leaveKeys.all, 'ledger', year] as const,
};

/**
 * 그 해의 연차관리대장. **전 직원이 한 번에 온다** — 페이지네이션이 없다
 * (확인일 기준 38명, `docs/API_연차.md` 1장). 인원이 늘면 서버에 페이지를 요청한다.
 */
export function useLeaveLedger(year: number) {
  return useQuery({
    queryKey: leaveKeys.ledger(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LeaveLedgerRow[]>('/leave/ledger', {
        params: { year },
        signal,
      });
      return data;
    },
  });
}

/**
 * 고를 수 있는 연도 — **올해와 지난 두 해.**
 *
 * 서버가 연도 목록을 주지 않는다. 공휴일과 같은 사정인데 범위가 반대다 — 대장은
 * 지나간 해를 다시 들춰보는 장부라 내년이 아니라 지난 해가 필요하다.
 *
 * **더 옛 해가 필요해지면 서버에 연도 목록을 요청한다.** 화면에서 범위를 넓혀 잡지 않는다.
 */
export function selectableLedgerYears(): number[] {
  const thisYear = currentYear();
  return [thisYear, thisYear - 1, thisYear - 2];
}
