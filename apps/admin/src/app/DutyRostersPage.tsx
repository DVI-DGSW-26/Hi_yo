import { useNavigate } from 'react-router';
import { StatusText, Table, type Column } from '@/components';
import { useDutyRosters, type DutyRoster } from '@/features/duty/api';
import { rotationCycleText, slotText, timeRangeText } from '@/features/duty/labels';

/**
 * A-504 당직 명단 · 스케줄 관리 — 명단 목록
 *
 * 이 화면이 전달할 단 하나의 메시지 — **명단이 셋이고, 각각 몇 명이 도는가.**
 *
 * 명단은 서버가 정의해 준다. 화면에서 만들거나 지우지 않는다 — 만드는 API가 없다.
 * 여기서 하는 일은 어느 명단으로 들어갈지 고르는 것뿐이다.
 */
export function DutyRostersPage() {
  const navigate = useNavigate();
  const rosters = useDutyRosters();

  const columns: Column<DutyRoster>[] = [
    { key: 'name', header: '명단', sticky: true, render: (row) => row.name },
    { key: 'cycle', header: '순환', render: (row) => rotationCycleText(row.rotationCycle) },
    {
      key: 'auto',
      header: '자동 편성',
      render: (row) =>
        row.autoAssignable ? (
          <StatusText label="돌릴 수 있어요" />
        ) : (
          // 못 하는 것이지 잘못된 것이 아니다. 빨강으로 칠하지 않는다.
          <StatusText label="직접 넣어야 해요" />
        ),
    },
    {
      key: 'time',
      header: '근무 시간',
      render: (row) => timeRangeText(row.workStart, row.workEnd),
    },
    {
      key: 'slots',
      header: '슬롯',
      // 슬롯을 쓰는 명단은 하루에 배정이 여러 건 생긴다.
      render: (row) =>
        row.useSlot ? row.slots.map((slot) => slotText(slot.code)).join(' · ') : '—',
    },
    {
      key: 'members',
      header: '대상자',
      align: 'right',
      render: (row) =>
        row.memberCount === 0 ? (
          // 대상자가 없으면 편성도 교체도 되지 않는다. 이 화면에서 제일 먼저 보여야 할 값이다.
          <StatusText label="아직 없어요" tone="error" />
        ) : (
          `${row.memberCount}명`
        ),
    },
  ];

  return (
    <section>
      <h1 className="page-title">당직</h1>

      <p className="muted">
        명단에 대상자를 넣고 순번을 정해요. 그 순번대로 당직표를 편성해요.
      </p>

      <Table
        columns={columns}
        rows={rosters.data}
        keyOf={(row) => row.id}
        isPending={rosters.isPending}
        error={rosters.error}
        emptyText="등록된 명단이 없어요."
        onRowClick={(row) => navigate(`/duty/${row.id}`)}
      />
    </section>
  );
}
