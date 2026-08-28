import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 당직 (S-503). Swagger `6. 당직` 확인 2026-08-28.
 *
 * 이 화면 계열은 **본인용**이다. `GET /duty/schedules/{employeeId}`는 본인 id로만 부른다.
 *
 * **교체 상대방은 그 명단 안의 사람만 된다.** 서버가 검증한다 —
 * "본인 당직만, 명단 안의 사람에게만 보낼 수 있다". 앱에서 후보를 도메인 규칙으로
 * 추려내지 않는다 (그날 이미 배정됐는지 등). 판정은 서버가 하고 막힌 이유는 서버 문구로 알린다.
 *
 * 목록은 전부 배열로 온다. 신청·결재와 달리 봉투(`content`)가 아니다.
 */

/** 명단 종류. 경비교대만 슬롯(중식·석식)을 쓴다 */
export interface DutySlot {
  id: number;
  code: string;
  startTime: string | null;
  endTime: string | null;
}

export interface DutyRoster {
  id: number;
  code: string;
  name: string;
  rotationCycle: 'DAILY' | 'BIWEEKLY' | 'ON_DEMAND';
  autoAssignable: boolean;
  workStart: string | null;
  workEnd: string | null;
  /** true면 하루에 배정이 여러 건 생긴다. 화면이 슬롯 칸을 그릴지 이 값으로 정한다 */
  useSlot: boolean;
  slots: DutySlot[];
  memberCount: number;
}

/** 당직 배정 한 건. 경비교대는 같은 날짜에 중식·석식 두 건이 온다 */
export interface DutySchedule {
  id: number;
  rosterId: number;
  rosterCode: string | null;
  rosterName: string | null;
  dutyDate: string;
  dayOfWeek: string | null;
  slotId: number | null;
  slotCode: string | null;
  startTime: string | null;
  endTime: string | null;
  employeeId: number;
  employeeName: string | null;
  departmentName: string | null;
  status: 'PLANNED' | 'DONE' | 'SWAPPED';
  /** 교체 요청이 걸려 있는 배정. 또 신청하지 않도록 화면이 표시한다 */
  swapPending: boolean;
}

/**
 * 교체 요청 상태.
 *
 * **`EXPIRED`는 거절이 아니다.** 상대방이 못 본 것이므로 다시 요청하거나 다른 사람에게
 * 부탁할 수 있다. 화면이 `REJECTED`와 구분해 보여줘야 한다 — API가 명시적으로 요구한다.
 * (명세서는 둘 다 '자동반려'로만 적고 있어 API 쪽이 더 자세하다.)
 */
export type DutySwapStatus = 'PENDING' | 'AGREED' | 'REJECTED' | 'EXPIRED';

export interface DutySwap {
  id: number;
  dutyScheduleId: number;
  rosterName: string | null;
  dutyDate: string;
  slotCode: string | null;
  requesterId: number;
  requesterName: string | null;
  targetId: number;
  targetName: string | null;
  status: DutySwapStatus;
  reason: string | null;
  responseComment: string | null;
  requestedAt: string;
  /** 24시간 뒤. 지나면 자동 반려되고 원 담당자가 유지된다 */
  expiresAt: string | null;
  respondedAt: string | null;
}

export interface DutyMember {
  id: number;
  employeeId: number;
  employeeName: string | null;
  departmentName: string | null;
  /** 관리팀이 정하는 순번. 가나다순이 아니며 자동 편성이 이 순서대로 돈다 */
  rotationSeq: number;
  active: boolean;
}

export interface DutySwapInput {
  scheduleId: number;
  targetId: number;
  reason?: string;
}

export interface DutyDecisionInput {
  swapId: number;
  agreed: boolean;
  comment?: string;
}

export const dutyKeys = {
  all: ['duty'] as const,
  rosters: () => [...dutyKeys.all, 'rosters'] as const,
  members: (rosterId: number) => [...dutyKeys.all, 'members', rosterId] as const,
  schedules: (employeeId: number, from: string, to: string) =>
    [...dutyKeys.all, 'schedules', employeeId, from, to] as const,
  inbox: () => [...dutyKeys.all, 'swaps', 'inbox'] as const,
  sent: () => [...dutyKeys.all, 'swaps', 'sent'] as const,
};

