import { useState } from 'react';
import { formatTargetYm } from '@hr/format';
import { Button, Dialog, Field, Select, StatusText } from '@/components';
import {
  useCalculate,
  useClosePeriod,
  useCreatePeriod,
  type CalculateResult,
  type PayrollPeriod,
} from './api';
import './PeriodToolbar.css';

interface Props {
  periods: PayrollPeriod[];
  selected: PayrollPeriod | undefined;
  onSelect: (periodId: number) => void;
  onCalculated: (result: CalculateResult) => void;
}

/**
 * 급여 기간 선택과 실행 동작.
 *
 * 마감된 기간에서는 재계산이 서버에서 막혀 있다. 사용자가 고칠 수 있는 값의 문제가
 * 아니라 기간의 상태라 버튼을 비활성하고 이유를 옆에 적는다 (DESIGN_ADMIN.md 1장).
 */
export function PeriodToolbar({ periods, selected, onSelect, onCalculated }: Props) {
  const [creating, setCreating] = useState(false);
  const [closingConfirm, setClosingConfirm] = useState(false);
  const calculate = useCalculate();
  const close = useClosePeriod();

  const closedReason = selected?.closed
    ? '마감된 기간이에요. 마감을 해제해야 다시 계산할 수 있어요.'
    : undefined;

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <Select
          label="급여 기간"
          value={selected ? String(selected.id) : ''}
          onChange={(value) => onSelect(Number(value))}
          placeholder={periods.length === 0 ? '등록된 기간이 없어요' : '기간을 골라주세요'}
          options={periods.map((period) => ({
            value: String(period.id),
            label: `${formatTargetYm(period.targetYm)}${period.closed ? ' (마감)' : ''}`,
          }))}
        />

        <div className="toolbar-actions">
          <Button label="기간 등록하기" onClick={() => setCreating(true)} />

          {selected && (
            <>
              <Button
                label="계산 실행하기"
                variant="primary"
                loading={calculate.isPending}
                disabledReason={closedReason}
                onClick={() =>
                  calculate.mutate(selected.id, { onSuccess: onCalculated })
                }
              />
              {selected.closed ? (
                <Button
                  label="마감 해제하기"
                  loading={close.isPending}
                  onClick={() => close.mutate({ periodId: selected.id, closed: false })}
                />
              ) : (
                <Button
                  label="마감하기"
                  variant="danger"
                  onClick={() => setClosingConfirm(true)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {selected && (
        <p className="toolbar-meta">
          {selected.startDate} ~ {selected.endDate} 근태를 모아요.
          {selected.payDate && ` 지급일은 ${selected.payDate}이에요.`}{' '}
          {selected.closed && <StatusText label="마감" tone="done" />}
        </p>
      )}

      {(calculate.error || close.error) && (
        <p className="toolbar-error">{(calculate.error ?? close.error)?.message}</p>
      )}

      <CreatePeriodDialog open={creating} onClose={() => setCreating(false)} />

      <Dialog
        open={closingConfirm}
        title="이 기간을 마감할까요?"
        description="마감하면 다시 계산하거나 금액을 고칠 수 없어요. 명세서를 보낸 뒤 금액이 바뀌면 직원이 받은 종이와 시스템 값이 갈라져요."
        confirmLabel="마감하기"
        danger
        loading={close.isPending}
        onClose={() => setClosingConfirm(false)}
        onConfirm={() => {
          if (!selected) return;
          close.mutate(
            { periodId: selected.id, closed: true },
            { onSuccess: () => setClosingConfirm(false) },
          );
        }}
      />
    </div>
  );
}

function CreatePeriodDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreatePeriod();
  const [targetYm, setTargetYm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payDate, setPayDate] = useState('');

  function submit() {
    create.mutate(
      {
        targetYm: Number(targetYm.replace('-', '')),
        startDate,
        endDate,
        payDate: payDate || undefined,
      },
      {
        onSuccess: () => {
          setTargetYm('');
          setStartDate('');
          setEndDate('');
          setPayDate('');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      title="급여 기간 등록"
      description="시작일과 종료일이 근태를 모으는 범위예요. 급여 마감일이 달의 말일과 다르면 그 실제 범위를 넣어주세요."
      confirmLabel="등록하기"
      loading={create.isPending}
      onClose={onClose}
      onConfirm={submit}
    >
      <Field label="대상월" value={targetYm} onChange={setTargetYm} type="month" required />
      <Field label="시작일" value={startDate} onChange={setStartDate} type="date" required />
      <Field label="종료일" value={endDate} onChange={setEndDate} type="date" required />
      <Field label="지급일" value={payDate} onChange={setPayDate} type="date" />
      {create.error && <p className="toolbar-error">{create.error.message}</p>}
    </Dialog>
  );
}
