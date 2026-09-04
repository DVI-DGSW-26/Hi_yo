import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LIST_PAGE_SIZE, api, type PageParams, type PageResponse } from '@/lib/api';

/**
 * 연차 (S-301). `GET /leave/balance`, `GET /leave/calendar`, `POST /requests`
 *
 * **차감 일수는 서버가 계산한다.** 신청에 일수를 실어 보내지 않는다 — 클라이언트가 보낸 값을
 * 믿으면 잔여 검사를 우회할 수 있다. 주말·공휴일도 서버가 뺀다.
 *
 * 앱은 연차를 합산하지도, 잔여를 다시 세지도 않는다.
 */

/** 신청 종류. 화면은 이 값을 보고 입력 칸을 정한다 */
export interface RequestType {
  id: number;
  code: string;
  name: string;
  deductLeave: boolean;
  deductPay: boolean;
  /** true면 startTime/endTime이 필요하다 */
  needTime: boolean;
  halfDay: boolean;
}

export interface LeaveGrant {
  [key: string]: unknown;
}

/**
 * 내 연차 잔여.
 *
 * `remaining`은 지금 신청할 수 있는 일수, `confirmedRemaining`은 실제로 소진된 기준의 잔여다.
 * 결재 대기중인 신청이 있으면 둘이 달라진다. 직원이 "왜 잔여가 줄었지" 하고 혼란스러워하는
 * 지점이라 나눠서 보여준다.
 */
export interface LeaveBalance {
  employeeId: number;
  employeeName: string;
  fiscalYear: number;
  granted: number;
  used: number;
  pending: number;
  remaining: number;
  confirmedRemaining: number;
  grantedByType: Record<string, number>;
  grants: LeaveGrant[];
}

/** 달력 한 칸 */
export interface CalendarEntry {
  date: string;
  employeeId: number;
  employeeName: string | null;
  typeCode: string;
  typeName: string | null;
  days: number;
  requestId: number | null;
}

/**
 * **`REVIEWED`는 검토를 마치고 승인을 기다리는 상태다** (2026-09-02 서버 변경).
 * 결재가 검토·승인 두 단계가 되면서 생겼다.
 *
 * 본인용 화면에서는 `PENDING`과 똑같이 `결재 기다리는 중`으로 보여준다 — 신청한 사람에게
 * 관리팀 내부의 단계는 알 바가 아니고, 어느 쪽이든 아직 기다리는 것이다.
 */
export type RequestStatus = 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'CANCELED';

/** 주말·공휴일이라 차감에서 빠진 날 */
export interface ExcludedDate {
  [key: string]: unknown;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string | null;
  departmentName: string | null;
  typeCode: string;
  typeName: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  /** 서버가 계산한 차감 일수 */
  leaveDays: number;
  fiscalYear: number;
  reason: string | null;
  emergencyContact: string | null;
  status: RequestStatus;
  companyLeave: boolean;
  /** 5일을 신청했는데 3일만 깎인 이유를 이걸로 설명한다 */
  excludedDates: ExcludedDate[];
  approverId: number | null;
  approverName: string | null;
  decisionComment: string | null;
  signed: boolean;
  decidedAt: string | null;
}

export interface LeaveRequestInput {
  typeCode: string;
  startDate: string;
  endDate: string;
  /**
   * `needTime`인 종류에만 넣는다. 서버가 돌려주는 것과 같은 `HH:mm:ss` 모양이다.
   *
   * 반차는 시각이 정해져 있다 (`halfDay.ts`). 그 밖의 `needTime` 종류(외출·조퇴)는
   * 직접 받아야 하는데 시각을 고르는 칸이 아직 없다.
   */
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export const leaveKeys = {
  all: ['leave'] as const,
  balance: () => [...leaveKeys.all, 'balance'] as const,
  calendar: (from: string, to: string) => [...leaveKeys.all, 'calendar', from, to] as const,
  types: () => ['requests', 'types'] as const,
  requests: (params: PageParams) => ['requests', 'list', params] as const,
};

export function useLeaveBalance() {
  return useQuery({
    queryKey: leaveKeys.balance(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LeaveBalance>('/leave/balance', { signal });
      return data;
    },
  });
}

export function useLeaveCalendar(from: string, to: string) {
  return useQuery({
    queryKey: leaveKeys.calendar(from, to),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<CalendarEntry[]>('/leave/calendar', {
        params: { from, to },
        signal,
      });
      return data;
    },
  });
}

export function useRequestTypes() {
  return useQuery({
    queryKey: leaveKeys.types(),
    // 종류는 자주 바뀌지 않는다. 화면을 옮길 때마다 다시 부르지 않는다.
    staleTime: 60 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<RequestType[]>('/requests/types', { signal });
      return data;
    },
  });
}

/**
 * 내 신청 목록. **쪽을 이어 붙인다.**
 *
 * 전에는 첫 20건만 받고 끝이었다 — 그보다 많이 낸 사람은 나머지를 볼 방법이 없었고,
 * 잘렸다는 것조차 화면에 나오지 않았다.
 *
 * `size`를 키우는 방식은 쓰지 않는다. 서버가 `MAX_PAGE_SIZE`(100)에서 조용히 자른다.
 */
export function useMyRequests(size: number = LIST_PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: leaveKeys.requests({ size }),
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await api.get<PageResponse<LeaveRequest>>('/requests', {
        params: { page: pageParam, size },
        signal,
      });
      return data;
    },
    // 서버가 `last`로 끝을 알려준다. 화면에서 개수를 세어 판단하지 않는다.
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}

/**
 * 신청 제출.
 *
 * 잔여 초과 판정은 서버가 한다 (422). 앱에서 미리 막지 않는다 —
 * 버튼은 항상 눌리고, 막힌 이유는 서버가 준 문구로 알린다.
 */
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LeaveRequestInput) => {
      const { data } = await api.post<LeaveRequest>('/requests', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<LeaveRequest>(`/requests/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}
