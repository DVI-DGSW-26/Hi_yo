import { useState } from 'react';
import { Button, Dialog, Field, RowLink, StatusText, Table, type Column } from '@/components';
import { AssignDialog } from './AssignDialog';
import { ChangeAssigneeDialog } from './ChangeAssigneeDialog';
import { GenerateResultNotice } from './GenerateResultNotice';
import {
  useDeleteSchedule,
  useDutySchedules,
  useGenerateSchedules,
  type DutyMember,
  type DutyRoster,
  type DutySchedule,
} from './api';
import { scheduleStatusText, slotText, timeRangeText } from './labels';
import { monthRange, todayInKst, weekdayText } from '@/lib/datetime';
import './DutyScheduleSection.css';

interface Props {
  roster: DutyRoster;
  members: DutyMember[];
}

/**
 * 당직표 — 기간을 보고, 순번대로 편성하고, 개별 배정을 고친다.
 *
 * **자동 편성은 몇 번을 다시 돌려도 안전하다.** 이미 배정된 날짜를 건드리지 않는다.
 * 그래서 확인 대화상자를 두지 않는다 — 되돌릴 수 없는 동작이 아니다 (`DESIGN_ADMIN.md` 6장).
 * 대신 결과를 표 위에 남긴다. 연차와 겹친 건이 조용히 지나가면 안 된다.
 */
export function DutyScheduleSection({ roster, members }: Props) {
  const [from, setFrom] = useState(() => thisMonth().from);
  const [to, setTo] = useState(() => thisMonth().to);

  const schedules = useDutySchedules(roster.id, from, to);
  const generate = useGenerateSchedules(roster.id);
  const remove = useDeleteSchedule();

  const [assigning, setAssigning] = useState(false);
  const [changing, setChanging] = useState<DutySchedule>();
  const [removing, setRemoving] = useState<DutySchedule>();

  const columns: Column<DutySchedule>[] = [
    { key: 'date', header: '날짜', sticky: true, render: (row) => row.dutyDate },
    { key: 'weekday', header: '요일', render: (row) => weekdayText(row.dutyDate) },
    // 슬롯을 안 쓰는 명단에서는 열 자체를 만들지 않는다. 빈 열이 늘면 표만 넓어진다.
    ...(roster.useSlot
      ? [{ key: 'slot', header: '슬롯', render: (row: DutySchedule) => slotText(row.slotCode) }]
      : []),
    {
      key: 'employee',
      header: '담당자',
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'department', header: '부서', render: (row) => row.departmentName ?? '—' },
    {
      key: 'time',
      header: '시간',
      render: (row) => timeRangeText(row.startTime, row.endTime),
    },
    {
      key: 'status',
      header: '상태',
      render: (row) => <StatusText label={scheduleStatusText(row.status)} />,
    },
    {
      key: 'swap',
      header: '교체',
      render: (row) => (row.swapPending ? <StatusText label="답 기다리는 중" /> : '—'),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="row-actions">
          <RowLink label="담당자 바꾸기" onClick={() => setChanging(row)} />
          {/* 교체 요청이 걸린 배정은 서버가 지우지 못하게 막는다. 상대방이 응답할 대상이
              사라지기 때문이다. 왜 못 지우는지를 적는다 (DESIGN_ADMIN.md 1장). */}
          {row.swapPending ? (
            <span className="muted">교체 중이라 못 지워요</span>
          ) : (
            <RowLink label="지우기" onClick={() => setRemoving(row)} />
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="page-blocks">
      <h2 className="section-title">당직표</h2>

      <div className="duty-toolbar">
        <Field label="시작일" value={from} onChange={setFrom} type="date" required />
        <Field label="종료일" value={to} onChange={setTo} type="date" required />
        <div className="duty-toolbar-actions">
          <Button
            label="자동 편성하기"
            variant="primary"
            loading={generate.isPending}
            disabledReason={generateBlockedReason(roster, members)}
            onClick={() => generate.mutate({ from, to })}
          />
          <Button label="배정 직접 넣기" onClick={() => setAssigning(true)} />
        </div>
      </div>

      {generate.error && <p className="danger">{generate.error.message}</p>}
      {generate.data && <GenerateResultNotice result={generate.data} />}

      <Table
        columns={columns}
        rows={schedules.data}
        keyOf={(row) => row.id}
        isPending={schedules.isPending}
        error={schedules.error}
        emptyText="이 기간에 배정된 당직이 없어요."
      />

      <AssignDialog
        open={assigning}
        roster={roster}
        members={members}
        onClose={() => setAssigning(false)}
      />
      <ChangeAssigneeDialog
        key={changing?.id ?? 'closed'}
        schedule={changing}
        members={members}
        onClose={() => setChanging(undefined)}
      />

      {/* 지우면 되돌릴 수 없다. danger 로 그리고 무엇이 사라지는지 적는다. */}
      <Dialog
        open={removing !== undefined}
        title="배정 지우기"
        description="지운 배정은 되돌릴 수 없어요. 다시 넣거나 자동 편성을 한 번 더 돌려야 해요."
        confirmLabel="지우기"
        danger
        loading={remove.isPending}
        onClose={() => setRemoving(undefined)}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id, { onSuccess: () => setRemoving(undefined) });
        }}
      >
        <p className="muted">
          {removing?.dutyDate} · {removing?.employeeName ?? '담당자'}
        </p>
        {remove.error && <p className="danger">{remove.error.message}</p>}
      </Dialog>
    </div>
  );
}

/**
 * 자동 편성을 못 도는 이유. 둘 다 사용자가 이 화면에서 고칠 수 없거나(명단 성질),
 * 고쳐야 할 곳이 따로 있는(대상자) 상태다 — `DESIGN_ADMIN.md` 1장이 `disabled`를 허용하는 경우다.
 * 서버도 같은 검증을 한다.
 */
function generateBlockedReason(roster: DutyRoster, members: DutyMember[]): string | undefined {
  if (!roster.autoAssignable) return '이 명단은 자동 편성을 못 해요. 직접 넣어주세요.';
  if (members.filter((member) => member.active).length === 0) {
    return '대상자가 없어요. 먼저 대상자를 넣어주세요.';
  }
  return undefined;
}

/** 이번 달. KST 기준으로 오늘을 잡는다 — `lib/datetime.ts` 참고 */
function thisMonth(): { from: string; to: string } {
  return monthRange(todayInKst());
}
