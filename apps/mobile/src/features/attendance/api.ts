import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 내 근태 (S-501). `GET /attendance/{employeeId}`, `GET /attendance/{employeeId}/weekly`
 *
 * **앱은 이 흐름의 어디에도 값을 넣지 않는다.** 출퇴근 시각조차 세콤 태그에서 서버가
 * 도출한 파생값이고, 연장·야간·지각은 판정의 결과다 (명세서 7.3).
 *
 * **합계를 앱에서 더하지 않는다.** 서버가 `totals`를 같이 준다 — 스펙이 이유를 적어
 * 두었다: "프런트가 더하면 미판정 날짜를 어떻게 셀지가 화면마다 달라져 값이 갈립니다."
 *
 * **본인 것만 부른다.** `employeeId` 자리에는 `GET /auth/me`가 준 값만 넣는다.
 */

/** 하루치. 시간은 전부 분 단위 정수다 */
export interface AttendanceDay {
  employeeId: number;
  employeeName: string | null;
  departmentName: string | null;
  workDate: string;
  dayOfWeek: string | null;
  /** 보정이 반영된 값이다. 자정을 넘긴 퇴근은 날짜가 하루 뒤다 */
  checkInAt: string | null;
  checkOutAt: string | null;
  corrected: boolean;
  payrollMinutes: number;
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
  confirmed: boolean;
  judgedAt: string | null;
}

/** 기간 합계. **서버가 낸 값이다** */
export interface AttendanceTotals {
  /** 실제 근무한 날 수 (근무시간 > 0) */
  workedDays: number;
  /** 아직 확정되지 않은 날 수 */
  unconfirmedDays: number;
  payrollMinutes: number;
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
}

export interface AttendancePeriod {
  employeeId: number;
  employeeName: string | null;
  from: string;
  to: string;
  totals: AttendanceTotals;
  days: AttendanceDay[];
}

/**
 * 주간 근로시간 한 주.
 *
 * **단계는 서버가 정한다.** 스키마가 그렇게 적고 있다 — "프런트가 분 단위로 다시
 * 판단하면 서버와 기준이 어긋나므로 단계를 서버가 정합니다."
 *
 * `remainingMinutes`는 52시간까지 남은 시간이고 넘겼으면 음수로 온다.
 */
export interface WeeklyWork {
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
  alertedAt: string | null;
}

export const attendanceKeys = {
  all: ['attendance'] as const,
  period: (employeeId: number, from: string, to: string) =>
    [...attendanceKeys.all, 'period', employeeId, from, to] as const,
  weekly: (employeeId: number) => [...attendanceKeys.all, 'weekly', employeeId] as const,
};

/** 기간 근태. `from`·`to`가 **둘 다 필수**다 — 기본값이 없다 */
export function useMyAttendance(employeeId: number | undefined, from: string, to: string) {
  return useQuery({
    queryKey: attendanceKeys.period(employeeId ?? 0, from, to),
    enabled: employeeId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<AttendancePeriod>(`/attendance/${employeeId}`, {
        params: { from, to },
        signal,
      });
      return data;
    },
  });
}

/**
 * 내 주간 근로시간.
 *
 * **날짜를 받지 않는다.** `employeeId` 하나로 부르면 서버가 주 목록을 배열로 준다 —
 * 몇 주를 보여줄지 화면이 정하지 않고 받은 만큼 그린다.
 */
export function useMyWeeklyWork(employeeId: number | undefined) {
  return useQuery({
    queryKey: attendanceKeys.weekly(employeeId ?? 0),
    enabled: employeeId !== undefined,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<WeeklyWork[]>(`/attendance/${employeeId}/weekly`, { signal });
      return data;
    },
  });
}
