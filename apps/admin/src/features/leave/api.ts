import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { currentYear } from '@/lib/datetime';

/**
 * 연차 — 관리팀 (A-301 · A-303 · A-306. Swagger `6. 연차`).
 * 명세는 `docs/API_연차.md` 에 있다.
 *
 * **잔여는 서버가 계산한다.** `granted - used - pending` 을 화면에서 하지 않는다
 * (명세서 7.2, `CLAUDE.md` 3장). 대장은 서버가 준 네 숫자를 그대로 표기한다.
 *
 * **발생 등록(A-306)이 열렸다** (2026-09-02 회신으로 `grantType` 다섯 개의 뜻이
 * 확정됐다). 수정(`PUT /leave/grants/{id}`)은 넣지 않았다 — 잘못 넣은 것은 지우고
 * 다시 넣으면 되고, 폼이 하나 더 생기는 만큼의 값이 없다.
 */

/**
 * 연차관리대장 한 줄.
 *
 * **`noGrant` 는 "연차가 0일" 이 아니라 "아직 안 넣었다" 는 뜻이다.** 서버가 발생이 0인
 * 직원도 목록에 넣어 주는 이유가 그것이다 — 빠진 사람이 목록에서 사라지면 누락을
 * 발견할 방법이 없다.
 *
 * 잔여는 `remaining` 이다. 결재 대기중인 신청까지 뺀 값이고, 화면이 쓰는 값으로
 * 확정돼 있다 (`docs/API_연차.md` 「잔여는 어느 값인가」, 2026-08-31).
 */
export interface LeaveLedgerRow {
  employeeId: number;
  employeeNo: string | null;
  employeeName: string | null;
  /** 법인 */
  corporation: string | null;
  departmentName: string | null;
  fiscalYear: number;
  /** 발생 총 일수. 소수로 온다 (0.5 · 0.25) */
  granted: number;
  used: number;
  /** 결재 대기중인 신청 */
  pending: number;
  remaining: number;
  /** 발생을 아직 넣지 않은 직원 */
  noGrant: boolean;
}

export const leaveKeys = {
  all: ['leave'] as const,
  ledger: (year: number) => [...leaveKeys.all, 'ledger', year] as const,
  calendar: (from: string, to: string) => [...leaveKeys.all, 'calendar', from, to] as const,
};

/**
 * 그 해의 연차관리대장. **전 직원이 한 번에 온다** — 페이지네이션이 없다
 * (확인일 기준 38명, `docs/API_연차.md` 1장). 인원이 늘면 서버에 페이지를 요청한다.
 */
export function useLeaveLedger(year: number) {
  return useQuery({
    queryKey: leaveKeys.ledger(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LeaveLedgerRow[]>('/leave/ledger', {
        params: { year },
        signal,
      });
      return data;
    },
  });
}

/**
 * 고를 수 있는 연도 — **올해와 지난 두 해.**
 *
 * 서버가 연도 목록을 주지 않는다. 공휴일과 같은 사정인데 범위가 반대다 — 대장은
 * 지나간 해를 다시 들춰보는 장부라 내년이 아니라 지난 해가 필요하다.
 *
 * **더 옛 해가 필요해지면 서버에 연도 목록을 요청한다.** 화면에서 범위를 넓혀 잡지 않는다.
 */
export function selectableLedgerYears(): number[] {
  const thisYear = currentYear();
  return [thisYear, thisYear - 1, thisYear - 2];
}

/**
 * 달력 한 칸에 들어가는 한 건 (A-301).
 *
 * **표시명은 `typeName`이다.** 코드로 이름을 만들지 않는다 — 종류가 늘거나 이름이
 * 바뀌면 서버만 고치면 된다 (`docs/API_신청결재.md` 5장).
 *
 * `days`는 서버가 계산한 차감 일수다. 반차면 `0.5`로 온다. **화면에서 세지 않는다.**
 */
export interface CalendarEntry {
  /** `yyyy-MM-dd` */
  date: string;
  employeeId: number;
  employeeName: string | null;
  typeCode: string;
  /** 화면에 그대로 쓴다 */
  typeName: string | null;
  days: number;
  /** 신청서로 이어진다 */
  requestId: number;
}

/**
 * 전 직원 연차 달력. `from`·`to`가 **둘 다 필수**다 — 기본값이 없다.
 *
 * 화면이 보고 있는 범위를 그대로 넣는다. 달력 격자는 앞뒤 달 날짜까지 덮으므로
 * 그 달의 1일~말일이 아니라 **격자의 처음과 끝**을 넘긴다. 그러지 않으면 첫 줄과
 * 마지막 줄에 걸친 날이 비어 보인다.
 *
 * **`apps/mobile`에 넣지 않는다.** 본인용 화면은 `/leave/calendar`로 자기 것만 본다
 * (`docs/API_연차.md` 6장).
 */
export function useLeaveCalendarAll(from: string, to: string) {
  return useQuery({
    queryKey: leaveKeys.calendar(from, to),
    enabled: from !== '' && to !== '',
    queryFn: async ({ signal }) => {
      const { data } = await api.get<CalendarEntry[]>('/leave/calendar/all', {
        params: { from, to },
        signal,
      });
      return data;
    },
  });
}
/**
 * 연차 발생 종류. **다섯 개의 뜻은 2026-09-02 서버 회신으로 확정됐다** —
 * 이름만 보고 짝지어 쓰지 않는다 (`docs/01_물어볼_것.md` 5번, `docs/API_연차.md` 5장).
 */
