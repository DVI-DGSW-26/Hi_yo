import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 당직 (A-504). Swagger `6. 당직` 확인 2026-08-28.
 *
 * **관리팀 전용이다.** 명단 대상자 조회와 당직표 전체 조회는 일반 직원에게 403이다
 * (`docs/00_문서_인덱스.md` — 교체 상대 후보를 본인이 볼 수 없다).
 *
 * 순번(`rotationSeq`)은 **관리팀이 정한다.** 가나다순 자동 정렬이 아니며 자동 편성이
 * 이 순서대로 돈다. 화면에서 순번을 다시 매기지 않는다.
 *
 * 목록은 전부 배열로 온다. 봉투(`content`)가 아니다.
 */

export type RotationCycle = 'DAILY' | 'BIWEEKLY' | 'ON_DEMAND';

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
  rotationCycle: RotationCycle;
  /** false면 자동 편성을 돌릴 수 없다. 평일연장이 그렇다 */
  autoAssignable: boolean;
  workStart: string | null;
  workEnd: string | null;
  /** true면 하루에 배정이 여러 건 생긴다. 배정 등록에 `slotId`가 필요하다 */
  useSlot: boolean;
  slots: DutySlot[];
  memberCount: number;
}

export interface DutyMember {
  id: number;
  employeeId: number;
  employeeName: string | null;
  departmentName: string | null;
  rotationSeq: number;
  /** 명단에서 뺀 사람. 과거 배정 이력을 지우지 않으려고 행을 지우지 않고 꺼 둔다 */
  active: boolean;
}

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
  /** 교체 요청이 걸려 있다. 이 배정은 지울 수 없다 */
  swapPending: boolean;
}

/** 배정된 사람이 그날 연차를 쓴 경우 */
export interface DutyConflict {
  dutyDate: string;
  employeeId: number;
  employeeName: string | null;
  reason: string | null;
}

/**
 * 자동 편성 결과.
 *
 * **연차와 겹치는 배정을 자동으로 건너뛰지 않는다.** 다음 순번으로 넘길지 사람을 바꿀지가
 * 확정되지 않아, 겹친 건을 그대로 배정하고 `conflicts`로 알려 관리팀이 판단하게 한다.
 * 조용히 건너뛰면 순번이 어긋난 이유를 아무도 설명할 수 없다 (서버 스펙 `OPEN-QUESTIONS E-8`).
 */
export interface DutyGenerateResult {
  rosterId: number;
  rosterName: string | null;
  from: string;
  to: string;
  created: number;
  /** 이미 배정돼 있어 건드리지 않은 날짜 수 */
  skipped: number;
  conflicts: DutyConflict[];
}

export interface AddMemberInput {
  employeeId: number;
  rotationSeq: number;
}

export interface AssignInput {
  dutyDate: string;
  employeeId: number;
  /** 슬롯을 쓰는 명단(경비교대)만 필요하다. 나머지는 비운다 */
  slotId?: number;
}

export const dutyKeys = {
  all: ['duty'] as const,
  rosters: () => [...dutyKeys.all, 'rosters'] as const,
  members: (rosterId: number) => [...dutyKeys.all, 'members', rosterId] as const,
  schedules: (rosterId: number, from: string, to: string) =>
    [...dutyKeys.all, 'schedules', rosterId, from, to] as const,
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

/** 한 직원이 여러 명단에 동시에 속할 수 있다. 뺐다가 다시 넣으면 기존 행이 되살아난다 */
export function useAddMember(rosterId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddMemberInput) => {
      const { data } = await api.post<DutyMember>(`/duty/rosters/${rosterId}/members`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}

/** 순번을 바꾸면 순환 순서가 바로 달라진다. 이미 만들어진 배정은 그대로 남는다 */
export function useChangeRotationSeq(rosterId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      rotationSeq,
    }: {
      employeeId: number;
      rotationSeq: number;
    }) => {
      const { data } = await api.patch<DutyMember>(
        `/duty/rosters/${rosterId}/members/${employeeId}`,
        undefined,
        { params: { rotationSeq } },
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}

/** 명단에서 제외. 행을 지우지 않고 꺼 두므로 다시 넣으면 되살아난다 */
export function useRemoveMember(rosterId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: number) => {
      await api.delete(`/duty/rosters/${rosterId}/members/${employeeId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}

export function useDutySchedules(rosterId: number | undefined, from: string, to: string) {
  return useQuery({
    queryKey: dutyKeys.schedules(rosterId ?? -1, from, to),
    enabled: rosterId !== undefined && from !== '' && to !== '',
    queryFn: async ({ signal }) => {
      const { data } = await api.get<DutySchedule[]>('/duty/schedules', {
        params: { from, to, rosterId },
        signal,
      });
      return data;
    },
  });
}

/**
 * 순번대로 자동 편성.
 *
 * 이미 배정된 날짜는 건드리지 않아 몇 번을 다시 돌려도 안전하다. 그래서 확인 대화상자를
 * 두지 않는다 — 되돌릴 수 없는 동작이 아니다 (`DESIGN_ADMIN.md` 6장).
 */
export function useGenerateSchedules(rosterId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      const { data } = await api.post<DutyGenerateResult>(
        `/duty/rosters/${rosterId}/schedules/generate`,
        { from, to },
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}

/** 배정 직접 등록. 자동 편성이 안 되는 명단(평일연장)은 이것으로만 넣는다 */
export function useAssignSchedule(rosterId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssignInput) => {
      const { data } = await api.post<DutySchedule>(
        `/duty/rosters/${rosterId}/schedules`,
        input,
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}

/** 담당자 직접 변경 — 상대 동의 없이 관리팀 권한으로 바꾼다 */
export function useChangeAssignee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      employeeId,
    }: {
      scheduleId: number;
      employeeId: number;
    }) => {
      const { data } = await api.patch<DutySchedule>(
        `/duty/schedules/${scheduleId}`,
        undefined,
        { params: { employeeId } },
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}

/** 배정 삭제. 교체 요청이 진행 중인 배정은 서버가 막는다 — 상대방이 응답할 대상이 사라진다 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: number) => {
      await api.delete(`/duty/schedules/${scheduleId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dutyKeys.all }),
  });
}
