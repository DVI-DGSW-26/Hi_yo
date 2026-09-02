import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatAmount, formatMinutes, formatTargetYm } from '@hr/format';
import {
  Button,
  DetailList,
  Dialog,
  Field,
  Select,
  StatusText,
  Table,
  type Column,
} from '@/components';
import {
  ITEM_CODES,
  useAdjust,
  useAdjustments,
  useConfirmPayroll,
  usePayroll,
  usePeriods,
  type Adjustment,
  type PayrollItem,
} from '@/features/payroll/api';
import './PayrollDetail.css';

/**
 * 급여 한 건. 이 화면이 전달할 단 하나의 메시지 — **이 금액이 왜 이 금액인가.**
 *
 * `items`를 순서대로 그리면 그대로 명세서가 된다. 항목이 늘어도 화면 코드를 고치지 않는다.
 * 지급/공제 구분은 서버 `kind`가 준다. 코드로 나누지 않는다.
 */
export function PayrollDetail() {
  const { payrollId: raw } = useParams<{ payrollId: string }>();
  const payrollId = raw ? Number(raw) : undefined;

  const payroll = usePayroll(payrollId);
  const adjustments = useAdjustments(payrollId);
  const periods = usePeriods();
  const confirm = useConfirmPayroll();
  const [adjusting, setAdjusting] = useState(false);

  const period = periods.data?.find((p) => p.targetYm === payroll.data?.targetYm);
  const closedReason = period?.closed
    ? '마감된 기간이에요. 마감을 해제해야 금액을 고칠 수 있어요.'
    : undefined;

  if (payroll.isPending) return <p className="muted">불러오는 중이에요.</p>;
  if (payroll.error) return <p className="danger">{payroll.error.message}</p>;

  const data = payroll.data;

  const itemColumns: Column<PayrollItem>[] = [
    {
      key: 'kind',
      header: '구분',
      sticky: true,
      render: (item) => (item.kind === 'PAYMENT' ? '지급' : '공제'),
    },
    { key: 'name', header: '항목', render: (item) => item.name },
    {
      key: 'minutes',
      header: '시간',
      align: 'right',
      render: (item) => (item.minutes == null ? '—' : formatMinutes(item.minutes)),
    },
    {
      key: 'rate',
      header: '배율',
      align: 'right',
      render: (item) => (item.rate == null ? '—' : String(item.rate)),
    },
    { key: 'amount', header: '금액', align: 'right', render: (item) => formatAmount(item.amount) },
    { key: 'basis', header: '산출 근거', render: (item) => item.basis ?? '—' },
  ];

  const historyColumns: Column<Adjustment>[] = [
    { key: 'item', header: '항목', sticky: true, render: (row) => row.itemName ?? row.itemCode },
    {
      key: 'before',
      header: '원래 금액',
      align: 'right',
      render: (row) => formatAmount(row.beforeAmount),
    },
    {
      key: 'after',
      header: '고친 금액',
      align: 'right',
      render: (row) => formatAmount(row.afterAmount),
    },
    { key: 'reason', header: '사유', render: (row) => row.reason },
    { key: 'by', header: '수정자', render: (row) => row.modifiedByName ?? `직원 ${row.modifiedById}` },
    { key: 'at', header: '수정 시각', render: (row) => row.modifiedAt.replace('T', ' ').slice(0, 16) },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <Link to="/payroll" className="back-link">
            급여대장으로
          </Link>
          <h1 className="page-title">
            {data.employeeName ?? `직원 ${data.employeeId}`} · {formatTargetYm(data.targetYm)}
          </h1>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <DetailList
            items={[
              { label: '부서', value: data.departmentName ?? '아직이에요' },
              { label: '지급총액', value: formatAmount(data.totalPayment) },
              { label: '공제총액', value: formatAmount(data.totalDeduction) },
              {
                label: '실지급액',
                value: <span className="final-amount">{formatAmount(data.finalAmount)}</span>,
              },
              {
                label: '상태',
                value: data.confirmed ? (
                  <StatusText label="확정" tone="done" />
                ) : (
                  <StatusText label="확정 전" />
                ),
              },
              ...(data.modified
                ? [
                    {
                      label: '금액 수정',
                      wide: true,
                      value: `관리팀이 금액을 고쳤어요. 자동 계산 금액은 ${formatAmount(
                        data.calculatedAmount,
                      )}이었어요.${data.modifyReason ? ` 사유: ${data.modifyReason}` : ''}`,
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <div className="panel-actions">
          {confirm.error && <p className="panel-note is-error">{confirm.error.message}</p>}
          <div className="panel-buttons">
            <Button
              label="금액 고치기"
              disabledReason={closedReason}
              onClick={() => setAdjusting(true)}
            />
            <Button
              label={data.confirmed ? '확정 해제하기' : '확정하기'}
              variant={data.confirmed ? 'secondary' : 'primary'}
              loading={confirm.isPending}
              onClick={() => confirm.mutate({ payrollId: data.id, confirmed: !data.confirmed })}
            />
          </div>
        </div>
      </div>

      <h2 className="section-title">명세서</h2>
      <Table
        columns={itemColumns}
        rows={data.items}
        keyOf={(item) => item.code}
        emptyText="항목이 없어요. 계산을 실행해주세요."
      />

      <h2 className="section-title">수정 이력</h2>
      <Table
        columns={historyColumns}
        rows={adjustments.data}
        keyOf={(row) => row.id}
        isPending={adjustments.isPending}
        error={adjustments.error}
        emptyText="고친 적이 없어요."
      />

      <AdjustDialog
        open={adjusting}
        payrollId={data.id}
        knownNames={Object.fromEntries(data.items.map((item) => [item.code, item.name]))}
        onClose={() => setAdjusting(false)}
      />
    </section>
  );
}

function AdjustDialog({
  open,
  payrollId,
  knownNames,
  onClose,
}: {
  open: boolean;
  payrollId: number;
  knownNames: Record<string, string>;
  onClose: () => void;
}) {
  const adjust = useAdjust(payrollId);
  const [itemCode, setItemCode] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const missing = itemCode === '' || amount === '' || reason.trim() === '';

  return (
    <Dialog
      open={open}
      title="금액 고치기"
      description="지급 항목을 고치면 지급총액이 달라져서 4대보험이 다시 계산돼요. 사유는 금액 분쟁에 답할 수 있어야 해서 필수예요."
      confirmLabel="고치기"
      loading={adjust.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (missing) return;
        adjust.mutate(
          { itemCode, amount: Number(amount), reason: reason.trim() },
          {
            onSuccess: () => {
              setItemCode('');
              setAmount('');
              setReason('');
              onClose();
            },
          },
        );
      }}
    >
      <Select
        label="항목"
        value={itemCode}
        onChange={setItemCode}
        placeholder="항목을 골라주세요"
        options={ITEM_CODES.map((code) => ({ value: code, label: knownNames[code] ?? code }))}
      />
      <Field label="금액" value={amount} onChange={setAmount} type="number" required />
      <Field label="사유" value={reason} onChange={setReason} required maxLength={255} />
      <p className="muted">
        이 급여에 아직 없는 항목은 코드로 보여요. 이름은 서버가 정해요.
      </p>
      {adjust.error && <p className="danger">{adjust.error.message}</p>}
    </Dialog>
  );
}
