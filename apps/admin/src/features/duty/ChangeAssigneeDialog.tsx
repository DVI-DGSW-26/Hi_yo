import { useState } from 'react';
import { Dialog, Field, Select } from '@/components';
import { useChangeAssignee, type DutyMember, type DutySchedule } from './api';
import { slotText, weekdayText } from './labels';

interface Props {
  /**
   * 열려 있으면 이 배정의 담당자를 바꾼다. 닫혀 있으면 `undefined`.
   *
   * 호출하는 쪽이 `key`에 이 배정을 넣는다. 다른 줄을 고르면 컴포넌트가 다시 만들어져
   * 고른 값이 그 배정의 현재 담당자에서 시작한다.
   */
  schedule: DutySchedule | undefined;
  members: DutyMember[];
  onClose: () => void;
}

/**
 * 담당자 직접 변경.
 *
 * **상대 동의 없이 관리팀 권한으로 바꾼다.** 직원끼리의 교체(S-503)는 상대가 24시간 안에
 * 동의해야 바뀌는데, 이 경로는 그 절차를 건너뛴다. 그래서 문구에 그 사실을 적는다 —
 * 누르는 사람이 무엇을 건너뛰는지 알아야 한다.
 */
export function ChangeAssigneeDialog({ schedule, members, onClose }: Props) {
  const change = useChangeAssignee();
  const [employeeId, setEmployeeId] = useState(schedule ? String(schedule.employeeId) : '');

  return (
    <Dialog
      open={schedule !== undefined}
      title="담당자 바꾸기"
      description="상대방 동의 없이 바로 바뀌어요. 직원끼리의 교체와 달리 24시간 대기를 거치지 않아요."
      confirmLabel="바꾸기"
      loading={change.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!schedule || !employeeId) return;
        change.mutate(
          { scheduleId: schedule.id, employeeId: Number(employeeId) },
          { onSuccess: onClose },
        );
      }}
    >
      <Field label="날짜" value={schedule ? dateText(schedule) : ''} readOnly />
      <Field
        label="지금 담당자"
        value={schedule?.employeeName ?? (schedule ? `직원 ${schedule.employeeId}` : '')}
        readOnly
      />
      <Select
        label="바꿀 담당자"
        value={employeeId}
        onChange={setEmployeeId}
        options={members
          .filter((member) => member.active)
          .map((member) => ({
            value: String(member.employeeId),
            label: `${member.rotationSeq}. ${member.employeeName ?? `직원 ${member.employeeId}`}`,
          }))}
        placeholder={members.length === 0 ? '이 명단에 대상자가 없어요' : undefined}
      />
      {change.error && <p className="danger">{change.error.message}</p>}
    </Dialog>
  );
}

function dateText(schedule: DutySchedule): string {
  const base = `${schedule.dutyDate} (${weekdayText(schedule.dutyDate)})`;
  return schedule.slotCode === null ? base : `${base} · ${slotText(schedule.slotCode)}`;
}
