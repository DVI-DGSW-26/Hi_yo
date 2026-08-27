import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 보험 요율 (Swagger `8. 보험 요율`). 명세는 `docs/API_급여.md` 6장에 있다.
 *
 * 급여 계산이 가져다 쓰는 값이다. **화면은 등록된 값을 보여주기만 한다.**
 * 요율을 곱해보거나 금액을 만들어보지 않는다 — 계산은 전부 서버가 한다.
 *
 * 등록·수정(POST·PUT·copy)은 붙이지 않았다. `autoCalculate`·`roundUnit`의 뜻과
 * `baseItemCode`가 필요한 항목 목록이 확인되지 않았다 (`docs/API_급여.md` 8장 10·12번).
 * 특히 `baseItemCode`를 비운 채 등록하면 지급총액에 곱해져 금액이 30배가 된다.
 */

export interface InsuranceRate {
  id: number;
  applyYear: number;
  itemCode: string;
  /** 표시명. 화면에 그대로 쓴다. 코드로 이름을 만들지 않는다 */
  itemName: string | null;
  /** `0`~`1` 비율 */
  rate: number;
  /** 퍼센트 표기용 값. 화면에서 `rate * 100`을 계산하지 않는다 */
  ratePercent: number;
  /** 이 항목의 금액을 기준으로 곱한다. 비어 있으면 지급총액이 기준이다 */
  baseItemCode: string | null;
  baseItemName: string | null;
  autoCalculate: boolean;
  roundUnit: number | null;
}

export const insuranceKeys = {
  all: ['insurance-rates'] as const,
  years: () => [...insuranceKeys.all, 'years'] as const,
  ofYear: (year: number) => [...insuranceKeys.all, year] as const,
};

/** 요율이 등록된 연도. 최근 해부터 온다 */
export function useInsuranceYears() {
  return useQuery({
    queryKey: insuranceKeys.years(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<number[]>('/payroll/insurance-rates/years', { signal });
      return data;
    },
  });
}

/** 그 해의 요율 목록. `year`는 서버가 필수로 받는다 (기본값이 없다) */
export function useInsuranceRates(year: number | undefined) {
  return useQuery({
    queryKey: insuranceKeys.ofYear(year ?? -1),
    enabled: year !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<InsuranceRate[]>('/payroll/insurance-rates', {
        params: { year },
        signal,
      });
      return data;
    },
  });
}
