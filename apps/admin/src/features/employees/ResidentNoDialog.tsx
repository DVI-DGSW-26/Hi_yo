import { useState } from 'react';
import { Dialog, Field } from '@/components';
import { useRegisterResidentNo } from './api';

/**
 * A-102 — 주민등록번호를 등록한다.
 *
 * **2026-09-02에 열린 `PATCH /employees/{id}/resident-no` 를 쓴다.** 그전에는 전체 교체
 * `PUT` 밖에 없어서 인적사항을 한 번 고칠 때마다 주민번호가 지워졌다. 지워지면
 * 그 직원은 재직증명서를 발급받지 못한다.
 *
 * **다시 읽을 수 없는 값이다.** 응답에도 어떤 조회에도 담기지 않고 `residentNoRegistered`
 * 만 `true` 로 바뀐다. 그래서 「지금 등록된 값」을 보여주는 자리가 없고, 폼도 늘 빈 칸에서
 * 시작한다 — 고치는 것이 아니라 **새로 넣는 것**이다.
 *
 * **값을 상태에 오래 두지 않는다** (`CLAUDE.md` 2장). 성공하든 닫든 지운다.
 * 로그·에러 메시지에 넣지 않는다 — 실패해도 서버가 준 문구만 그대로 보여준다.
 *
 * **형식을 앱이 판정하지 않는다.** 자릿수·검증번호는 서버가 본다. 화면은 빈 칸만 막는다.
 */
export function ResidentNoDialog({
  open,
  employeeId,
  registered,
  onClose,
}: {
  open: boolean;
  employeeId: number;
  registered: boolean;
  onClose: () => void;
}) {
  const register = useRegisterResidentNo(employeeId);
  const [residentNo, setResidentNo] = useState('');

  function close() {
    // 닫을 때도 지운다. 다시 열었을 때 남아 있으면 안 되는 값이다.
    setResidentNo('');
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={registered ? '주민등록번호 다시 등록' : '주민등록번호 등록'}
      description={
        registered
          ? '이미 등록돼 있어요. 새로 넣으면 전에 넣은 값을 대신해요. 등록된 값은 다시 볼 수 없어요.'
          : '등록하면 재직증명서에 넣을 수 있어요. 등록된 값은 다시 볼 수 없어요.'
      }
      confirmLabel="등록하기"
      loading={register.isPending}
      onClose={close}
      onConfirm={() => {
        const value = residentNo.trim();
        if (!value) return;
        register.mutate(value, { onSuccess: close });
      }}
    >
      <Field
        label="주민등록번호"
        value={residentNo}
        onChange={setResidentNo}
        required
        placeholder="901231-1234567"
        maxLength={14}
      />
      <p className="muted">화면에 다시 표시되지 않아요. 등록 여부만 남아요.</p>
      {register.error && <p className="danger">{register.error.message}</p>}
    </Dialog>
  );
}
