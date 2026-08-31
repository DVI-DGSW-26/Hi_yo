import { useQuery } from '@tanstack/react-query';
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
