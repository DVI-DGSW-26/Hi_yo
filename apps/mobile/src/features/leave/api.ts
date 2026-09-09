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

/**
 * 신청 종류. 화면은 이 값을 보고 입력 칸을 정한다.
 *
 * **`halfDay`인 종류에는 반차 시각이 함께 온다** (2026-09-02부터). 그전에는 앱이 갖고
 * 있어서 회사가 시각을 바꾸면 앱을 다시 배포해야 했다. 서버 문서가 **시각을 앱에
 * 하드코딩하지 말고 이 값을 그대로 실어 보내라**고 적고 있다 (`halfDay.ts`).
 */
export interface RequestType {
  id: number;
  code: string;
  name: string;
  deductLeave: boolean;
  deductPay: boolean;
  /** true면 startTime/endTime이 필요하다 */
  needTime: boolean;
  halfDay: boolean;
  /** `halfDay`가 아닌 종류에는 없다. `09:00:00` 모양이다 */
  amStartTime: string | null;
  amEndTime: string | null;
  pmStartTime: string | null;
  pmEndTime: string | null;
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
  /**
   * **신청인 서명 여부다** (2026-09-02부터 온다).
   *
   * `signed`(결재자 서명)와 다른 값이다. 단체연차와 관리팀 대리 등록은 그 자리에 직원이
   * 없어 서명을 못 받고 접수되므로 이 값이 `false`로 시작한다 — 종이로는 나중에 각자
   * 도장을 찍는 자리다. `PATCH /requests/{id}/signature`로 채운다.
   */
  applicantSigned: boolean;
  /** 결재자 서명. 신청인 것과 별개다 */
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
   * 반차 시각은 **종류 응답에 실려 온다** (`halfDay.ts`). 그 밖의 `needTime`
   * 종류(외출·조퇴)는 사람마다 달라 직접 받는다.
   */
  startTime?: string;
  endTime?: string;
  reason?: string;
  /**
   * 신청인 서명. base64 PNG 다 — `data:` 앞머리는 붙이지 않는다.
   *
   * **종이 서식의 「작성」 칸이다** (2026-09-02부터 서버가 받는다). 결재자 서명과는
   * 별개로 남고, 응답에서는 `applicantSigned` 로 온다.
   *
   * **서버에서는 선택이지만 화면에서는 필수로 받는다** — 서버가 필수로 두지 않은 것은
   * 관리팀 대리 등록 경로가 있어서다 (`docs/API_신청결재.md` 3장).
   */
  signatureImage?: string;
}

