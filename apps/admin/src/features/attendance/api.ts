import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 근태 (A-503). Swagger `5. 근태` 확인 2026-08-28.
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
