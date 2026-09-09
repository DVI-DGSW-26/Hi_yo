import { StatusText, Table, type Column } from '@/components';
import { daysCell, dim, orDash } from '@/lib/cell';
import { formatKstDateTime, shortDate } from '@/lib/datetime';
import { promotionRoundLabel, usePromotionPlans, type PromotionPlan } from './api';

/**
 * 그 해에 제출된 연차사용계획서.
 *
 * **2026-09-09에 `GET /leave/promotions/plans` 가 열려서 만든 표다.** 그전에는
 * `planSubmitted` 불리언으로 **냈는지만** 알 수 있었고 **무슨 날짜를 냈는지는 아무도
 * 볼 수 없었다** — 직원 본인도, 관리팀도.
 *
 * **위의 통보 기록 표와 짝이다.** 그쪽은 「누구에게 보냈나」, 이쪽은 「누가 무슨 날짜를
 * 냈나」다. 2차 대상 판정이 1차 계획서 제출 여부로 갈리므로 차수를 거르지 않는다.
 *
 * **「사용계획일수」를 「쓴 연차」로 적지 않는다.** 계획서는 연차를 깎지 않는다 — 실제
 * 차감은 그날 휴가를 따로 신청해 결재를 받아야 일어난다. 열 이름을 서식 그대로 둔다.
 *
 * `remainingAfterPlan` 은 쓰지 않는다. 조회에서는 `null` 이고, 제출 시점 값이라 지금은
 * 틀린 숫자라고 서버가 적어 뒀다.
 */
export function SubmittedPlanTable({ year }: { year: number }) {
  const plans = usePromotionPlans(year);

  const columns: Column<PromotionPlan>[] = [
    {
      key: 'employee',
      header: '이름',
      sticky: true,
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'round', header: '차수', render: (row) => promotionRoundLabel(row.round) },
    {
      key: 'submittedAt',
      header: '제출 시각',
      render: (row) => (row.submittedAt === null ? orDash(null) : formatKstDateTime(row.submittedAt)),
    },
    {
      key: 'planDueOn',
      header: '마감',
      render: (row) => (row.planDueOn === null ? orDash(null) : shortDate(row.planDueOn)),
    },
    {
      key: 'late',
      header: '기한',
      /*
       * 늦게 낸 것을 **빨갛게 두지 않는다.** 서버가 막지 않고 표시만 하는 값이고
       * (`late`), 늦게라도 낸 것은 안 낸 것보다 나은 상태다 (`DESIGN_RULES.md` 2장).
       */
      render: (row) => (row.late ? <StatusText label="늦게 냈어요" /> : dim('기한 안에')),
    },
    {
      key: 'plannedDays',
      header: '사용계획일수',
      align: 'right',
      render: (row) => daysCell(row.plannedDays),
    },
    {
      key: 'days',
      header: '적어 낸 날',
      /*
       * 날짜를 통째로 적는다. **이 표의 값어치가 여기다** — 이것 때문에 경로를 요청했다.
       * 반차는 서식 표기(`0.5`)를 그대로 붙인다.
       */
      render: (row) =>
        row.days.length === 0 ? orDash(null) : row.days.map(dayText).join(' · '),
    },
    {
      key: 'signed',
      header: '서명',
      // 서버가 필수로 받으므로 빈 건이 없어야 한다. 없으면 그것이 드러나야 한다.
      render: (row) => (row.signed ? '있어요' : <StatusText label="없어요" />),
    },
    { key: 'note', header: '비고', render: (row) => orDash(row.note) },
  ];

  return (
    <Table
      columns={columns}
      rows={plans.data}
      keyOf={(row) => row.id}
      isPending={plans.isPending}
      error={plans.error}
      emptyText={`${year}년에 제출된 계획서가 없어요.`}
    />
  );
}

/** `9.10` · 반차면 `9.10(반)`. 서식이 연차 1 · 반차 0.5 로 적는다 */
function dayText(day: { date: string; days: number }): string {
  const date = shortDate(day.date);
  return day.days === 1 ? date : `${date}(반)`;
}
