import { useState } from 'react';
import { Dialog, Field } from '@/components';
import {
  toUpdateInput,
  useUpdateEmployee,
  type Employee,
  type EmployeeDetail,
} from './api';

/**
 * A-102 — 이름 · 연락처 · 주소를 바꾼다.
 *
 * **`PUT /employees/{id}`는 전체 교체다** (2026-09-09 서버 정정). 그 전에는 「안 실은 값은
 * 보존된다」로 알고 이 화면이 셋만 실어 보냈다 — 그러면 이름만 고쳐도 이메일·생년월일·
 * 비상연락처에 더해 **부서·직무까지 지워졌다.** 직무가 비면 그 사람 근태가 판정되지 않고
 * 급여 계산에서 빠진다.
 *
 * **그래서 조회로 읽은 값을 전부 다시 싣는다** (`toUpdateInput`). 이 화면이 건드리는 셋만
 * 그 위에 덮어쓴다.
 *
 * **빈 칸은 「지운다」다.** 서버가 키 생략·`null`·`''`를 모두 지움으로 처리한다고 확인해
 * 줬으므로, 지우는 것이 되는 동작이다 — 연락처가 바뀐 것이 아니라 없어진 경우를 다룰 수 있다.
 *
 * **이름은 비울 수 없다.** 서버가 400을 돌려주고, 이름이 빈 직원은 목록에서 찾을 수도 없다.
 *
 * `corporation`·`hireDate`가 비어 있으면 아예 열지 않는다 — 스펙 필수라 없는 값을 지어내
 * 실어야 한다. 화면이 버튼을 막고 이유를 적는다.
 */
export function ProfileDialog({
  open,
  employee,
  detail,
  onClose,
}: {
  open: boolean;
  employee: Employee;
  detail: Omit<EmployeeDetail, 'summary'>;
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
      description="빈 칸으로 두면 그 항목이 지워져요. 나머지 항목은 그대로예요."
      confirmLabel="바꾸기"
      loading={update.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (nameError) return;

        /*
         * 지금 값 전부를 몸통으로 만들고 이 화면이 바꾼 셋만 덮어쓴다.
         *
         * 조회와 저장 사이에 남이 다른 항목을 고쳤으면 그 값을 덮어쓰게 된다.
         * 전체 교체 경로에서는 피할 수 없고, 항목별 `PATCH`가 있는 것
         * (부서·직무·사번·재직상태·주민번호)은 그쪽을 쓰므로 겹치지 않는다.
         */
        const body = toUpdateInput(employee, detail);
        if (body === undefined) return;

        update.mutate(
          { ...body, name: name.trim(), phone: phone.trim(), address: address.trim() },
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