export const leaveKeys = {
  all: ['leave'] as const,
  balance: () => [...leaveKeys.all, 'balance'] as const,
  calendar: (from: string, to: string) => [...leaveKeys.all, 'calendar', from, to] as const,
  types: () => ['requests', 'types'] as const,
  requests: (params: PageParams) => ['requests', 'list', params] as const,
  myPromotions: (year?: number) => [...leaveKeys.all, 'promotions', 'me', year ?? 'all'] as const,
  myPlans: (year?: number) => [...leaveKeys.all, 'plans', 'me', year ?? 'all'] as const,
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
    mutationFn: async ({ signatureImage, ...rest }: LeaveRequestInput) => {
      const { data } = await api.post<LeaveRequest>('/requests', {
        ...rest,
        // 서명은 그린 것만 보낸다. **`CLICK` 을 쓰지 않는다** — 결재자에게는 "눌렀다"가
        // 서명이지만 신청인에게는 그에 해당하는 동작이 없다. 서명 없이 접수되는 자리는
        // 관리팀 대리 등록이고, 그건 이 화면이 아니다.
        ...(signatureImage ? { signatureMethod: 'IMAGE', signatureImage } : {}),
      });
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
/**
 * 연차사용계획서 하루치. **값은 `1`(연차) 또는 `0.5`(반차)뿐이다** —
 * 연차 단위가 하루와 반차뿐이라서다 (ADR 0002, `PlannedDay` 스키마).
 */
export interface PlannedDay {
  date: string;
  days: number;
}

/**
 * 제출된 연차사용계획서.
 *
 * **`plannedDays`는 차감된 일수가 아니다.** 계획서는 연차를 깎지 않는다 —
 * 실제 차감은 신청(`POST /requests`)이 결재를 받아야 일어난다. 화면이 이 값을
 * 「쓴 연차」로 보여주면 안 된다 (`LeavePlanResponse` 스키마).
 */
export interface LeavePlan {
  id: number;
  promotionId: number;
  fiscalYear: number;
  round: 'FIRST' | 'SECOND';
  submittedAt: string;
  planDueOn: string;
  /** 마감(통보 + 10일)을 넘겨 낸 건. 서버가 막지 않고 표시만 한다 */
  late: boolean;
  plannedDays: number;
  /**
   * **참고용 계산값이다.** 연차가 그만큼 줄었다는 뜻이 아니다.
   *
   * **조회로 받은 건에는 `null`이다** (2026-09-09 서버 안내) — 제출 시점 값이라 지금은
   * 틀린 숫자라서다. 진짜 잔여는 `GET /leave/balance`다.
   */
  remainingAfterPlan: number | null;
  signed: boolean;
  days: PlannedDay[];
  note: string | null;
  /** 화면에 그대로 띄워도 되는 한국어 안내. 늦게 낸 사정 등이 담긴다 */
  notice: string | null;
}

export interface LeavePlanInput {
  days: PlannedDay[];
  /** 손으로 그린 base64 PNG. `data:` 앞머리는 붙이지 않는다 */
  signatureImage: string;
  note?: string;
}

/**
 * 내가 받은 연차촉진 통보. `GET /leave/promotions/me` (2026-09-09에 열렸다)
 *
 * **S-302로 들어가는 유일한 길이다.** 그전에는 `promotionId`가 관리팀이 발송할 때의
 * 응답에만 담겨서, 계획서 화면을 만들어 두고도 어디에서도 연결하지 못했다 (26번).
 *
 * `year`를 비우면 전체가 온다. 촉진은 해마다 많아야 두 건(1차·2차)이라 나눠 담지 않는다.
 *
 * **`planSubmitted`가 이미 낸 건인지를 말해 준다.** 한 통보당 계획서는 하나고 두 번째
 * 제출은 409라, 낸 건은 들어가는 줄을 놓지 않는다.
 */
export interface LeavePromotion {
  id: number;
  employeeId: number;
  employeeName: string;
  fiscalYear: number;
  round: 'FIRST' | 'SECOND';
  /**
   * **통보 시점의 잔여 스냅샷이다.** 지금 잔여와 다를 수 있다 —
   * 통보서에 찍힌 숫자가 이쪽이라고 스펙이 적고 있다.
   */
  remainingDays: number;
  channel: 'EMAIL' | 'WRITTEN';
  sentAt: string;
  sentTo: string | null;
  /** 계획서 제출 마감 = 통보일 + 10일. 넘겨서 내도 막지 않고 표시만 한다 */
  planDueOn: string;
  planSubmitted: boolean;
  createdByName: string | null;
}

export function useMyPromotions(year?: number) {
  return useQuery({
    queryKey: leaveKeys.myPromotions(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LeavePromotion[]>('/leave/promotions/me', {
        params: year === undefined ? undefined : { year },
        signal,
      });
      return data;
    },
  });
}

/**
 * 내가 낸 연차사용계획서. `GET /leave/promotions/plans/me` (2026-09-09에 열렸다)
 *
 * 그전에는 낸 뒤에 **무슨 날짜를 냈는지 다시 볼 수 없었다** — 제출 응답을 그 화면이
 * 들고 있는 동안만 보였다.
 *
 * **단건 경로(`GET /leave/promotions/{promotionId}/plan`) 대신 목록을 쓴다.** 단건은
 * 없으면 404고, 「아직 안 냈다」는 오류가 아니라 정상 상태다 — 목록에서 찾으면 404를
 * 정상 흐름으로 다룰 필요가 없다. 촉진은 해마다 많아야 두 건이라 무게도 가볍다.
 */
export function useMyPlans(year?: number) {
  return useQuery({
    queryKey: leaveKeys.myPlans(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LeavePlan[]>('/leave/promotions/plans/me', {
        params: year === undefined ? undefined : { year },
        signal,
      });
      return data;
    },
  });
}

/**
 * 연차사용계획서 제출. `POST /leave/promotions/{promotionId}/plan` (2026-09-02에 열렸다)
 *
 * **서명이 필수다.** 결재 서명과 달리 대리 등록 경로가 없다 — 계획서는 직원 본인의
 * 의사표시라는 것이 증빙의 핵심이라고 서버 문서가 적고 있다. 그래서 `signatureImage`를
 * 선택으로 두지 않았다. 신청서(`useCreateRequest`)와 같은 이유로 `CLICK`은 쓰지 않는다.
 *
 * **날짜를 앱에서 거르지 않는다.** 주말·공휴일, 통보일 이전, 그해 12월 31일 이후, 중복은
 * 전부 서버가 422로 거른다. 버튼은 항상 눌리고 막힌 이유는 서버 문구로 알린다 —
 * 신청서와 같은 원칙이다.
 *
 * 한 통보당 계획서는 하나다. 두 번째 제출은 409고, 그 문구도 서버가 준다.
 *
 * **잔여를 다시 읽는다.** 계획서가 연차를 깎지는 않지만 서버가 `remainingAfterPlan`을
 * 새로 세어 주고, 화면이 그 값을 쓴다.
 */
export function useSubmitLeavePlan(promotionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ note, ...rest }: LeavePlanInput) => {
      const { data } = await api.post<LeavePlan>(`/leave/promotions/${promotionId}/plan`, {
        ...rest,
        signatureMethod: 'IMAGE',
        ...(note ? { note } : {}),
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

/**
 * 신청서 단건. **서명하려면 무엇에 대한 서명인지 보여줘야 한다.**
 *
 * 목록에서 넘겨받지 않고 다시 받는다 — 목록을 거치지 않고 들어오는 길이 생겨도
 * 화면이 혼자 설 수 있어야 한다.
 */
export function useRequest(id: number) {
  return useQuery({
    queryKey: ['requests', 'one', id],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LeaveRequest>(`/requests/${id}`, { signal });
      return data;
    },
  });
}

/**
 * 이미 접수된 신청서에 **신청인 서명을 나중에 붙인다.**
 * `PATCH /requests/{id}/signature` (2026-09-02에 열렸다)
 *
 * **단체연차가 이 경로를 쓰는 이유** — 관리팀이 적용을 누르는 순간 서버가 직원마다
 * 신청서를 대신 만든다. 그 자리에 직원이 없어 서명을 받을 수 없다. 관리팀 대리 등록도
 * 같다. 종이로는 나중에 각자 도장을 찍는 자리다.
 *
 * **차감은 이미 끝나 있다.** 전원의 서명을 기다리면 급여 마감이 막혀서, 서버가 차감을
 * 서명 뒤로 미루지 않는다. 그래서 이 화면은 「신청」이 아니라 **「빠진 서명을 채우는」**
 * 자리다 — 문구가 그 사실을 숨기면 직원이 아직 안 쉬어도 되는 줄 안다.
 *
 * `CLICK`을 쓰지 않는다. 신청서(`useCreateRequest`)와 같은 이유다 — 결재자에게는
 * 「눌렀다」가 서명이지만 신청인에게는 그에 해당하는 동작이 없다.
 *
 * **다시 서명하면 옛 서명은 지워진다.** 결재가 끝난 뒤에는 서버가 막는데
 * **단체연차는 예외**다. 화면에서 미리 판정하지 않는다 — 막힌 이유는 서버 문구로 온다.
 */
export function useSignRequest(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signatureImage: string) => {
      const { data } = await api.patch<LeaveRequest>(`/requests/${id}/signature`, {
        signatureMethod: 'IMAGE',
        signatureImage,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] }),
  });
}
