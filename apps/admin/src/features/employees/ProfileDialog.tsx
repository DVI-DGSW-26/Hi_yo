import { useState } from 'react';
import { Dialog, Field } from '@/components';
import { useUpdateEmployee, type Employee, type EmployeeDetail } from './api';

/**
 * A-102 — 이름 · 연락처 · 주소를 바꾼다.
 *
 * **2026-09-09에 열렸다.** `PUT /employees/{id}` 에서 `residentNo` 가 빠지면서
 * (회신 25번) 전체 교체로 이름을 고쳐도 주민번호가 지워지지 않게 됐다. 8-26부터
 * 막아 두고 있던 자리다.
 *
 * **빈 칸은 「그대로 둔다」다.** 안 실은 값은 서버가 보존한다 — 뒤집어 말하면 이 화면으로
 * 값을 **지울 수는 없다.** 지우는 방법은 확인되지 않았고, 그럴듯하게 빈 문자열을 보내
 * 알아서 지워지기를 바라지 않는다 (`CLAUDE.md` 9장). 필요해지면 서버에 먼저 묻는다.
 *
 * **이름은 비울 수 없다.** 스펙이 필수로 잡고 있기도 하고, 이름이 빈 직원은 목록에서
 * 찾을 수가 없다.
 *
 * `corporation`·`hireDate` 도 스펙 필수라 지금 값을 그대로 되돌려 보낸다. **둘 중
 * 하나라도 비어 있으면 이 대화상자를 열지 않는다** — 없는 값을 지어내 보내는 셈이 된다.
 */
export function ProfileDialog({
  open,
  employee,
  detail,
  onClose,
}: {
  open: boolean;
  employee: Employee;
  detail: Pick<EmployeeDetail, 'phone' | 'address'>;
  onClose: () => void;
}) {
  const update = useUpdateEmployee(employee.id);

  const [name, setName] = useState(employee.name);
  const [phone, setPhone] = useState(detail.phone ?? '');
  const [address, setAddress] = useState(detail.address ?? '');

  const nameError = name.trim() === '' ? '이름은 비울 수 없어요.' : undefined;

  return (
    <Dialog
      open={open}
      title="이름 · 연락처 · 주소 바꾸기"
      description="빈 칸으로 두면 그 항목은 지금 값 그대로예요. 이 화면으로 값을 지울 수는 없어요."
      confirmLabel="바꾸기"
      loading={update.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (nameError) return;
        if (employee.corporation === null || employee.hireDate === null) return;

        update.mutate(
          {
            name: name.trim(),
            // 바꾸는 값이 아니다. 스펙이 필수로 잡고 있어 지금 값을 되돌려 보낸다.
            corporation: employee.corporation,
            hireDate: employee.hireDate,
            phone: trimmed(phone),
            address: trimmed(address),
          },
          { onSuccess: onClose },
        );
      }}
    >
      <Field label="이름" value={name} onChange={setName} required maxLength={50} error={nameError} />
      <Field label="연락처" value={phone} onChange={setPhone} maxLength={20} placeholder="010-0000-0000" />
      <Field label="주소" value={address} onChange={setAddress} maxLength={255} />

      {update.error && <p className="danger">{update.error.message}</p>}
    </Dialog>
  );
}

/** 빈 칸은 싣지 않는다. 서버가 그 항목을 그대로 둔다 */
function trimmed(value: string): string | undefined {
  const next = value.trim();
  return next === '' ? undefined : next;
}
