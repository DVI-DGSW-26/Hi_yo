import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { currentYear } from '@/lib/datetime';

/**
 * 단체연차 (Swagger `7. 단체연차`). 명세는 `docs/API_연차.md` 8장에 있다.
 *
 * 여름휴가처럼 **전 직원이 같은 날 쉬는 일정**이다. 대표가 "오늘 다 쉽시다" 하면
 * 관리팀이 여기서 날짜를 넣고 차감한다.
 *
 * **등록과 차감이 나뉘어 있다.** 등록만으로는 아무 일도 일어나지 않는다.
 * `apply`를 눌러야 전 직원의 신청서가 만들어지고 잔여에서 빠진다.
 * **한 번만 할 수 있고 되돌릴 수 없다.**
 *
 * 삭제·수정 API가 없다. 잘못 등록한 것을 지우는 경로도 없으므로 등록 자체를 신중하게 한다.
 *
 * 권한 — Swagger에 `관리팀만` 표시가 없지만 **서버는 막고 있다.** 일반 직원(`employee:90`)이
 * `GET /company-leaves`를 부르면 `403`이다 (2026-08-31 실호출). 표시가 빠진 것으로 보인다.
 */

export interface CompanyLeave {
  id: number;
  /** `yyyy-MM-dd` */
  targetDate: string;
  reason: string;
  /** 이미 차감했는지. `true`면 다시 누를 수 없다 */
  applied: boolean;
  appliedAt: string | null;
  appliedByName: string | null;
}

export interface CompanyLeaveCreateInput {
  targetDate: string;
  reason: string;
}

/**
 * 차감에서 빠진 직원.
 *
 * 급여 계산의 `skipped`, 자동 편성의 `conflicts`와 같은 구조다.
 * `remaining`은 서버가 준 잔여일수다 — 화면에서 다시 계산하지 않는다.
 */
export interface SkippedEmployee {
  employeeId: number;
  employeeNo: string | null;
  employeeName: string | null;
  departmentName: string | null;
  remaining: number | null;
  reason: string | null;
}

/**
 * 일괄 차감 결과.
 *
 * **핵심은 `insufficient`다.** 스펙이 직접 적고 있다 — "잔여가 모자란 직원은 차감하지 않고
 * 명단으로 돌려줍니다. 무급 전환이나 마이너스 처리는 시스템이 정할 문제가 아닙니다."
 * 화면도 대신 정하지 않는다. 누가 모자랐는지만 알리고 관리팀이 사람별로 판단한다.
 */
export interface CompanyLeaveApplyResult {
  companyLeaveId: number;
  targetDate: string;
  reason: string;
  deductedCount: number;
  skippedCount: number;
  /** 잔여가 모자라 차감하지 못한 사람 */
  insufficient: SkippedEmployee[];
  /** 그날 이미 연차·휴직 중이던 사람 */
  alreadyOnLeave: SkippedEmployee[];
  /** 서버가 준 안내 문구. 앱에서 문구를 만들지 않는다 */
  notice: string | null;
}

/** 서버가 받는 한계 */
export const REASON_MAX = 100;

export const companyLeaveKeys = {
  all: ['company-leaves'] as const,
  ofYear: (year: number) => [...companyLeaveKeys.all, year] as const,
};

/**
 * 고를 수 있는 연도 — **올해와 내년.**
 *
 * 공휴일과 같은 사정이다. 등록된 연도를 알아낼 경로가 없고, `year`를 비웠을 때 전체가
 * 오는지 올해만 오는지도 확인되지 않았다 (`docs/API_연차.md` 9장에 공휴일 쪽 실측이 있다).
 * 그래서 **연도를 항상 명시해서 부른다.** 비워두고 서버 기본값에 기대지 않는다.
 */
export function selectableYears(): number[] {
  const thisYear = currentYear();
  return [thisYear + 1, thisYear];
}

export function useCompanyLeaves(year: number) {
  return useQuery({
    queryKey: companyLeaveKeys.ofYear(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<CompanyLeave[]>('/company-leaves', {
        params: { year },
        signal,
      });
      return data;
    },
  });
}

/** 날짜만 잡아둔다. 이것만으로는 아무의 연차도 줄지 않는다 */
export function useCreateCompanyLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompanyLeaveCreateInput) => {
      const { data } = await api.post<CompanyLeave>('/company-leaves', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyLeaveKeys.all }),
  });
}

/**
 * 일괄 차감 실행.
 *
 * **되돌릴 수 없고 한 번만 된다.** 확인 대화상자와 `danger` 버튼을 같이 쓴다
 * (`DESIGN_ADMIN.md` 5·6장). 자동 재시도를 켜지 않는 것은 `main.tsx`의 기본값이 이미
 * 그렇게 돼 있다 — 두 번 부르면 안 되는 종류의 요청이다.
 *
 * 연차 잔여가 걸린 동작이라 `leave` 쿼리도 같이 무효화해야 하지만, 관리팀 화면에
 * 잔여를 보는 화면이 아직 없다. 생기면 여기에 더한다.
 */
export function useApplyCompanyLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<CompanyLeaveApplyResult>(`/company-leaves/${id}/apply`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyLeaveKeys.all }),
  });
}
