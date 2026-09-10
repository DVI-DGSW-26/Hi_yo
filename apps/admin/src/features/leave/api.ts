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

/**
 * 연차촉진 (A-305. Swagger `6. 연차`, 2026-09-02에 열렸다).
 * 조건은 회사 서식 두 장에서 확정됐다 — `docs/API_연차.md` 10장.
 *
 * **이 API 는 메일을 보내지 않는다.** 스펙이 직접 그렇게 적고 있다 — 관리팀이 서면이나
 * 메일로 보낸 뒤 **보냈다는 사실을 남기는** 것이 전부다. 알림 발송 경로는 아직 없다.
 * 화면이 「보내기」라고 적으면 관리팀이 누르고 나서 보낸 줄 안다.
 *
 * **날짜·잔여를 화면이 만들지 않는다.** 마감(통보 + 10일)도 통보서에 찍히는 잔여도
 * 서버가 계산해 박는다 (`CLAUDE.md` 3장). 요청에 잔여를 싣는 자리 자체가 없다.
 */
export type PromotionRound = 'FIRST' | 'SECOND';

/** 앱 푸시는 근로기준법 제61조의 통지 수단이 아니라 값이 없다 (스펙 설명) */
export type PromotionChannel = 'EMAIL' | 'WRITTEN';

/**
 * 촉진 대상자 한 명.
 *
 * **여기 잔여는 「목록을 연 순간」 값이다.** 통보 기록에 남는 잔여는 서버가 발송 시점에
 * 다시 계산해 박은 스냅샷이라 두 값이 갈릴 수 있다 (스펙 설명). 화면에서 같은 값으로
 * 다루지 않는다 — 목록의 숫자를 통보서 숫자라고 적으면 문의가 온다.
 */
export interface PromotionTarget {
  employeeId: number;
  employeeNo: string | null;
  employeeName: string | null;
  departmentName: string | null;
  /** 통보 발송처. **비어 있으면 `EMAIL` 로 기록할 수 없다** — 서면으로 교부하고 남긴다 */
  email: string | null;
  fiscalYear: number;
  round: PromotionRound;
  /** 결재 대기중까지 뺀 잔여. **통보에 쓰는 값**이다 */
  remainingDays: number;
  /** 승인분만 뺀 잔여. 대기중 신청이 반려되면 이쪽으로 돌아온다 */
  confirmedRemainingDays: number;
  /** 기록이 없는 사람만 목록에 담기므로 항상 `false` 다 */
  alreadyNotified: boolean;
  /** 오늘 보내면 계획서 마감이 언제가 되는지 (오늘 + 10일) */
  planDueOnIfSentToday: string | null;
}

/**
 * 남길 통보 기록.
 *
 * **`bodySnapshot` 은 보낸 본문 원문이다. 요약이 아니다.** 미사용 연차 소멸의 법적
 * 근거라 이것이 없으면 나중에 연차수당을 지급해야 할 수 있다고 스펙이 적고 있다.
 * 그래서 서버가 필수로 받는다 — 화면도 붙여넣을 자리를 제대로 준다.
 */
export interface PromotionNoticeInput {
  employeeId: number;
  fiscalYear: number;
  round: PromotionRound;
  channel: PromotionChannel;
  /** `EMAIL` 이면 필수다 — 「어디로 보냈는지」가 없으면 증빙이 되지 않는다 */
  sentTo?: string;
  /** 실제로 보낸 시각. 비우면 서버가 지금으로 잡는다. **미래 시각은 거부한다** */
  sentAt?: string;
  bodySnapshot: string;
}

/** 기록된 통보. `bodySnapshot` 은 응답에 담기지 않는다 (본문이 길어서다) */
export interface PromotionNotice {
  id: number;
  employeeId: number;
  employeeName: string | null;
  fiscalYear: number;
  round: PromotionRound;
  /** 통보 시점 잔여 **스냅샷**. 통보서에 찍힌 숫자는 이쪽이다 */
  remainingDays: number;
  channel: PromotionChannel;
  sentAt: string | null;
  sentTo: string | null;
  /** 계획서 제출 마감 = 통보일 + 10일. 넘겨서 내도 막지 않고 `late` 로 표시만 한다 */
  planDueOn: string | null;
  planSubmitted: boolean;
  createdByName: string | null;
}

/**
 * 차수. **서버가 쓰는 말을 그대로 쓴다** — `FIRST`(1차 촉구, 7월 1일 기준) ·
 * `SECOND`(2차 통보, 11월 1일 기준). 시점은 서식에서 확정된 값이다
 * (소멸 6개월 전 · 2개월 전, `docs/API_연차.md` 10장).
 */
export const PROMOTION_ROUNDS: { value: PromotionRound; label: string; hint: string }[] = [
  { value: 'FIRST', label: '1차 촉구', hint: '소멸 6개월 전' },
  { value: 'SECOND', label: '2차 통보', hint: '소멸 2개월 전' },
];

export const PROMOTION_CHANNELS: { value: PromotionChannel; label: string }[] = [
  { value: 'EMAIL', label: '이메일' },
  { value: 'WRITTEN', label: '서면' },
];

