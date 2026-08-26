import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 급여 (A-601). 명세는 `docs/API_급여.md`에 있다.
 *
 * **계산은 전부 서버가 한다.** 지급총액·공제·실지급액을 화면에서 더하거나 빼지 않는다.
 * 급여 목록은 다른 엔드포인트와 달리 **배열을 그대로** 준다 (봉투가 없다).
 */

export interface PayrollPeriod {
  id: number;
  targetYm: number;
  startDate: string;
  endDate: string;
  payDate: string | null;
  /** true면 재계산과 금액 수정이 막힌다 */
  closed: boolean;
}

export interface PayrollPeriodInput {
  targetYm: number;
  startDate: string;
  endDate: string;
  payDate?: string;
}

/** 명세서 한 줄 */
export interface PayrollItem {
  code: string;
  /** 표시명. 화면에 그대로 쓴다. 코드로 이름을 만들지 않는다 */
  name: string;
  kind: 'PAYMENT' | 'DEDUCTION';
  minutes: number | null;
  rate: number | null;
  amount: number;
  /** 산출 근거 — "왜 이 금액인가"를 되물을 때 그대로 보여준다 */
  basis: string | null;
}

export interface Payroll {
  id: number;
  employeeId: number;
  employeeName: string | null;
  employeeNo: string | null;
  departmentName: string | null;
  corporation: string | null;
  targetYm: number;
  hourlyWage: number | null;
  ordinaryWage: number | null;
  costType: string | null;
  totalPayment: number;
  totalDeduction: number;
  /** 자동 계산된 금액 */
  calculatedAmount: number;
  /** 최종 금액. 화면에 쓰는 값은 이것이다 */
  finalAmount: number;
  modified: boolean;
  modifyReason: string | null;
  confirmed: boolean;
  items: PayrollItem[];
}

/** 계산되지 않은 직원. 조용히 0원으로 넘기면 급여가 빠진 채로 이체된다 */
export interface SkippedEmployee {
  employeeId: number;
  employeeName: string | null;
  reason: string | null;
}

export interface CalculateResult {
  periodId: number;
  targetYm: number;
  targets: number;
  calculated: number;
  skipped: SkippedEmployee[];
}

export interface Adjustment {
  id: number;
  itemCode: string;
  itemName: string | null;
  beforeAmount: number;
  afterAmount: number;
  reason: string;
  modifiedById: number;
  modifiedByName: string | null;
  modifiedAt: string;
}

export interface AdjustInput {
  itemCode: string;
  amount: number;
  /** 필수. 금액 분쟁에 "누가 언제 무엇을 얼마에서 얼마로" 로 답할 수 있어야 한다 */
  reason: string;
}

/**
 * 수정할 수 있는 항목 코드. 지급·공제 구분은 서버 `item.kind`가 준다 —
 * 코드로 나누지 않는다 (docs/API_급여.md 5장).
 */
export const ITEM_CODES = [
  'BASIC',
  'OVERTIME',
  'NIGHT',
  'HOLIDAY',
  'HOLIDAY_OT',
  'WEEKLY_HOLIDAY',
  'DUTY',
  'ANNUAL_LEAVE',
  'MEAL',
  'JOB_ALLOWANCE',
  'POSITION_ALLOWANCE',
  'BONUS',
  'VEHICLE',
  'ETC_PAY',
  'PENSION',
  'HEALTH',
  'EMPLOYMENT',
  'CARE',
  'INCOME_TAX',
  'LOCAL_TAX',
  'YEAR_END_INCOME_TAX',
  'YEAR_END_LOCAL_TAX',
  'HEALTH_ADJUST',
  'CARE_ADJUST',
  'ETC_DEDUCTION',
] as const;

export const payrollKeys = {
  all: ['payroll'] as const,
  periods: () => [...payrollKeys.all, 'periods'] as const,
  ledger: (periodId: number, corporation?: string) =>
    [...payrollKeys.all, 'ledger', periodId, corporation ?? null] as const,
  detail: (payrollId: number) => [...payrollKeys.all, 'detail', payrollId] as const,
  adjustments: (payrollId: number) =>
    [...payrollKeys.all, 'adjustments', payrollId] as const,
};

export function usePeriods() {
  return useQuery({
    queryKey: payrollKeys.periods(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<PayrollPeriod[]>('/payroll/periods', { signal });
      return data;
    },
  });
}

export function useLedger(periodId: number | undefined, corporation?: string) {
  return useQuery({
    queryKey: payrollKeys.ledger(periodId ?? -1, corporation),
    enabled: periodId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Payroll[]>(`/payroll/periods/${periodId}/ledger`, {
        params: corporation ? { corporation } : undefined,
        signal,
      });
      return data;
    },
  });
}

export function usePayroll(payrollId: number | undefined) {
  return useQuery({
    queryKey: payrollKeys.detail(payrollId ?? -1),
    enabled: payrollId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Payroll>(`/payroll/${payrollId}`, { signal });
      return data;
    },
  });
}

export function useAdjustments(payrollId: number | undefined) {
  return useQuery({
    queryKey: payrollKeys.adjustments(payrollId ?? -1),
    enabled: payrollId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Adjustment[]>(`/payroll/${payrollId}/adjustments`, { signal });
      return data;
    },
  });
}

export function useCreatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PayrollPeriodInput) => {
      const { data } = await api.post<PayrollPeriod>('/payroll/periods', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

/** 계산은 기간 전체를 다시 돈다. 손으로 넣은 항목(식대·소득세)은 서버가 지우지 않는다 */
export function useCalculate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: number) => {
      const { data } = await api.post<CalculateResult>(
        `/payroll/periods/${periodId}/calculate`,
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

export function useClosePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, closed }: { periodId: number; closed: boolean }) => {
      const { data } = await api.patch<PayrollPeriod>(
        `/payroll/periods/${periodId}/close`,
        undefined,
        { params: { closed } },
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

export function useConfirmPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payrollId, confirmed }: { payrollId: number; confirmed: boolean }) => {
      const { data } = await api.patch<Payroll>(`/payroll/${payrollId}/confirm`, undefined, {
        params: { confirmed },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

/** 지급 항목을 고치면 지급총액이 달라지므로 서버가 4대보험을 다시 계산한다 */
export function useAdjust(payrollId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdjustInput) => {
      const { data } = await api.post<Payroll>(`/payroll/${payrollId}/adjustments`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}
