import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 본인 인사정보. `GET /employees/me`
 *
 * 이 화면 계열은 **본인용**이다. 다른 직원의 id로 조회하는 코드를 여기에 두지 않는다.
 *
 * **계좌는 서버가 마스킹하지 않는다** (2026-09-02 회신 10번). 은행명·계좌번호·예금주
 * 셋 다 원문으로 내려온다 — 8-28까지는 마스킹돼 온다고 적어 뒀는데 사실이 아니었다.
 * 그래서 **화면이 `maskAccountNo`로 가린다** (`docs/01_물어볼_것.md` 서버 10번).
 * 원칙은 서버가 가린 값을 받는 것이므로(`CLAUDE.md` 2장) 서버에 다시 물을 것으로 남는다.
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

/**
 * **원문이 온다.** 마스킹된 값이 아니다 (2026-09-02 회신 10번).
 *
 * 화면에 그릴 때 `maskAccountNo`를 거친다. 뒤집어 말하면 **이 값을 그대로 그리는 코드는
 * 계좌번호를 통째로 노출하는 코드다.**
 */
export interface BankAccount {
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
}

/**
 * 계좌 변경. `PUT /employees/{id}/bank-account`
 *
 * **직원이 스스로 바꿀 수 있는 유일한 항목이다** (요구사항정의서 2.1 — 즉시 반영,
 * 관리팀에 알림). 그래서 본인용 화면에 있다.
 */
export interface BankAccountInput {
  /** 본인 id만 넣는다. 남의 id로 부르는 코드를 여기에 두지 않는다 */
  employeeId: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
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

/**
 * 계좌를 바꾼다.
 *
 * **셋을 항상 함께 보낸다.** `PUT`이 전체 교체라 일부만 보내면 나머지가 `null`로 지워진다
 * (`docs/01_물어볼_것.md` 「조심할 것」). 그래서 화면도 셋을 모두 받는다.
 *
 * **화면에 그린 마스킹 값을 되돌려 보내지 않는다.** 가린 문자열이 그대로 저장되면
 * 급여가 엉뚱한 계좌로 간다. 바꾸는 화면은 새 값을 처음부터 입력받는다.
 *
 * 응답 본문의 모양은 명세에 없다. **읽지 않고 캐시를 무효화한다** — 지어낸 타입을 두느니
 * 다시 조회하는 편이 낫다.
 */
export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, ...body }: BankAccountInput) => {
      await api.put(`/employees/${employeeId}/bank-account`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}
