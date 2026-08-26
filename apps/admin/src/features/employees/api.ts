import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PageParams, type PageResponse } from '@/lib/api';

/**
 * 직원 (A-102). 관리팀 전용이다.
 *
 * **주민등록번호는 어떤 조회 응답에도 담기지 않는다.** `residentNoRegistered` 로 등록 여부만 온다.
 * 화면에 주민번호를 표시하거나 상태에 담지 않는다.
 *
 * `PUT /employees/{id}` 는 **전체 교체**다. 보내지 않은 필드는 지워진다 (2026-08-26 실호출 확인).
 * 그래서 수정 화면을 만들지 않았다 — `docs/00_문서_인덱스.md` 참고.
 */

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';

export interface Employee {
  id: number;
  employeeNo: string | null;
  name: string;
  /** 공문서용 정식 성명. 외국인은 여권상 풀네임 */
  legalName: string | null;
  nationality: string | null;
  corporation: string | null;
  departmentName: string | null;
  jobName: string | null;
  jobGrade: string | null;
  workSite: string | null;
  originalHireDate: string | null;
  hireDate: string | null;
  employmentStatus: EmploymentStatus;
  employmentStatusLabel: string | null;
  resignDate: string | null;
  payrollTarget: boolean;
  /** 주민번호가 등록돼 있는지. 값 자체는 오지 않는다 */
  residentNoRegistered: boolean;
}

/** 서버가 마스킹한 값이 온다. 원본을 받지 않는다 */
export interface BankAccount {
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
}

export interface EmployeeDetail {
  summary: Employee;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
  bankAccount: BankAccount | null;
}

export interface Department {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
}

/** 직무는 근태 판정·급여 계산의 기준값을 함께 준다 */
export interface Job {
  id: number;
  name: string;
  /** 급여 계산 대상인지. 직무를 고르면 읽기전용으로 보여준다 */
  payrollTarget: boolean;
  hourlyWage: number | null;
  workStart: string | null;
  workEnd: string | null;
  standardMinutes: number | null;
  active: boolean;
}

export interface StatusHistory {
  id: number;
  status: EmploymentStatus;
  statusLabel: string | null;
  startDate: string;
  endDate: string | null;
  reason: string | null;
}

/**
 * 직원 등록.
 *
 * 사번은 선택이다. 연차관리대장에 사번이 없는 직원이 실재하기 때문이다.
 * 주민번호(`residentNo`)는 이 폼에서 받지 않는다 — 명세서 A-102 필드 목록에 없다.
 */
export interface EmployeeCreateInput {
  name: string;
  corporation: string;
  hireDate: string;
  employeeNo?: string;
  departmentId?: number;
  jobId?: number;
  originalHireDate?: string;
}

export interface StatusChangeInput {
  status: EmploymentStatus;
  effectiveDate: string;
  reason?: string;
}

export interface EmployeeListFilter extends PageParams {
  corporation?: string;
  status?: EmploymentStatus;
  departmentId?: number;
  keyword?: string;
}

export const employeeKeys = {
  all: ['employees'] as const,
  list: (filter: EmployeeListFilter) => [...employeeKeys.all, 'list', filter] as const,
  detail: (id: number) => [...employeeKeys.all, 'detail', id] as const,
  history: (id: number) => [...employeeKeys.all, 'history', id] as const,
  departments: () => ['departments'] as const,
  jobs: () => ['jobs'] as const,
};

/** 마스터는 자주 바뀌지 않는다. 화면을 옮길 때마다 다시 부르지 않는다 */
const MASTER_STALE_TIME = 60 * 60 * 1000;

export function useDepartments() {
  return useQuery({
    queryKey: employeeKeys.departments(),
    staleTime: MASTER_STALE_TIME,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Department[]>('/departments', { signal });
      return data;
    },
  });
}

export function useJobs() {
  return useQuery({
    queryKey: employeeKeys.jobs(),
    staleTime: MASTER_STALE_TIME,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Job[]>('/jobs', { signal });
      return data;
    },
  });
}

export function useEmployees(filter: EmployeeListFilter) {
  return useQuery({
    queryKey: employeeKeys.list(filter),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<PageResponse<Employee>>('/employees', {
        params: filter,
        signal,
      });
      return data;
    },
  });
}

export function useEmployee(id: number | undefined) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? -1),
    enabled: id !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<EmployeeDetail>(`/employees/${id}`, { signal });
      return data;
    },
  });
}

export function useStatusHistory(id: number | undefined) {
  return useQuery({
    queryKey: employeeKeys.history(id ?? -1),
    enabled: id !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<StatusHistory[]>(`/employees/${id}/status-history`, {
        signal,
      });
      return data;
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeCreateInput) => {
      const { data } = await api.post<Employee>('/employees', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

/** 휴직·복직·퇴사. **퇴사자도 지우지 않고 상태로만 관리한다.** */
export function useChangeStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StatusChangeInput) => {
      const { data } = await api.patch<Employee>(`/employees/${id}/status`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

/** 사번 부여. 원장에 사번이 없는 직원이 있어 별도 API 로 분리돼 있다 */
export function useAssignEmployeeNo(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeNo: string) => {
      const { data } = await api.patch<Employee>(`/employees/${id}/employee-no`, { employeeNo });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}
