import { useState } from 'react';
import { useNavigate } from 'react-router';
import { formatAmount } from '@hr/format';
import { StatusText, Table, type Column } from '@/components';
import { PeriodToolbar } from '@/features/payroll/PeriodToolbar';
import { SkippedNotice } from '@/features/payroll/SkippedNotice';
import { useLedger, usePeriods, type CalculateResult, type Payroll } from '@/features/payroll/api';

/**
 * A-601 급여 계산 실행·수정 — 급여대장
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 달 급여가 지금 어디까지 왔는가.**
 *
 * 금액은 서버가 계산한 값을 표시만 한다. `totalPayment - totalDeduction`을 화면에서
 * 계산하지 않는다. 실지급액은 `finalAmount`다.
 */
export function PayrollPage() {
  const navigate = useNavigate();
  const periods = usePeriods();
  const [periodId, setPeriodId] = useState<number>();
  const [calcResult, setCalcResult] = useState<CalculateResult>();

  const selected = periods.data?.find((period) => period.id === periodId);
  const ledger = useLedger(periodId);

  const columns: Column<Payroll>[] = [
    {
      key: 'employee',
      header: '직원',
      sticky: true,
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'employeeNo', header: '사번', render: (row) => row.employeeNo ?? '—' },
    { key: 'department', header: '부서', render: (row) => row.departmentName ?? '—' },
    { key: 'corporation', header: '법인', render: (row) => row.corporation ?? '—' },
    {
      key: 'totalPayment',
      header: '지급총액',
      align: 'right',
      render: (row) => formatAmount(row.totalPayment),
    },
    {
      key: 'totalDeduction',
      header: '공제총액',
      align: 'right',
      render: (row) => formatAmount(row.totalDeduction),
    },
    {
      key: 'finalAmount',
      header: '실지급액',
      align: 'right',
      render: (row) => formatAmount(row.finalAmount),
    },
    {
      key: 'modified',
      header: '수정',
      render: (row) =>
        row.modified ? <StatusText label="수정함" /> : <span className="muted">—</span>,
    },
    {
      key: 'confirmed',
      header: '상태',
      render: (row) =>
        row.confirmed ? (
          <StatusText label="확정" tone="done" />
        ) : (
          <StatusText label="확정 전" />
        ),
    },
  ];

  return (
    <section>
      <h1 className="page-title">급여</h1>

      {periods.error ? (
        <p className="danger">{periods.error.message}</p>
      ) : (
        <PeriodToolbar
          periods={periods.data ?? []}
          selected={selected}
          onSelect={(id) => {
            setPeriodId(id);
            setCalcResult(undefined);
          }}
          onCalculated={setCalcResult}
        />
      )}

      {calcResult && <SkippedNotice result={calcResult} />}

      {periodId === undefined ? (
        <p className="muted">기간을 고르면 급여대장이 보여요.</p>
      ) : (
        <Table
          columns={columns}
          rows={ledger.data}
          keyOf={(row) => row.id}
          isPending={ledger.isPending}
          error={ledger.error}
          emptyText="아직 계산한 급여가 없어요. 계산을 실행해주세요."
          onRowClick={(row) => navigate(`/payroll/${row.id}`)}
        />
      )}
    </section>
  );
}
