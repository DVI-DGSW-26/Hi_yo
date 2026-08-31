import { useState } from 'react';
import { useNavigate } from 'react-router';
import { formatLeaveDays } from '@hr/format';
import { Pager, Summary, Table, type Column } from '@/components';
import { periodText } from '@/features/approvals/labels';
import { usePendingRequests, type LeaveRequest } from '@/features/approvals/api';

/**
 * A-302 연차 신청 검토 · 승인 — 대기 목록
 *
 * 이 화면이 전달할 단 하나의 메시지 — **지금 몇 건이 내 결재를 기다리고 있는가.**
 *
 * **여기서 바로 승인하지 않는다.** 요구사항의 "검토"는 `GET /requests/{id}`로 내용을
 * 읽어보는 것이고, 그것 없이 결정하면 서버가 422로 막는다고 적혀 있다
 * (`docs/API_신청결재.md` 7장 2번). 줄을 눌러 상세로 들어가야 결재 버튼이 나온다.
 *
 * 차감 일수는 서버가 준 `leaveDays`를 그대로 쓴다. 주말·공휴일을 앱에서 빼지 않는다.
 */
const PAGE_SIZE = 20;

export function ApprovalsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const pending = usePendingRequests(page, PAGE_SIZE);

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: '신청인',
      sticky: true,
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'department', header: '부서', render: (row) => row.departmentName ?? '—' },
    // 표시명은 서버가 준다. 코드로 이름을 만들지 않는다.
    { key: 'type', header: '종류', render: (row) => row.typeName ?? row.typeCode },
    { key: 'period', header: '기간', render: (row) => periodText(row) },
    {
      key: 'days',
      header: '차감',
      align: 'right',
      render: (row) => formatLeaveDays(row.leaveDays),
    },
    { key: 'reason', header: '사유', render: (row) => row.reason ?? '—' },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">연차 결재</h1>
          <p className="page-lead">
            줄을 눌러 신청서를 열면 승인·반려할 수 있어요. 내용을 열어보는 것이 검토예요.
          </p>
        </div>
      </div>

      {/* 이 화면의 목적이 "몇 건이 기다리는가"라 표 위에 둔다 */}
      {pending.data && (
        <Summary items={[{ label: '결재 대기', value: `${pending.data.totalElements}건` }]} />
      )}

      <Table
        columns={columns}
        rows={pending.data?.content}
        keyOf={(row) => row.id}
        isPending={pending.isPending}
        error={pending.error}
        emptyText="결재를 기다리는 신청이 없어요."
        onRowClick={(row) => navigate(`/approvals/${row.id}`)}
      />

      <Pager page={pending.data} onChange={setPage} unit="건" />
    </section>
  );
}
