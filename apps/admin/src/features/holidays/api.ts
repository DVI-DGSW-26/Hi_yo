import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { todayInKst } from '@/lib/datetime';

/**
 * 공휴일 (Swagger `8. 공휴일`). 명세는 `docs/API_연차.md` 9장에 있다.
 *
 * **연차 차감일 계산이 이 목록을 본다.** 등록되지 않은 날은 근무일로 계산돼
 * 연차가 실제보다 더 깎인다. 음력 공휴일(설날·추석)과 대체공휴일은 해마다 날짜가
 * 달라 시드에 없고, 연초에 관리팀이 넣어야 한다 — 서버 스펙이 그렇게 적고 있다.
 *
 * **화면은 날짜를 만들어내지 않는다.** 설날이 언제인지, 대체공휴일이 붙는지를
 * 앱이 판정하지 않는다. 음력 계산도 공휴일 규칙도 문서에 없는 것이고,
 * 잘못 넣으면 전 직원의 연차가 틀어진다. 사람이 넣고 화면은 등록된 것만 보여준다.
 *
 * 수정 API가 없다. 잘못 넣었으면 지우고 다시 넣는다.
 */

export type HolidayType = 'PUBLIC' | 'COMPANY';

export interface Holiday {
  id: number;
  /** `yyyy-MM-dd` */
  holidayDate: string;
  name: string;
  holidayType: HolidayType;
}

export interface HolidayCreateInput {
  holidayDate: string;
  name: string;
  holidayType: HolidayType;
}

/** 서버가 받는 한계. 등록 화면의 입력칸이 이 값을 그대로 쓴다 */
export const HOLIDAY_NAME_MAX = 50;

export const holidayKeys = {
  all: ['holidays'] as const,
  ofYear: (year: number) => [...holidayKeys.all, year] as const,
};

/** 그 해에 등록된 공휴일. 거르는 것은 서버가 한다 */
export function useHolidays(year: number) {
  return useQuery({
    queryKey: holidayKeys.ofYear(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Holiday[]>('/holidays', { params: { year }, signal });
      return data;
    },
  });
}

/**
 * 고를 수 있는 연도 — **올해와 내년.**
 *
 * 등록된 연도를 서버에서 알아낼 방법이 없다. 보험 요율과 달리 `/years` 경로가 없고,
 * `year` 없이 부르면 전체가 오지 않는다 — 시드에 2026·2027 두 해가 들어 있는데
 * 2026년 9건만 왔다 (2026-08-31 실호출. `docs/API_연차.md` 9장).
 *
 * **지난 해를 목록에 두지 않는다.** 이 화면의 일은 올해 빠진 날을 채우는 것과, 연초에
 * 내년을 미리 넣는 것 둘이다. 지난 해는 계산이 이미 끝났고 지워도 되돌아가지 않는다.
 * 더 넓게 봐야 할 일이 생기면 서버에 연도 목록을 요청한다 — 화면에서 범위를 지어내지 않는다.
 */
export function selectableYears(): number[] {
  const thisYear = currentYear();
  return [thisYear + 1, thisYear];
}

/** 올해, **KST 기준**. 연말에 기기 타임존을 따라가면 한 해가 밀린다 */
export function currentYear(): number {
  return Number(todayInKst().slice(0, 4));
}

/** 넣는 즉시 이후 연차 계산에 반영된다 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: HolidayCreateInput) => {
      const { data } = await api.post<Holiday>('/holidays', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: holidayKeys.all }),
  });
}

/**
 * 잘못 등록한 것을 바로 지우는 용도다.
 *
 * **이미 그 날짜로 계산된 연차는 다시 계산되지 않는다.** 서버 스펙이 그렇게 적고 있다.
 * 되돌릴 수 없는 동작이라 확인 대화상자와 `danger` 버튼을 같이 쓴다.
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/holidays/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: holidayKeys.all }),
  });
}