export function promotionRoundLabel(round: PromotionRound): string {
  return PROMOTION_ROUNDS.find((each) => each.value === round)?.label ?? round;
}

export function promotionChannelLabel(channel: PromotionChannel): string {
  return PROMOTION_CHANNELS.find((each) => each.value === channel)?.label ?? channel;
}

/** 서버가 받는 한계 (`LeavePromotionNoticeRequest`) */
export const SENT_TO_MAX = 255;

export const promotionKeys = {
  all: ['leave-promotions'] as const,
  targets: (year: number, round: PromotionRound) =>
    [...promotionKeys.all, 'targets', year, round] as const,
  notices: (year: number) => [...promotionKeys.all, 'notices', year] as const,
  plans: (year: number) => [...promotionKeys.all, 'plans', year] as const,
};

/**
 * 그 해 그 차수의 촉진 대상자.
 *
 * **이미 기록이 있는 사람은 목록에 담기지 않는다.** 그래서 이 목록은 「아직 안 보낸
 * 사람」이고, 기록하면 그 줄이 사라지는 것이 정상이다.
 *
 * `round` 는 서버가 필수로 받는다 — 비우고 부르지 않는다.
 */
export function usePromotionTargets(year: number, round: PromotionRound) {
  return useQuery({
    queryKey: promotionKeys.targets(year, round),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<PromotionTarget[]>('/leave/promotions/targets', {
        params: { year, round },
        signal,
      });
      return data;
    },
  });
}

/**
 * 제출된 연차사용계획서 하루치. **값은 `1`(연차) 또는 `0.5`(반차)뿐이다**
 */
export interface PlannedDay {
  date: string;
  days: number;
}

/**
 * 제출된 연차사용계획서. `GET /leave/promotions/plans` (2026-09-09에 열렸다)
 *
 * 그전에는 `planSubmitted` 불리언으로 **냈는지만** 알 수 있었다. 무슨 날짜를 냈는지는
 * 아무도 볼 수 없었다 — 직원 본인도, 관리팀도.
 *
 * **`plannedDays`는 차감된 일수가 아니다.** 계획서는 연차를 깎지 않는다 — 실제 차감은
 * 신청(`POST /requests`)이 결재를 받아야 일어난다. 화면이 「쓴 연차」로 적으면 안 된다.
 *
 * **`remainingAfterPlan`은 조회에서 `null`이다** (2026-09-09 안내). 제출 시점 값이라
 * 지금은 틀린 숫자다 — 그래서 이 화면은 그 값을 쓰지 않는다.
 */
export interface PromotionPlan {
  id: number;
  promotionId: number;
  employeeId: number;
  employeeName: string | null;
  fiscalYear: number;
  round: PromotionRound;
  submittedAt: string | null;
  planDueOn: string | null;
  /** 마감(통보 + 10일)을 넘겨 낸 건. 서버가 막지 않고 표시만 한다 */
  late: boolean;
  plannedDays: number;
  remainingAfterPlan: number | null;
  signed: boolean;
  days: PlannedDay[];
  note: string | null;
  /** 화면에 그대로 띄워도 되는 한국어 안내 */
  notice: string | null;
}

/**
 * 그 해에 제출된 계획서. **차수를 싣지 않고 부른다** — 1차·2차를 다 받는다.
 *
 * 통보 기록(`usePromotionNotices`)과 짝이다. 그쪽은 「누구에게 보냈나」이고
 * 이쪽은 「누가 무슨 날짜를 냈나」다.
 */
export function usePromotionPlans(year: number) {
  return useQuery({
    queryKey: promotionKeys.plans(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<PromotionPlan[]>('/leave/promotions/plans', {
        params: { year },
        signal,
      });
      return data;
    },
  });
}

/**
 * 그 해에 남긴 통보 기록. `GET /leave/promotions` (2026-09-09에 열렸다)
 *
 * **차수를 싣지 않고 부른다 — 그 해 1차·2차를 다 받는다.** 2차 대상인지가 1차 계획서를
 * 냈는지(`planSubmitted`)로 갈린다고 스펙이 적고 있어서, 2차를 준비하는 사람이 1차
 * 기록을 같이 봐야 한다.
 *
 * 이것이 열리기 전에는 남긴 기록을 **아무 데서도 볼 수 없었다.** 대상 목록
 * (`/targets`)이 기록이 없는 사람만 주므로, 기록하면 그 줄이 사라질 뿐이었다.
 */
export function usePromotionNotices(year: number) {
  return useQuery({
    queryKey: promotionKeys.notices(year),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<PromotionNotice[]>('/leave/promotions', {
        params: { year },
        signal,
      });
      return data;
    },
  });
}

/**
 * 통보를 보냈다는 기록을 남긴다.
 *
 * **되돌리는 경로가 없다.** 지우는 API 가 없다 — 확인 대화상자에서 그 사실을 적는다.
 * 남긴 것을 다시 보는 것은 `usePromotionNotices` 로 된다 (2026-09-09).
 */
export function useRecordPromotionNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PromotionNoticeInput) => {
      const { data } = await api.post<PromotionNotice>('/leave/promotions', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}
