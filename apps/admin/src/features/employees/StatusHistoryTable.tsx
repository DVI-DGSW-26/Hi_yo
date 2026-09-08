import { StatusText, Table, type Column } from '@/components';
import { useStatusHistory, type StatusHistory } from './api';
import { STATUS_LABEL } from './labels';

/**
 * 재직상태 이력. 휴직·복직·퇴사가 언제부터 언제까지였는지.
 *
 * `EmployeeDetail` 에서 옮겨 왔다 (2026-09-07). 조회도 여기서 한다 — 이 표 말고
 * 이 값을 쓰는 곳이 없다.
 *
 * **퇴사를 빨갛게 두지 않는다.** 오류가 아니라 끝난 사실이다 (`DESIGN_ADMIN.md` 2장).
 */
export function StatusHistoryTable({ employeeId }: { employeeId: number }) {
  const history = useStatusHistory(employeeId);

  const columns: Column<StatusHistory>[] = [
    {
      key: 'status',
      header: '상태',
      sticky: true,
      render: (row) => <StatusText label={row.statusLabel ?? STATUS_LABEL[row.status]} />,
    },
    { key: 'start', header: '시작일', render: (row) => row.startDate },
    { key: 'end', header: '종료일', render: (row) => row.endDate ?? '진행 중' },
    { key: 'reason', header: '사유', render: (row) => row.reason ?? '—' },
  ];

  return (
    <Table
      columns={columns}
      rows={history.data}
      keyOf={(row) => row.id}
      isPending={history.isPending}
      error={history.error}
      emptyText="이력이 없어요."
    />
  );
}
