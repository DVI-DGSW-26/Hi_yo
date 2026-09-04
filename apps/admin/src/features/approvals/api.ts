import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PageResponse } from '@/lib/api';

/**
 * 신청 · 결재 (Swagger `4. 신청 · 결재`). 명세는 `docs/API_신청결재.md`에 있다.
 *
 * A-302가 쓴다. **본인용 화면에서 `GET /requests/pending`을 부르지 않는다** —
 * 관리팀 전용이고 `apps/mobile`에 넣지 않는다.
 *
 * **결재는 2단계다 (2026-09-02 서버 변경).** 회사 「휴가(근태)신청서」(DV-MP-120-004)의
 * 결재란이 「작성 · 검토 · 승인」 세 칸이고, 작성은 신청인 자리라 결재는 **검토와 승인**
 * 둘이다. 그래서 경로도 둘이다 — `/review`가 첫 단계, `/decision`이 마지막 단계다.
 *
 * **검토한 사람은 승인할 수 없다.** 같은 사람이 두 칸을 채우면 단계를 나눈 뜻이 없어
 * 서버가 422로 막는다. 종이 서식에서도 두 사람이 도장을 찍는다.
 */

/**
 * `REVIEWED`는 검토를 마치고 승인을 기다리는 상태다 (2026-09-02에 생겼다).
 * **상태를 열거하는 곳을 늘릴 때 여기부터 본다** — 목록 필터·뱃지·정렬이 전부 이것을 쓴다.
 */
export type RequestStatus = 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'CANCELED';

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
  /** 신청인이 서명했는가. 결재자 서명인 `signed`와 다른 값이다 */
  applicantSigned: boolean;
  /** 검토(첫 단계)를 한 사람. 이 사람은 승인할 수 없다 */
  reviewerId: number | null;
  reviewerName: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  approverId: number | null;
  approverName: string | null;
  decisionComment: string | null;
  signed: boolean;
  decidedAt: string | null;
  deductibleMinutes: number | null;
}

/**
 * 결재 요청. **검토와 승인이 같은 몸통을 쓴다** (`RequestDecisionRequest`).
 *
 * **`signatureMethod`가 필수다.** `CLICK`일 때는 이미지를 보내지 않아도 된다는 답을
 * 받았다 (2026-08-31). `IMAGE`는 **base64 128KB**가 상한이고 배경은 투명 PNG다
 * (2026-09-02 서버 답).
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

/** 검토와 승인이 같은 몸통을 쓴다. 만드는 곳을 하나로 둔다 */
function decisionBody(input: DecisionInput) {
  return {
    approved: input.approved,
    ...(input.comment ? { comment: input.comment } : {}),
    // 그린 서명이 있으면 그것으로, 없으면 누른 것으로 서명한다
    ...(input.signatureImage
      ? { signatureMethod: 'IMAGE', signatureImage: input.signatureImage }
      : { signatureMethod: 'CLICK' }),
  };
}

/**
 * 검토 — 결재의 **첫 단계**.
 *
 * 통과하면 상태가 `REVIEWED`가 되어 승인을 기다린다.
 * **`approved: false`면 검토 단계에서 반려되고 거기서 끝난다** — 승인까지 갈 이유가 없다.
 */
export function useReviewRequest(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DecisionInput) => {
      const { data } = await api.post<LeaveRequest>(`/requests/${id}/review`, decisionBody(input));
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

/**
 * 승인 · 반려 — 결재의 **마지막 단계**. `approved`로 갈린다.
 *
 * **검토를 거친 신청만 처리할 수 있다** (`REVIEWED`). 그리고 **검토한 사람은 승인할 수
 * 없다** — 화면이 미리 막지만 서버도 막는다.
 *
 * **반려는 되돌릴 수 없다.** 신청자에게 즉시 알림이 가고 재신청은 새 건이다
 * (`DESIGN_ADMIN.md` 5장). 승인도 되돌리기 어렵다 — 승인된 건은 시작 전에만 취소된다.
 * 둘 다 확인 대화상자를 거친다.
 */
export function useDecideRequest(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DecisionInput) => {
      const { data } = await api.post<LeaveRequest>(
        `/requests/${id}/decision`,
        decisionBody(input),
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}
