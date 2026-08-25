import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PageParams, type PageResponse } from '@/lib/api';

/**
 * 재직증명서 (S-401). `GET/POST /certificates`
 *
 * 승인 절차가 없다. 본인이 누르면 그 자리에서 발급된다.
 *
 * 발급과 내려받기가 나뉘어 있다. 한 번 발급한 증명서를 몇 번을 내려받아도 같은 문서여야 하기
 * 때문이다. 내려받기가 발급을 겸하면 새로고침할 때마다 새 문서번호가 찍힌다.
 * **목록을 보여주려고 POST를 부르지 않는다.**
 */

/** 발급 요청. 용도·제출처 둘 다 자유 입력이고 필수가 아니다 (명세서 S-401) */
export interface CertificateIssueInput {
  /** 최대 100자 */
  purpose?: string;
  /** 최대 100자 */
  submitTo?: string;
}

/**
 * 증명서 한 건. 출력에 필요한 값이 서버에서 다 계산돼 온다.
 *
 * `tenureText`(재직기간)와 `residentNoMasked`(마스킹된 주민번호)를 앱에서 만들지 않는다.
 * 재직기간은 입사일~발급일 기준으로 서버가 계산하고, 마스킹도 서버가 한다.
 */
export interface Certificate {
  id: number;
  /** 문서번호. 발급 시점에 찍힌다 */
  docNo: string | null;
  issuedAt: string;
  purpose: string | null;
  submitTo: string | null;
  /** 발급 시점의 정식 성명. 외국인은 여권상 풀네임 */
  employeeName: string | null;
  nationality: string | null;
  /** 서버가 마스킹한 값. 원본을 받지 않는다 */
  residentNoMasked: string | null;
  departmentName: string | null;
  jobGrade: string | null;
  address: string | null;
  hireDate: string | null;
  tenureMonths: number | null;
  /** `n년 n개월`. 서버가 계산한다 */
  tenureText: string | null;
  companyName: string | null;
  companyAddress: string | null;
  representative: string | null;
}

export const certificateKeys = {
  all: ['certificates'] as const,
  list: (params: PageParams) => [...certificateKeys.all, 'list', params] as const,
  detail: (id: number) => [...certificateKeys.all, 'detail', id] as const,
};

/** 내 발급 이력. 본인 것만 온다 */
export function useCertificates(params: PageParams = { page: 0, size: 20 }) {
  return useQuery({
    queryKey: certificateKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<PageResponse<Certificate>>('/certificates', {
        params,
        signal,
      });
      return data;
    },
  });
}

/** 증명서 단건. 본인 것만 볼 수 있다 */
export function useCertificate(id: number) {
  return useQuery({
    queryKey: certificateKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Certificate>(`/certificates/${id}`, { signal });
      return data;
    },
  });
}

/**
 * 즉시 발급.
 *
 * 부를 때마다 새 문서번호가 찍힌다. 재시도 버튼을 자동으로 눌리게 만들지 않는다.
 */
export function useIssueCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CertificateIssueInput) => {
      const { data } = await api.post<Certificate>('/certificates', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificateKeys.all });
    },
  });
}
