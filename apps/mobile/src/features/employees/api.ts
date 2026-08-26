import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 본인 인사정보. `GET /employees/me`
 *
 * 이 화면 계열은 **본인용**이다. 다른 직원의 id로 조회하는 코드를 여기에 두지 않는다.
 * 계좌번호·연락처는 서버가 마스킹해서 준다. 받은 문자열을 그대로 표시하고
 * 앱에서 다시 가리거나 풀지 않는다.
 */

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';

/** 서버가 아직 채우지 않은 값이 많다. 응답에서 확인한 대로 전부 null을 허용한다. */
export interface EmployeeSummary {
  id: number;
  employeeNo: string | null;
  name: string;
  /** 공문서용 정식 성명. 외국인은 여권상 풀네임이 들어간다 */
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
  residentNoRegistered: boolean;
}

/** 서버가 마스킹한 값이 온다. 원본을 받지 않는다 */
export interface BankAccount {
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
}

export interface EmployeeDetail {
  summary: EmployeeSummary;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
  bankAccount: BankAccount | null;
}

export const employeeKeys = {
  all: ['employees'] as const,
  me: () => [...employeeKeys.all, 'me'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: employeeKeys.me(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<EmployeeDetail>('/employees/me', { signal });
      return data;
    },
  });
}
