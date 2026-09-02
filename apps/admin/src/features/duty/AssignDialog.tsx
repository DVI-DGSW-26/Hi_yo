import { useState } from 'react';
import { Dialog, Field, Select } from '@/components';
import { useAssignSchedule, type DutyMember, type DutyRoster } from './api';

interface Props {
  open: boolean;
  roster: DutyRoster;
  members: DutyMember[];
  onClose: () => void;
}

/**
 * 배정 직접 등록.
 *
 * **자동 편성이 안 되는 명단은 이것으로만 채운다.** 평일연장이 그렇다
 * (`autoAssignable: false`, 순환 `수시`).
 *
 * 슬롯을 쓰는 명단(경비교대)은 `slotId`가 필수고 나머지는 비워야 한다. 그래서 슬롯 칸은
 * `useSlot`을 보고 그린다 — 서버가 준 값으로 정하고 명단 이름으로 판단하지 않는다.
 *
 * 이미 배정된 날짜면 서버가 `409`를 준다. 담당자를 바꾸려면 그 행의 `담당자 바꾸기`를 쓴다.
 */
export function AssignDialog({ open, roster, members, onClose }: Props) {
  const assign = useAssignSchedule(roster.id);

  const [dutyDate, setDutyDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [slotId, setSlotId] = useState('');

  return (
    <Dialog
      open={open}
      title="배정 직접 넣기"
      description="이미 배정된 날짜에는 넣을 수 없어요. 담당자를 바꾸려면 그 줄의 담당자 바꾸기를 쓰세요."
      confirmLabel="넣기"
      loading={assign.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!dutyDate || !employeeId) return;
        if (roster.useSlot && !slotId) return;
        assign.mutate(
          {
            dutyDate,
            employeeId: Number(employeeId),
            ...(roster.useSlot ? { slotId: Number(slotId) } : {}),
          },
          {
            onSuccess: () => {
              setDutyDate('');
              onClose();
            },
          },
        );
      }}
    >
      <Field label="날짜" value={dutyDate} onChange={setDutyDate} type="date" required />
      {roster.useSlot && (
        <Select
          label="슬롯"
          value={slotId}
          onChange={setSlotId}
          options={roster.slots.map((slot) => ({
            value: String(slot.id),
            label: slotOptionLabel(slot.code, slot.startTime, slot.endTime),
          }))}
          placeholder="고르지 않았어요"
        />
      )}
      <Select
        label="담당자"
        value={employeeId}
        onChange={setEmployeeId}
        options={memberOptions(members)}
        placeholder={members.length === 0 ? '이 명단에 대상자가 없어요' : '고르지 않았어요'}
      />
      {assign.error && <p className="danger">{assign.error.message}</p>}
    </Dialog>
  );
}

/** 슬롯은 코드만으로 어느 시간대인지 알기 어렵다. 서버가 준 시각을 같이 보여준다 */
function slotOptionLabel(code: string, startTime: string | null, endTime: string | null): string {
  const name = code === 'LUNCH' ? '중식' : code === 'DINNER' ? '석식' : code;
  if (startTime == null || endTime == null) return name;
  return `${name} · ${startTime.slice(0, 5)} ~ ${endTime.slice(0, 5)}`;
}

/**
 * 고를 사람은 **이 명단의 대상자**다. 명단 밖의 직원을 당직에 넣을 일이 없고,
 * 넣으면 순번과 어긋나 다음 자동 편성이 설명되지 않는다.
 */
function memberOptions(members: DutyMember[]) {
  return members
    .filter((member) => member.active)
    .map((member) => ({
      value: String(member.employeeId),
      label: `${member.rotationSeq}. ${member.employeeName ?? `직원 ${member.employeeId}`}`,
    }));
}
