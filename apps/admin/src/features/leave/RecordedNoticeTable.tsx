import { Table, type Column } from '@/components';
import { daysCell, dim, orDash } from '@/lib/cell';
import { formatKstDateTime, shortDate } from '@/lib/datetime';
import {
  promotionChannelLabel,
  promotionRoundLabel,
  usePromotionNotices,
  type PromotionNotice,
} from './api';

/**
 * 그 해에 남긴 통보 기록.
 *
 * **2026-09-09에 `GET /leave/promotions` 가 열려서 만든 표다** (29번). 그전에는 남긴 것을
 * 아무 데서도 볼 수 없었다 — 대상 목록이 기록 없는 사람만 주므로 기록하면 그 줄이 사라질
 * 뿐이었고, 화면이 그 세션에 남긴 것만 들고 있었다.
 *
 * **차수를 거르지 않는다. 그 해 1차·2차를 다 보여준다.** 2차 대상인지가 1차 계획서를
 * 냈는지로 갈린다고 스펙이 적고 있어서, 2차를 준비하는 사람이 1차 기록을 같이 봐야 한다.
 * 위의 대상 표는 차수로 걸러지지만 이 표는 그러지 않는 이유다.
 *
 * **잔여는 통보 시점 스냅샷이다.** 대상 표의 잔여는 목록을 연 순간의 값이라 두 값이
 * 다를 수 있다 — 증빙이 되는 쪽은 이쪽이다.
 */
export function RecordedNoticeTable({ year }: { year: number }) {
  const notices = usePromotionNotices(year);

  const columns: Column<PromotionNotice>[] = [
    {
      key: 'employee',
      header: '이름',
      sticky: true,
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'round', header: '차수', render: (row) => promotionRoundLabel(row.round) },
    { key: 'channel', header: '방법', render: (row) => promotionChannelLabel(row.channel) },
    { key: 'sentTo', header: '통보처', render: (row) => orDash(row.sentTo) },
    {
      key: 'sentAt',
      header: '보낸 시각',
      render: (row) => (row.sentAt === null ? orDash(null) : formatKstDateTime(row.sentAt)),
    },
    {
      key: 'remaining',
      header: '통보 당시 잔여',
      align: 'right',
      render: (row) => daysCell(row.remainingDays),
    },
    {
      key: 'planDue',
      header: '계획서 마감',
      render: (row) => (row.planDueOn === null ? orDash(null) : shortDate(row.planDueOn)),
    },
    {
      key: 'planSubmitted',
      header: '계획서',
      /*
       * **2차 대상 판정이 이 값으로 갈린다** (스펙). 그래서 이 표에서 가장 중요한 칸이다.
       *
       * 안 낸 것을 빨갛게 두지 않는다 — 마감 전이면 아직 안 한 일이지 잘못된 상태가
       * 아니다 (`DESIGN_RULES.md` 2장). 마감을 넘겼는지는 관리팀이 옆 칸을 보고 읽는다.
       */
      render: (row) => (row.planSubmitted ? '냈어요' : dim('아직이에요')),
    },
    { key: 'createdBy', header: '기록한 사람', render: (row) => orDash(row.createdByName) },
  ];

  return (
    <Table
      columns={columns}
      rows={notices.data}
      keyOf={(row) => row.id}
      isPending={notices.isPending}
      error={notices.error}
      emptyText={`${year}년에 남긴 통보 기록이 없어요.`}
    />
  );
}