export type GrantType = 'MONTHLY' | 'REGULAR' | 'SENIORITY' | 'NEW_HIRE' | 'CARRY_DEDUCT';

/**
 * 고르는 칸에 그대로 쓰는 설명.
 *
 * **일수를 화면이 계산하지 않는다.** 괄호 안의 숫자는 관리팀이 무엇을 넣는 자리인지
 * 알아보라고 적은 것이지 앱이 그 값을 채우지 않는다 (`CLAUDE.md` 3장).
 */
export const GRANT_TYPES: { value: GrantType; label: string; hint: string }[] = [
  { value: 'MONTHLY', label: '월 단위 발생', hint: '1년 미만. 개근한 달마다 1일 (최대 11일)' },
  { value: 'REGULAR', label: '연 단위 발생', hint: '1년차부터 15일' },
  { value: 'SENIORITY', label: '근속 가산', hint: '3년차부터 2년마다 1일 (최대 25일)' },
  { value: 'NEW_HIRE', label: '신입휴가', hint: '규칙 밖에서 관리팀이 산정해 넣는 값' },
  {
    value: 'CARRY_DEDUCT',
    label: '과거 초과사용분',
    hint: '엑셀에서 넘어온 것 전용. 값이 음수다 — 평상시 쓰지 않는다',
  },
];

export function grantTypeLabel(type: GrantType): string {
  return GRANT_TYPES.find((each) => each.value === type)?.label ?? type;
}

/** 발생 한 건 (`LeaveGrantResponse`) */
export interface LeaveGrant {
  id: number;
  employeeId: number;
  employeeName: string | null;
  fiscalYear: number;
  grantType: GrantType;
  grantedDays: number;
  /** 생긴 날. 비어 있을 수 있다 */
  grantedOn: string | null;
  /** 사라지는 날. **비우고 넣으면 서버가 그해 12월 31일로 잡는다** — 이월이 없다 */
  expiresOn: string | null;
  note: string | null;
  createdByName: string | null;
}

export interface LeaveGrantInput {
  employeeId: number;
  fiscalYear: number;
  grantType: GrantType;
  grantedDays: number;
  grantedOn?: string;
  expiresOn?: string;
  note?: string;
}

/** 그 직원의 잔여 (`GET /leave/balance/{employeeId}`) */
export interface EmployeeLeaveBalance {
  employeeId: number;
  employeeName: string | null;
  fiscalYear: number;
  granted: number;
  used: number;
  pending: number;
  remaining: number;
}

export const grantKeys = {
  all: ['leave-grants'] as const,
  ofEmployee: (employeeId: number, year: number) =>
    [...grantKeys.all, employeeId, year] as const,
  balance: (employeeId: number, year: number) =>
    ['leave', 'balance', employeeId, year] as const,
};

/**
 * 그 직원 그 해의 발생 내역.
 *
 * **`employeeId` 가 필수다** — 전 직원을 한 번에 보는 경로가 아니다. 그래서 이 화면은
 * 대장(A-303)에서 한 사람을 눌러 들어온다.
 */
export function useLeaveGrants(employeeId: number, year: number) {
  return useQuery({
    queryKey: grantKeys.ofEmployee(employeeId, year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LeaveGrant[]>('/leave/grants', {
        params: { employeeId, year },
        signal,
      });
      return data;
    },
  });
}

/**
 * 그 직원의 잔여. **화면이 다시 세지 않는다** — 서버가 준 값을 그대로 적는다.
 *
 * 발생 표만 봐서는 지금 잔여가 얼마인지 알 수 없다. 사용·결재대기가 빠져 있어서다.
 */
export function useEmployeeLeaveBalance(employeeId: number, year: number) {
  return useQuery({
    queryKey: grantKeys.balance(employeeId, year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<EmployeeLeaveBalance>(`/leave/balance/${employeeId}`, {
        params: { year },
        signal,
      });
      return data;
    },
  });
}

/**
 * 발생 등록.
 *
 * **서버는 계산하지 않고 보관·표시만 한다** (`LeaveGrantCreateRequest` 설명).
 * 관리팀이 산정한 값을 그대로 넣는 자리다.
 *
 * `expiresOn` 을 비우면 서버가 **그해 12월 31일**로 잡는다. 이월이 없어서다 —
 * 화면에서 날짜를 만들어 채우지 않는다.
 *
 * 대장(`leaveKeys`)도 같이 무효화한다. 한 사람에게 넣으면 그 해 대장의 「연차 미입력」
 * 수가 바뀐다.
 */
export function useCreateLeaveGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LeaveGrantInput) => {
      const { data } = await api.post<LeaveGrant>('/leave/grants', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grantKeys.all });
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

/**
 * 발생 삭제. **잘못 넣은 건을 지우는 용도다.**
 *
 * **이미 쓴 연차가 있으면 서버가 막는다** — 지웠을 때 잔여가 음수가 되기 때문이다.
 * 화면에서 미리 판정하지 않는다. 막힌 이유는 서버 문구로 나온다.
 *
 * 서버 문서에 **자동 부여된 건을 지우면 다음 배치가 되살린다**는 경고가 있다
 * (멱등 키가 행과 함께 사라진다). 지금은 스케줄러가 꺼져 있어(`docs/01_물어볼_것.md`
 * 23번) 그런 행이 없고, 응답에 `accrualKey` 가 없어 **화면이 구분할 방법도 없다.**
 * 자동 부여를 켤 때 다시 봐야 한다.
 */
export function useDeleteLeaveGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/leave/grants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grantKeys.all });
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}
