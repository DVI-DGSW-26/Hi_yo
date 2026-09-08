import { useState } from 'react';
import { Dialog, Field, Select } from '@/components';
import { useChangeStatus, type EmploymentStatus } from './api';

/**
 * A-102 — 휴직 · 복직 · 퇴사.
 *
 * `EmployeeDetail` 에서 옮겨 왔다 (2026-09-07). 대화상자가 넷이 되면서 화면 파일이
 * 300줄을 넘었다 — 네 개를 같은 자리에 둔다 (`CLAUDE.md` 8장).
 */
export function StatusDialog({
  open,
  employeeId,
  current,
  onClose,
}: {
  open: boolean;
  employeeId: number;
  current: EmploymentStatus;
  onClose: () => void;
}) {
  const change = useChangeStatus(employeeId);
  const [status, setStatus] = useState<EmploymentStatus>(current);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');

  const resigning = status === 'RESIGNED';

  return (
    <Dialog
      open={open}
      title="재직상태 바꾸기"
      description={
        resigning
          ? '퇴사 처리하면 이 계정으로 로그인할 수 없어요. 기록은 지우지 않고 이력에 남아요.'
          : '바뀐 상태는 이력에 남아요. 기록을 지우지 않아요.'
      }
      confirmLabel={resigning ? '퇴사 처리하기' : '바꾸기'}
      danger={resigning}
      loading={change.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!effectiveDate) return;
        change.mutate(
          { status, effectiveDate, ...(reason.trim() ? { reason: reason.trim() } : {}) },
          {
            onSuccess: () => {
              setReason('');
              setEffectiveDate('');
              onClose();
            },
          },
        );
      }}
    >
      <Select
        label="바꿀 상태"
        value={status}
        onChange={(value) => setStatus(value as EmploymentStatus)}
        options={[
          { value: 'ACTIVE', label: '재직' },
          { value: 'ON_LEAVE', label: '휴직' },
          { value: 'RESIGNED', label: '퇴사' },
        ]}
      />
      <Field
        label="적용일"
        value={effectiveDate}
        onChange={setEffectiveDate}
        type="date"
        required
      />
      <Field label="사유" value={reason} onChange={setReason} maxLength={255} />
      {change.error && <p className="danger">{change.error.message}</p>}
    </Dialog>
  );
}
