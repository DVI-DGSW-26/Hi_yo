import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PageParams, type PageResponse } from '@/lib/api';

/**
 * 직원 (A-102). 관리팀 전용이다.
 *
 * **주민등록번호는 어떤 조회 응답에도 담기지 않는다.** `residentNoRegistered` 로 등록 여부만 온다.
 * 넣을 수는 있어도 **읽을 수는 없다.** 등록 폼의 값은 성공하는 즉시 지운다.
 *
 * **`PUT /employees/{id}` 에서 `residentNo` 가 빠졌다** (2026-09-09 회신 25번).
 * 스펙에 필드가 없으니 전체 교체로 이름을 고쳐도 주민번호가 지워지지 않는다.
 * 등록은 `POST`, 수정은 `PATCH /employees/{id}/resident-no` 하나로 정리됐다.
 *
 * 서버 확인으로는 **원래도 지우지 않았다** — 값이 비어 있으면 기존 값을 그대로 두고
 * 넘어갔다고 한다. 스펙에 필드가 있으면 전체 교체로 읽는 것이 맞아서 8-26부터
 * `PUT` 을 막아 뒀던 것인데, 그 판단 자체는 코드를 봐야 뒤집히는 것이었다.
 *
 * 그래서 **이름·연락처·주소를 이제 바꾼다.** 나머지 항목은 여전히 각자의 `PATCH` 로
 * 간다 — `employee-no`·`status`·`resident-no`·`assignment` 넷이다.
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
  /**
   * 2026-09-02 회신으로 조회에 실리기 시작했다. **이름으로 id 를 역매핑하지 않는다** —
   * 부서명이 겹치거나 바뀌면 엉뚱한 부서로 옮겨진다.
   */
  departmentId: number | null;
  departmentName: string | null;
  jobId: number | null;
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

/**
 * **서버가 가려서 준다** (2026-09-09 회신 24번). 그전에는 원문이 내려와 화면이 가렸다.
 *
 * `bankAccountMasked`는 **이미 가려진 값**이다. `maskAccountNo`를 다시 거치지 않는다 —
 * 두 번 가리면 남은 네 자리까지 지워진다.
 *
 * 이체·통장 대조에 원문이 필요하면 `GET /employees/{id}/bank-account`를 그 화면에서
 * 따로 부른다 — 직원 상세는 사람을 확인하는 자리지 이체하는 자리가 아니다 (기획 5번).
 */
export interface BankAccount {
  bankName: string | null;
  /** `***-***-**6789`. 뒤 네 자리만 남은 값이다 */
  bankAccountMasked: string | null;
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

/**
 * 부서 · 직무 변경. `PATCH /employees/{id}/assignment` (2026-09-02에 열렸다)
 *
 * **`null` 은 「비운다」다. 「그대로 둔다」가 아니다.** 한쪽만 바꾸려면 나머지는 조회에서
 * 받은 현재 값을 그대로 실어 보낸다 — 화면이 그렇게 한다.
 *
 * 직무가 비면 **근태가 판정되지 않는다** (`GET /jobs` 스펙). 비우는 것이 되는 동작이라
 * 막지는 않되 화면이 그 사실을 적는다.
 */
export interface AssignmentInput {
  departmentId: number | null;
  jobId: number | null;
}

export function useChangeAssignment(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignmentInput) => {
      const { data } = await api.patch<Employee>(`/employees/${id}/assignment`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

/**
 * 주민등록번호 등록. `PATCH /employees/{id}/resident-no` (2026-09-02에 열렸다)
 *
 * **`PUT` 에서 빠져나온 경로다.** 전에는 인적사항을 한 번 고칠 때마다 주민번호가 지워졌고,
 * 지워지면 그 직원은 재직증명서를 발급받지 못했다.
 *
 * **응답에 값이 없다.** `residentNoRegistered` 가 `true` 로 바뀔 뿐이다 — 넣을 수는 있어도
 * 다시 읽을 수는 없다. 서버가 암호화 경로와 접근 로그를 걸어 둔 값이라 그렇다.
 *
 * **값을 로그·에러 메시지에 넣지 않는다** (`CLAUDE.md` 2장). 실패해도 서버가 준 문구만
 * 그대로 보여준다.
 */
export function useRegisterResidentNo(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (residentNo: string) => {
      const { data } = await api.patch<Employee>(`/employees/${id}/resident-no`, { residentNo });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

/**
 * 인적사항 수정. `PUT /employees/{id}`
 *
 * **전체 교체 경로지만 안 실은 값은 보존된다** (2026-09-09 회신 25번). 그래서 폼이
 * 건드리는 셋만 싣는다. `corporation`·`hireDate` 는 스펙이 필수로 잡고 있어
 * **지금 값을 그대로 되돌려 보낸다** — 바꾸는 값이 아니다.
 *
 * **빈 칸은 「그대로 둔다」이지 「비운다」가 아니다.** 값을 지우는 방법은 확인되지 않아
 * 화면도 그렇게 적는다. 지우는 동작이 필요해지면 서버에 먼저 묻는다 (`CLAUDE.md` 9장).
 */
export interface EmployeeUpdateInput {
  /** 스펙 필수. 지금 값을 그대로 싣는다 */
  name: string;
  corporation: string;
  hireDate: string;
  phone?: string;
  address?: string;
}

export function useUpdateEmployee(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeUpdateInput) => {
      const { data } = await api.put<Employee>(`/employees/${id}`, input);
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

/**
 * 세콤 인사정보를 직원으로 옮긴 결과 (`PersonSyncResult`).
 *
 * 스키마를 살아 있는 `/v3/api-docs`에서 확인했다 (2026-09-03). 문서에는 필드 이름까지
 * 적혀 있지 않았다.
 */
export interface PersonSyncResult {
  /** 세콤에서 읽은 사람 수 */
  read: number;
  /** 새로 만든 직원 수 */
  created: number;
  /** 비어 있던 항목을 채운 직원 수 */
  updated: number;
  /**
   * 넣지 못한 사람과 이유.
   *
   * **화면에서 지우면 안 되는 값이다.** 스펙이 "조용히 빠지면 그 사람 근태가 통째로
   * 사라진다"고 적고 있다.
   */
  skipped: SyncSkipped[];
}

/** `Skipped`. 셋 다 있을 것으로 보이지만 스펙이 필수로 표시하지 않아 없을 수 있게 둔다 */
export interface SyncSkipped {
  employeeId: number | null;
  employeeName: string | null;
  reason: string | null;
}

/**
 * 세콤 인사정보를 직원으로 옮긴다.
 *
 * **세콤이 아는 것만 채운다.** 쓸 만한 값은 이름·카드번호·입사일 셋뿐이고 사번과 부서는
 * 비어 있다. 주민번호는 비밀키가 없어 수신 때 버려진다.
 *
 * **이미 있는 값은 덮어쓰지 않고, 세콤 명단에서 빠져도 지우지 않는다.** 관리팀이 고친
 * 이름을 세콤이 되돌리면 안 되고, 퇴사 이력과 과거 급여가 남아야 하기 때문이다.
 */
export function useSyncSecom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<PersonSyncResult>('/employees/sync-secom');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}
