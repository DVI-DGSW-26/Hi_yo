import { useState } from 'react';
import { Dialog, Field } from '@/components';
import { useChangeRotationSeq, type DutyMember } from './api';

interface Props {
  rosterId: number;
  /**
   * 열려 있으면 이 사람의 순번을 고친다. 닫혀 있으면 `undefined`.
   *
   * 호출하는 쪽이 `key`에 이 사람을 넣는다. 다른 사람을 고르면 컴포넌트가 다시 만들어져
   * 입력칸이 그 사람의 현재 순번에서 시작한다 — 효과 안에서 상태를 되돌리지 않아도 된다.
   */
  member: DutyMember | undefined;
  onClose: () => void;
}

/**
 * 순번 변경.
 *
 * **순환 순서가 바로 달라진다.** 다음 편성부터 이 순서로 돌고, 이미 만들어진 배정은
 * 그대로 남는다 — 자동 편성이 이미 배정된 날짜를 건드리지 않기 때문이다.
 *
 * 순번이 겹쳐도 화면에서 막지 않는다. 겹칠 때 어떻게 도는지가 정의돼 있지 않고,
 * 서버가 받는지 거절하는지도 확인되지 않았다. 판정은 서버가 하고 문구를 그대로 보여준다.
 */
export function RotationSeqDialog({ rosterId, member, onClose }: Props) {
  const change = useChangeRotationSeq(rosterId);
  const [rotationSeq, setRotationSeq] = useState(member ? String(member.rotationSeq) : '');

  return (
    <Dialog
      open={member !== undefined}
      title="순번 바꾸기"
      description="다음 편성부터 이 순서로 돌아요. 이미 만들어진 배정은 그대로 남아요."
      confirmLabel="바꾸기"
      loading={change.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!member || !rotationSeq) return;
        change.mutate(
          { employeeId: member.employeeId, rotationSeq: Number(rotationSeq) },
          { onSuccess: onClose },
        );
      }}
    >
      <Field
        label="누구"
        value={member?.employeeName ?? (member ? `직원 ${member.employeeId}` : '')}
        readOnly
      />
      <Field label="순번" value={rotationSeq} onChange={setRotationSeq} type="number" required />
      {change.error && <p className="danger">{change.error.message}</p>}
    </Dialog>
  );
}
