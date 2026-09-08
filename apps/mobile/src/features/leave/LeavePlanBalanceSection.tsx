import { formatLeaveDays } from '@hr/format';
import { ListRow, QueryState, SectionTitle } from '@/components';
import { useLeaveBalance } from './api';

/**
 * 연차사용계획서 머리의 총 연차·사용·잔여. **종이 서식의 표를 그대로 옮긴 것이다.**
 *
 * S-301의 `LeaveBalanceSection`을 쓰지 않는다. 그쪽은 「연차가 N 남았어요」라고 말하는
 * 자리라 서식의 세 줄과 모양이 다르다 — 계획서는 종이와 같은 항목이 같은 순서로 있어야
 * 관리팀이 대조할 수 있다.
 *
 * 잔여는 단건이라 빈 상태가 없다. `empty`를 넘기지 않는다.
 */
export function LeavePlanBalanceSection() {
  const balance = useLeaveBalance();

  return (
    <>
      <SectionTitle title="내 연차" />
      <QueryState query={balance}>
        {(data) => (
          <>
            <ListRow label="총 연차" value={formatLeaveDays(data.granted)} />
            <ListRow label="사용" value={formatLeaveDays(data.used)} />
            <ListRow label="잔여" value={formatLeaveDays(data.remaining)} />
          </>
        )}
      </QueryState>
    </>
  );
}
