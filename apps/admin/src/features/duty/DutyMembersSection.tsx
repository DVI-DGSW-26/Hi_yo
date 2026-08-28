import { useState } from 'react';
import { Button, Dialog, RowLink, StatusText, Table, type Column } from '@/components';
import { AddMemberDialog } from './AddMemberDialog';
import { RotationSeqDialog } from './RotationSeqDialog';
import { useDutyMembers, useRemoveMember, type DutyMember } from './api';

/**
 * 명단의 대상자와 순번.
 *
 * **순번은 관리팀이 정한다.** 가나다순이 아니며 자동 편성이 이 순서대로 돈다.
 * 화면에서 다시 정렬하지 않는다 — 서버가 준 순서가 곧 도는 순서다.
 *
 * 제외해도 행이 사라지지 않는다. 과거 배정 이력을 지우지 않으려고 꺼 두는 것이라
 * 목록에는 남고, 다시 넣으면 되살아난다.
 */
export function DutyMembersSection({ rosterId }: { rosterId: number }) {
  const members = useDutyMembers(rosterId);
  const remove = useRemoveMember(rosterId);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<DutyMember>();
  const [removing, setRemoving] = useState<DutyMember>();

  const columns: Column<DutyMember>[] = [
    { key: 'seq', header: '순번', align: 'right', sticky: true, render: (row) => row.rotationSeq },
    {
      key: 'name',
      header: '이름',
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'department', header: '부서', render: (row) => row.departmentName ?? '—' },
    {
      key: 'active',
      header: '상태',
      render: (row) =>
        row.active ? <StatusText label="돌고 있어요" /> : <StatusText label="빠져 있어요" />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="row-actions">
          <RowLink label="순번 바꾸기" onClick={() => setEditing(row)} />
          {row.active && <RowLink label="명단에서 빼기" onClick={() => setRemoving(row)} />}
        </span>
      ),
    },
  ];

  return (
    <>
      <h2 className="section-title">대상자</h2>

      <div className="detail-actions">
        <Button label="대상자 추가하기" onClick={() => setAdding(true)} />
      </div>

      <Table
        columns={columns}
        rows={members.data}
        keyOf={(row) => row.id}
        isPending={members.isPending}
        error={members.error}
        emptyText="이 명단에 아직 아무도 없어요. 대상자를 넣어야 편성할 수 있어요."
      />

      {/* 열 때마다 다시 만든다. 그래야 순번 기본값이 그때의 명단을 보고 정해진다 */}
      <AddMemberDialog
        key={adding ? 'open' : 'closed'}
        open={adding}
        rosterId={rosterId}
        members={members.data ?? []}
        onClose={() => setAdding(false)}
      />
      <RotationSeqDialog
        key={editing?.employeeId ?? 'closed'}
        rosterId={rosterId}
        member={editing}
        onClose={() => setEditing(undefined)}
      />

      {/* 되돌릴 수 있는 동작이라 danger 가 아니다. 그래도 확인을 거친다 —
          누가 밤에 서는지가 바뀌고, 다음 편성부터 순서가 달라진다. */}
      <Dialog
        open={removing !== undefined}
        title="명단에서 빼기"
        description="다음 편성부터 이 사람은 빠져요. 이미 만들어진 배정은 그대로 남고, 다시 넣으면 순번까지 되살아나요."
        confirmLabel="빼기"
        loading={remove.isPending}
        onClose={() => setRemoving(undefined)}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.employeeId, { onSuccess: () => setRemoving(undefined) });
        }}
      >
        <p className="muted">
          {removing?.employeeName ?? '이 직원'} · 순번 {removing?.rotationSeq}
        </p>
        {remove.error && <p className="danger">{remove.error.message}</p>}
      </Dialog>
    </>
  );
}
