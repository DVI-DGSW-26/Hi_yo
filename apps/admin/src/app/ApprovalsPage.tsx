import { useState } from 'react';
import { useNavigate } from 'react-router';
import { formatLeaveDays } from '@hr/format';
import { Pager, StatusText, Summary, Table, type Column } from '@/components';
import { periodText, statusText, statusTone } from '@/features/approvals/labels';
import { usePendingRequests, type LeaveRequest } from '@/features/approvals/api';

/**
 * A-302 연차 신청 검토 · 승인 — 대기 목록
 *
 * 이 화면이 전달할 단 하나의 메시지 — **지금 몇 건이 내 결재를 기다리고 있는가.**
 *
 * **여기서 바로 결재하지 않는다.** 결재는 2단계(검토 → 승인)이고 단계마다 서명이 필요하다.
 * 줄을 눌러 상세로 들어가야 버튼이 나온다 — 목록에서 바로 누르게 만들면 내용을 안 보고
 * 도장을 찍게 된다.
 *
 * **상태 칸을 반드시 둔다.** `검토 대기`와 `승인 대기`가 한 목록에 섞여 오고, 둘은 눌러야
 * 할 사람이 다르다 — 색이 같아 구분이 없으면 열어봐야만 알 수 있다.
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
    {
      key: 'status',
      header: '상태',
      render: (row) => <StatusText label={statusText(row.status)} tone={statusTone(row.status)} />,
    },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">연차 결재</h1>
          <p className="page-lead">
            결재는 검토하고 승인하는 두 단계예요. 줄을 눌러 신청서를 열면 지금 할 수 있는 게
            나와요.
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
