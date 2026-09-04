import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 근태 (A-501 · A-503). Swagger `5. 근태` 확인 2026-08-28.
 *
 * **관리팀 전용이다.** 일반 직원이 부르면 403이다 (실호출 확인).
 *
 * 주 52시간 판정은 **전부 서버가 한다.** 화면은 받은 값을 표기만 한다 — 분을 더하거나
 * 한도까지 남은 시간을 빼보지 않는다 (명세서 7.2, `CLAUDE.md` 3장).
 */

/**
 * 주간 근로시간과 주 52시간 여유.
 *
 * **`alertLevel`은 서버가 정한다.** 스키마가 직접 그렇게 적고 있다 —
 * "프런트가 분 단위로 다시 판단하면 서버와 기준이 어긋나므로 단계를 서버가 정합니다."
 * 화면은 `totalMinutes`를 보고 단계를 매기지 않는다.
 *
 * `remainingMinutes`는 52시간까지 남은 시간이고, 넘겼으면 음수로 온다.
 * `formatMinutes`가 음수에 `-`를 붙여 준다.
 */
export interface WeeklyWorkSummary {
  employeeId: number;
  employeeName: string | null;
  departmentName: string | null;
  weekStartDate: string;
  weekEndDate: string;
  totalMinutes: number;
  normalMinutes: number;
  overtimeMinutes: number;
  remainingMinutes: number;
  overtimeRemainingMinutes: number;
  /** 0 없음 / 1 안내(48h) / 2 경고(52h 임박) / 3 초과 */
  alertLevel: number;
  /** 알림을 실제로 보낸 시각. 안 보냈으면 없다 */
  alertedAt: string | null;
}

export const attendanceKeys = {
  all: ['attendance'] as const,
  weekly: (date: string, onlyAlerted: boolean) =>
    [...attendanceKeys.all, 'weekly', date, onlyAlerted] as const,
  daily: (date: string) => [...attendanceKeys.all, 'daily', date] as const,
  corrections: (employeeId: number, date: string) =>
    [...attendanceKeys.all, 'corrections', employeeId, date] as const,
};

/**
 * 그 날짜가 속한 주의 전 직원 근로시간. `date`는 서버가 필수로 받는다.
 *
 * `onlyAlerted`를 켜면 서버가 알림 대상만 걸러 준다. **앱에서 `alertLevel`로 거르지 않는다** —
 * 기준이 서버와 어긋나면 관리팀이 놓치는 사람이 생긴다.
 */
export function useWeeklyWork(date: string, onlyAlerted: boolean) {
  return useQuery({
    queryKey: attendanceKeys.weekly(date, onlyAlerted),
    enabled: date !== '',
    queryFn: async ({ signal }) => {
      const { data } = await api.get<WeeklyWorkSummary[]>('/attendance/weekly', {
        params: { date, ...(onlyAlerted ? { onlyAlerted: true } : {}) },
        signal,
      });
      return data;
    },
  });
}


/**
 * 하루치 근태 한 줄 (A-501).
 *
 * **`checkInAt`·`checkOutAt` 은 보정이 반영된 값이다.** 원본이 궁금하면 보정 이력을
 * 따로 조회한다 — 그 화면은 아직 없다.
 *
 * 시간은 전부 **분 단위 정수**로 온다. 스키마가 이유를 적고 있다 — "소수 시간으로
 * 내려보내면 반올림 오차가 급여에 그대로 실립니다." 표기는 `formatMinutes` 를 거친다.
 *
 * `confirmed` 는 판정이 확정된 날이다. **급여 계산이 이 값을 본다** — 미확정 근태가
 * 있는 직원은 급여에서 `skipped` 로 빠진다 (`docs/API_급여.md`).
 *
 * 자정을 넘긴 퇴근은 `checkOutAt` 의 **날짜**가 하루 뒤다. 시각만 떼어 적으면 새벽에
 * 출근한 것으로 읽히므로 `formatKstClock` 에 근무일을 같이 넘긴다.
 */
export interface AttendanceDaily {
  employeeId: number;
  employeeName: string | null;
  departmentName: string | null;
  /** `yyyy-MM-dd`. 요청한 날짜와 같다 */
  workDate: string;
  dayOfWeek: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  /** 보정이 들어간 날 */
  corrected: boolean;
  /** 급여 산정 기준 */
  payrollMinutes: number;
  /** 법정 기준 */
  statutoryMinutes: number;
  basicMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  holidayMinutes: number;
  holidayOvertimeMinutes: number;
  weeklyHolidayMinutes: number;
  dutyMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  /** 판정이 확정된 날 */
  confirmed: boolean;
  judgedAt: string | null;
}

/**
 * 그 날짜의 전 직원 근태. `date` 를 서버가 필수로 받는다.
 *
 * 페이지네이션이 없다 — 배열이 통째로 온다. 인원이 늘면 서버에 페이지를 요청한다.
 */
