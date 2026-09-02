import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PageResponse } from '@/lib/api';

/**
 * 신청 · 결재 (Swagger `4. 신청 · 결재`). 명세는 `docs/API_신청결재.md`에 있다.
 *
 * A-302가 쓴다. **본인용 화면에서 `GET /requests/pending`을 부르지 않는다** —
 * 관리팀 전용이고 `apps/mobile`에 넣지 않는다.
 *
 * **"검토"에는 별도 API가 없다.** `GET /requests/{id}`로 내용을 읽어보는 것 자체가 검토이고,
 * 상태를 바꾸는 행위는 결정 하나뿐이다. 그래서 화면을 목록과 상세로 나눴다 — 목록에서 바로
 * 승인하게 만들면 검토 없이 결정하는 셈이 되고, 서버가 그것을 422로 막는다고 적고 있다
 * (`docs/API_신청결재.md` 7장 2번. 무엇이 검토로 집계되는지는 아직 확인되지 않았다).
 */

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';

/** 차감에서 빠진 날. "왜 3일 신청인데 2일만 깎였나"에 답한다 */
export interface ExcludedDate {
  date: string;
  /** 서버가 준 사유를 그대로 보여준다. 주말·공휴일 판정을 앱에서 하지 않는다 */
  reason: string | null;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string | null;
  departmentName: string | null;
  typeCode: string;
  /** 표시명. 화면에 그대로 쓴다 — 코드로 이름을 만들지 않는다 */
  typeName: string | null;
  startDate: string;
  endDate: string;
  /** 시각이 필요한 종류(반차·외출·조퇴)에만 온다 */
  startTime: string | null;
  endTime: string | null;
  /** 서버가 계산한 차감 일수. 앱에서 다시 세지 않는다 */
  leaveDays: number;
  fiscalYear: number | null;
  reason: string | null;
  emergencyContact: string | null;
  status: RequestStatus;
  companyLeave: boolean;
  excludedDates: ExcludedDate[] | null;
  approverId: number | null;
  approverName: string | null;
  decisionComment: string | null;
  signed: boolean;
  decidedAt: string | null;
  deductibleMinutes: number | null;
}

/**
 * 결재 요청.
 *
 * **`signatureMethod`가 필수다.** 지금은 `CLICK`만 쓴다 — `IMAGE`는 크기 상한과 배경이
 * 아직 정해지지 않았다 (`docs/API_신청결재.md` 8장). `CLICK`일 때는 이미지를 보내지
 * 않아도 된다는 답을 받았다 (2026-08-31).
 */
export interface DecisionInput {
  approved: boolean;
  comment?: string;
  /**
   * 손으로 그린 서명. **base64 문자열이고 data URL 이 아니다** (서버 답변 2026-08-31).
   *
   * 비우면 `CLICK` 으로 보낸다 — 누른 것 자체가 서명이라는 뜻이고, 서버가 그때는
   * 이미지를 받지 않아도 된다고 했다.
   */
  signatureImage?: string;
}

export const approvalKeys = {
  all: ['requests'] as const,
  pending: (page: number) => [...approvalKeys.all, 'pending', page] as const,
  one: (id: number) => [...approvalKeys.all, id] as const,
};

/** 대기 목록. 봉투로 오고 쪽이 나뉜다 */
export function usePendingRequests(page: number, size: number) {
  return useQuery({
    queryKey: approvalKeys.pending(page),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<PageResponse<LeaveRequest>>('/requests/pending', {
        params: { page, size },
        signal,
      });
      return data;
    },
  });
}

/** 신청서 단건 = 검토. 이 호출이 결재의 전제다 */
export function useLeaveRequest(id: number | undefined) {
  return useQuery({
    queryKey: approvalKeys.one(id ?? -1),
    enabled: id !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LeaveRequest>(`/requests/${id}`, { signal });
      return data;
    },
  });
}

/**
 * 승인 · 반려. 엔드포인트는 하나고 `approved`로 갈린다.
 *
 * **반려는 되돌릴 수 없다.** 신청자에게 즉시 알림이 가고 재신청은 새 건이다
 * (`DESIGN_ADMIN.md` 5장). 승인도 되돌리기 어렵다 — 승인된 건은 시작 전에만 취소된다.
 * 둘 다 확인 대화상자를 거친다.
 */
export function useDecideRequest(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DecisionInput) => {
      const { data } = await api.post<LeaveRequest>(`/requests/${id}/decision`, {
        approved: input.approved,
        ...(input.comment ? { comment: input.comment } : {}),
        // 그린 서명이 있으면 그것으로, 없으면 누른 것으로 서명한다
        ...(input.signatureImage
          ? { signatureMethod: 'IMAGE', signatureImage: input.signatureImage }
          : { signatureMethod: 'CLICK' }),
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}
