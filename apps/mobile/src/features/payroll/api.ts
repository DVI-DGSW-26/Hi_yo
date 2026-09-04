import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 급여명세서 (S-601). `GET /payroll/employees/{employeeId}`, `GET /payroll/{payrollId}`
 *
 * **계산은 전부 서버가 한다.** 지급·공제 합계도, 실수령액도 서버가 준 값을 그대로 쓴다.
 * 항목을 더해 합계를 맞춰보지 않는다 (명세서 7.2, `CLAUDE.md` 3장).
 *
 * **`items`를 순서대로 출력하면 명세서가 된다.** 서버 스펙이 그렇게 적고 있다 —
 * 항목이 늘어도 화면 코드를 고치지 않는다. 항목 코드로 분기하지 않는다.
 *
 * **본인 것만 부른다.** `employeeId` 자리에는 `GET /auth/me`가 준 값만 넣는다.
 */

/** 명세서 한 줄 */
export interface PayrollItem {
  code: string;
  /** 화면에 그대로 쓴다. 코드로 이름을 만들지 않는다 */
  name: string;
  kind: 'PAYMENT' | 'DEDUCTION';
  minutes: number | null;
  rate: number | null;
  amount: number;
  /** 산출 근거 — "왜 이 금액인가"를 되물을 때 그대로 보여준다 */
  basis: string | null;
}

/**
 * 급여 한 건.
 *
 * `calculatedAmount`(자동계산)와 `finalAmount`(최종)가 따로 온다. 관리팀이 금액을 고쳤으면
 * 둘이 다르고 `modified`가 켜진다. **화면에 쓰는 실수령액은 `finalAmount`다.**
 *
 * `confirmed`가 확정 여부다. **확정되지 않은 급여는 직원에게 보여주지 않는다**
 * (2026-09-01 확정) — 계산만 돌아간 금액은 아직 바뀔 수 있다.
 */
export interface Payroll {
  id: number;
  employeeId: number;
  employeeName: string | null;
  employeeNo: string | null;
  departmentName: string | null;
  corporation: string | null;
  /** `202608` 처럼 정수로 온다 */
  targetYm: number;
  hourlyWage: number | null;
  ordinaryWage: number | null;
  costType: string | null;
  totalPayment: number;
  totalDeduction: number;
  calculatedAmount: number;
  finalAmount: number;
  modified: boolean;
  modifyReason: string | null;
  confirmed: boolean;
  items: PayrollItem[];
}

export const payrollKeys = {
  all: ['payroll'] as const,
  mine: (employeeId: number) => [...payrollKeys.all, 'mine', employeeId] as const,
  detail: (payrollId: number) => [...payrollKeys.all, 'detail', payrollId] as const,
};

/**
 * 내 명세서 목록. 최근 달부터 온다.
 *
 * **확정되지 않은 건은 서버가 뺀다** (2026-09-02). 그전에는 서버가 다 주고 화면이
 * 걸렀는데, 그러면 **확정 전 금액이 기기까지 왔다.** 목록만이 아니라 단건
 * (`GET /payroll/{payrollId}`)도 서버가 막는다 — id 를 직접 넣어도 나오지 않는다.
 *
 * 페이지네이션이 없다. 배열이 통째로 온다.
 */
export function useMyPayrolls(employeeId: number | undefined) {
  return useQuery({
    queryKey: payrollKeys.mine(employeeId ?? 0),
    enabled: employeeId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Payroll[]>(`/payroll/employees/${employeeId}`, { signal });
      return data;
    },
  });
}

/** 명세서 한 건 */
export function usePayroll(payrollId: number) {
  return useQuery({
    queryKey: payrollKeys.detail(payrollId),
    enabled: Number.isFinite(payrollId),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Payroll>(`/payroll/${payrollId}`, { signal });
      return data;
    },
  });
}