export function useDailyAttendance(date: string) {
  return useQuery({
    queryKey: attendanceKeys.daily(date),
    enabled: date !== '',
    queryFn: async ({ signal }) => {
      const { data } = await api.get<AttendanceDaily[]>('/attendance/daily', {
        params: { date },
        signal,
      });
      return data;
    },
  });
}

/**
 * 근태를 만드는 세 동작 (근태 정리 화면).
 *
 * 세콤 태그가 근태가 되기까지 두 단계를 거친다 (`docs/API_근태.md` 2장).
 *
 * ```
 * 수신 버퍼 ──(collect)──> 근태 기록 ──(judge)──> 판정 완료 ──> 주간 집계
 * ```
 *
 * **정기 배치가 따로 돈다.** 이 화면의 버튼은 "지금 반영"이 필요할 때 쓰는 것이고,
 * 서버가 그 용도로 열어 둔 경로다.
 */

/** 보정 이력 한 건. **누가 언제 왜 고쳤는지**가 분쟁에 필요한 값이다 */
export interface AttendanceCorrection {
  id: number;
  employeeId: number;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  reason: string;
  correctedById: number | null;
  correctedByName: string | null;
  correctedAt: string;
}

/**
 * 보정 입력.
 *
 * **고칠 것만 보낸다.** 보내지 않은 쪽은 원본 값을 그대로 쓴다고 스펙이 적고 있다.
 *
 * **시각이 아니라 날짜+시각이다.** 야간근무는 자정을 넘기므로 `workDate`가 출근일이고,
 * 퇴근이 다음 날이면 `checkOutAt`의 날짜가 하루 뒤다.
 */
export interface CorrectionInput {
  workDate: string;
  /** `2026-09-01T09:00:00`. 서버가 돌려주는 것과 같은 모양으로 보낸다 */
  checkInAt?: string;
  checkOutAt?: string;
  /** 왜 고쳤는지. 서버가 필수로 받는다 */
  reason: string;
}

/** 서버가 받는 한계. 입력칸이 이 값을 그대로 쓴다 */
export const CORRECTION_REASON_MAX = 255;

export interface JudgeResult {
  date: string;
  /** 판정한 인원 */
  judged: number;
  /** 주간 집계를 다시 낸 인원 */
  aggregated: number;
  confirmed: boolean;
}

export interface CollectResult {
  /** 수신 버퍼에서 읽은 행 수 */
  read: number;
  collected: number;
  /** 기존 기록의 시각이 바뀐 건수 — **그만큼 재판정이 필요하다** */
  changed: number;
  /** 직원을 못 찾았거나 형식을 못 읽어 건너뛴 건수 */
  skipped: number;
}

/** 그 사람 그 날의 보정 이력. 원본이 궁금할 때 본다 */
export function useCorrections(employeeId: number | undefined, date: string) {
  return useQuery({
    queryKey: attendanceKeys.corrections(employeeId ?? 0, date),
    enabled: employeeId !== undefined && date !== '',
    queryFn: async ({ signal }) => {
      const { data } = await api.get<AttendanceCorrection[]>(
        `/attendance/${employeeId}/corrections`,
        { params: { date }, signal },
      );
      return data;
    },
  });
}

/**
 * 근태 보정.
 *
 * **원본을 고치지 않는다.** 보정만 쌓고 그 날짜를 다시 판정한다 (`docs/API_근태.md` 2장).
 * 그래서 되돌릴 수 없는 동작이 아니다 — 잘못 넣었으면 다시 보정한다.
 */
export function useCorrectAttendance(employeeId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CorrectionInput) => {
      const { data } = await api.post<AttendanceCorrection>(
        `/attendance/${employeeId}/corrections`,
        input,
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

/**
 * 판정 재실행. `date`가 필수다.
 *
 * `confirm`을 켜면 그 날 근태가 **확정**된다. 확정돼야 급여 계산에 들어간다 —
 * 미확정 근태가 있는 직원은 급여에서 `skipped`로 빠진다 (`docs/API_급여.md`).
 *
 * **`confirm`은 확정 상태를 넘긴 값으로 덮는다** (2026-09-02 서버 답). 그대로 두는 것이
 * 아니다 — 기본값이 `false`라 **확정을 빼고 부르면 그 날이 잠정으로 돌아간다.**
 * 되돌리는 경로가 따로 있는 것이 아니라 이것이 그 경로다.
 */
export function useJudgeAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, confirm }: { date: string; confirm?: boolean }) => {
      const { data } = await api.post<JudgeResult>('/attendance/judge', null, {
        params: { date, ...(confirm ? { confirm: true } : {}) },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}

/**
 * 세콤 원본을 근태 기록으로 옮긴다.
 *
 * **파라미터가 없다.** 날짜를 고르는 동작이 아니라 버퍼에 쌓인 것을 통째로 옮기는
 * 동작이라, 이 화면의 기준일과 무관하게 돈다.
 */
export function useCollectAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CollectResult>('/attendance/collect');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}
