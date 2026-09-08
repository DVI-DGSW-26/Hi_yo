import { useState } from 'react';
import { Dialog, Field } from '@/components';
import { useAssignEmployeeNo } from './api';

/**
 * A-102 — 사번 부여.
 *
 * `EmployeeDetail` 에서 옮겨 왔다 (2026-09-07). 원장에 사번이 없는 직원이 실재해서
 * 등록과 갈라져 있는 동작이다.
 */
export function EmployeeNoDialog({
  open,
  employeeId,
  current,
  onClose,
}: {
  open: boolean;
  employeeId: number;
  current: string | null;
  onClose: () => void;
}) {
  const assign = useAssignEmployeeNo(employeeId);
  const [employeeNo, setEmployeeNo] = useState(current ?? '');

  return (
    <Dialog
      open={open}
      title="사번 부여"
      description="사번은 중복될 수 없어요. 이미 쓰는 사번이면 서버가 알려줘요."
      confirmLabel="부여하기"
      loading={assign.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!employeeNo.trim()) return;
        assign.mutate(employeeNo.trim(), { onSuccess: onClose });
      }}
    >
      <Field label="사번" value={employeeNo} onChange={setEmployeeNo} required maxLength={20} />
      {assign.error && <p className="danger">{assign.error.message}</p>}
    </Dialog>
  );
}