/** 명단 정의는 자주 바뀌지 않는다. 화면을 옮길 때마다 다시 부르지 않는다 */
const ROSTER_STALE_TIME = 60 * 60 * 1000;

export function useDutyRosters() {
  return useQuery({
    queryKey: dutyKeys.rosters(),
    staleTime: ROSTER_STALE_TIME,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<DutyRoster[]>('/duty/rosters', { signal });
      return data;
    },
  });
}

/**
 * 교체 상대 후보. 이 명단에 속한 사람만 받을 수 있다.
 *
 * **본인용 화면에서는 아직 쓸 수 없다.** 일반 직원이 부르면 403이다 (2026-08-28 실호출).
 * Swagger에는 `관리팀만` 표시가 없는데 실제로는 막혀 있다. 교체 신청 화면이 이것 때문에
 * 막혀 있어 남겨만 둔다 — 서버가 열어주면 바로 붙인다.
 */
export function useDutyMembers(rosterId: number | undefined) {
  return useQuery({
    queryKey: dutyKeys.members(rosterId ?? -1),
    enabled: rosterId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<DutyMember[]>(`/duty/rosters/${rosterId}/members`, { signal });
      return data;
    },
  });
}

/** 내 당직 일정. **본인 id로만 부른다** */
export function useMyDutySchedules(employeeId: number | undefined, from: string, to: string) {
  return useQuery({
    queryKey: dutyKeys.schedules(employeeId ?? -1, from, to),
    enabled: employeeId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<DutySchedule[]>(`/duty/schedules/${employeeId}`, {
        params: { from, to },
        signal,
      });
      return data;
    },
  });
}

/** 내가 응답해야 할 교체 요청. 서버가 마감 임박 순으로 준다 — 앱에서 다시 정렬하지 않는다 */
export function useSwapInbox() {
  return useQuery({
    queryKey: dutyKeys.inbox(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<DutySwap[]>('/duty/swaps/inbox', { signal });
      return data;
    },
  });
}

/**
 * 받은 요청 한 건.
 *
 * **단건 조회 API가 없다.** `GET /duty/swaps/{id}`는 스펙에 없어서 받은 목록에서 골라낸다 —
 * 없는 엔드포인트를 만들지 않는다 (`CLAUDE.md` 4장). 목록 캐시를 그대로 쓰므로
 * 화면을 열 때 다시 부르지 않는다.
 *
 * 답을 마친 요청은 목록에서 빠지므로 `null`이 된다. 화면이 그 경우를 그린다.
 */
export function useInboxSwap(swapId: number) {
  return useQuery({
    queryKey: dutyKeys.inbox(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<DutySwap[]>('/duty/swaps/inbox', { signal });
      return data;
    },
    select: (swaps) => swaps.find((swap) => swap.id === swapId) ?? null,
  });
}

export function useSentSwaps() {
  return useQuery({
    queryKey: dutyKeys.sent(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<DutySwap[]>('/duty/swaps/sent', { signal });
      return data;
    },
  });
}

/**
 * 교체 신청.
 *
 * 상대가 명단 밖이거나 내 당직이 아니면 서버가 막는다. 앱에서 미리 판정하지 않는다 —
 * 버튼은 항상 눌리고, 막힌 이유는 서버가 준 문구로 알린다.
 *
 * **화면은 아직 없다.** `targetId`를 고를 수가 없어서다 — `useDutyMembers` 주석 참고.
 */
export function useRequestSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduleId, targetId, reason }: DutySwapInput) => {
      const { data } = await api.post<DutySwap>(`/duty/schedules/${scheduleId}/swaps`, {
        targetId,
        reason,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}

/** 교체 요청에 응답. 동의하면 그 자리에서 담당자가 바뀐다 */
export function useDecideSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ swapId, agreed, comment }: DutyDecisionInput) => {
      const { data } = await api.post<DutySwap>(`/duty/swaps/${swapId}/decision`, {
        agreed,
        comment,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}

export function useCancelSwap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (swapId: number) => {
      const { data } = await api.delete<DutySwap>(`/duty/swaps/${swapId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}
