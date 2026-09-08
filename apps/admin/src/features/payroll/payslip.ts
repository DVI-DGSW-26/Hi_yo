import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, toApiError } from '@hr/api';
import { formatTargetYm } from '@hr/format';
import { api } from '@/lib/api';

/**
 * A-602 급여명세서 — PDF 내려받기와 교부 기록.
 *
 * **둘은 다른 일이다.** 내려받는 것만으로는 교부 기록이 생기지 않는다
 * (`GET .../pdf` 설명). 임금명세서 교부는 사용자의 의무라 「언제 누가 어떤 방법으로
 * 줬는지」를 사후에 댈 수 있어야 하고, 그 사실은 관리팀이 따로 남긴다 —
 * 재직증명서에서 발급과 내려받기를 나눈 것과 같은 이유다.
 *
 * **이메일·문자 자동 발송은 없다.** 서버가 범위 밖이라고 했다 (2026-09-02 회신).
 * 이 화면이 하는 것은 PDF를 받는 것과 「줬다」를 남기는 것 둘뿐이다.
 */

/** 교부 방법. `methodName`(한국어)은 서버가 준다 — 이력 표는 그것을 쓴다 */
export type DeliveryMethod = 'DOWNLOAD' | 'EMAIL' | 'PRINT';

export const DELIVERY_METHODS: { value: DeliveryMethod; label: string }[] = [
  { value: 'DOWNLOAD', label: '파일로 전달' },
  { value: 'EMAIL', label: '이메일' },
  { value: 'PRINT', label: '인쇄물' },
];

export interface PayslipDelivery {
  id: number;
  payrollId: number;
  sentAt: string;
  method: DeliveryMethod;
  /** 서버가 준 한국어. 화면이 다시 만들지 않는다 */
  methodName: string | null;
  email: string | null;
  success: boolean;
  failReason: string | null;
  deliveredByName: string | null;
}

export interface DeliveryInput {
  method: DeliveryMethod;
  /** `EMAIL` 일 때만 */
  email?: string;
}

export const payslipKeys = {
  deliveries: (payrollId: number) => ['payroll', payrollId, 'deliveries'] as const,
};

/** 교부 이력. 최근 것부터 온다. **재교부도 사실이라 덮어쓰지 않고 쌓인다** */
export function useDeliveries(payrollId: number | undefined) {
  return useQuery({
    queryKey: payslipKeys.deliveries(payrollId!),
    enabled: payrollId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<PayslipDelivery[]>(`/payroll/${payrollId}/deliveries`, {
        signal,
      });
      return data;
    },
  });
}

/**
 * 교부한 사실을 남긴다.
 *
 * **내려받기와 묶지 않는다.** PDF를 몇 번 받아도 교부는 한 번이다 — 관리팀이 실제로
 * 준 뒤에 눌러야 기록이 사실과 맞는다.
 */
export function useRecordDelivery(payrollId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeliveryInput) => {
      const { data } = await api.post<PayslipDelivery>(`/payroll/${payrollId}/deliveries`, input);
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: payslipKeys.deliveries(payrollId) }),
  });
}

/**
 * 명세서 PDF를 받아 저장한다.
 *
 * **확정된 급여만 된다.** 확정 전 금액은 재계산·보정으로 바뀌어서, 그 상태의 명세서를
 * 주면 나중에 시스템 값과 갈라진다 — 서버가 422로 막는다. **화면에서 미리 막지 않는다.**
 * 확정은 관리팀이 지금 할 수 있는 일이라 버튼은 눌리게 두고 서버 문구를 그대로 보여준다
 * (`DESIGN_ADMIN.md` 1장).
 *
 * **인증이 헤더 방식이라 URL을 새 창으로 열 수 없다.** 받아서 `blob:` 로 만들어 내려준다.
 */
export function useDownloadPayslip(payrollId: number) {
  return useMutation({
    mutationFn: (payroll: { targetYm: number; employeeName: string | null }) =>
      downloadPayslip(payrollId, payroll),
  });
}

async function downloadPayslip(
  payrollId: number,
  payroll: { targetYm: number; employeeName: string | null },
): Promise<void> {
  let blob: Blob;
  try {
    const response = await api.get<Blob>(`/payroll/${payrollId}/pdf`, { responseType: 'blob' });
    blob = response.data;
  } catch (error) {
    throw await readBlobError(error);
  }

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName(payroll);
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * `responseType: 'blob'` 이면 **오류 본문도 `Blob` 으로 온다.**
 *
 * `@hr/api` 의 정규화는 본문이 객체일 때만 `message` 를 꺼내므로, 그대로 두면 서버가
 * 준 한국어(「확정된 급여만…」)가 사라지고 기본 문구가 나간다. 여기서 한 번 풀어 준다.
 *
 * **이 처리를 `packages/api` 에 두지 않는다.** `Blob` 은 브라우저 것이고 그 패키지는
 * 플랫폼과 무관해야 한다 (`CLAUDE.md` 프로젝트 구조).
 */
async function readBlobError(error: unknown): Promise<ApiError> {
  if (typeof error !== 'object' || error === null) return toApiError(error);

  const withResponse = error as { response?: { data?: unknown } };
  const body = withResponse.response?.data;
  if (!(body instanceof Blob)) return toApiError(error);

  try {
    const parsed: unknown = JSON.parse(await body.text());
    // 본문을 객체로 바꿔 끼우면 나머지 판정(상태 코드별 문구)은 그대로 쓸 수 있다.
    return toApiError({
      ...error,
      response: { ...withResponse.response, data: parsed },
    });
  } catch {
    return toApiError(error);
  }
}

/** 파일명에 서버 값을 그대로 쓰지 않는다. 경로 구분자가 섞이면 엉뚱한 곳에 쓴다 */
function fileName(payroll: { targetYm: number; employeeName: string | null }): string {
  const name = payroll.employeeName?.replace(/[^0-9A-Za-z가-힣_-]/g, '');
  const month = formatTargetYm(payroll.targetYm).replace(/[^0-9년월]/g, '');
  return name ? `급여명세서_${month}_${name}.pdf` : `급여명세서_${month}.pdf`;
}
