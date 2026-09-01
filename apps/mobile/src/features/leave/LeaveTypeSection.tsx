import { useState } from 'react';
import { ListRow, SelectSheet, TimeField } from '@/components';
import { HALF_DAY_SLOTS, halfDaySlot, halfDayText, type HalfDaySlot } from './halfDay';
import { useRequestTypes, type RequestType } from './api';

/**
 * 무엇을 신청하는지, 그리고 그 종류가 요구하는 값.
 *
 * **어떤 칸이 필요한지를 서버가 정한다.** `GET /requests/types`의 `halfDay`면 오전·오후를
 * 고르고, 그 밖의 `needTime`(외출·조퇴)이면 시각을 직접 받는다. 코드로 분기하지 않는다 —
 * 종류가 늘거나 규칙이 바뀌면 서버만 고치면 된다.
 *
 * **종류 이름도 서버가 준 `name`을 그대로 쓴다.**
 */
export interface LeaveTypeChoice {
  type?: RequestType;
  half: HalfDaySlot;
  /** `HH:mm`. `needTime`이면서 반차가 아닌 종류에만 쓴다 */
  startTime: string;
  endTime: string;
}

export const EMPTY_CHOICE: LeaveTypeChoice = { half: 'AM', startTime: '', endTime: '' };

interface Props {
  value: LeaveTypeChoice;
  onChange: (next: LeaveTypeChoice) => void;
}

export function LeaveTypeSection({ value, onChange }: Props) {
  const types = useRequestTypes();
  const [pickingType, setPickingType] = useState(false);
  const [pickingHalf, setPickingHalf] = useState(false);

  const { type } = value;

  return (
    <>
      <ListRow
        label="종류"
        variant="nav"
        value={type?.name}
        placeholder={typePlaceholder(types)}
        onPress={() => setPickingType(true)}
      />

      {/* 반차는 오전·오후만 고르면 된다. 시각은 인사팀이 정한 값이 들어간다. */}
      {type?.halfDay && (
        <ListRow
          label="반차"
          variant="nav"
          value={halfDayText(value.half)}
          onPress={() => setPickingHalf(true)}
        />
      )}

      {/* 외출·조퇴는 몇 시에 나갔다 언제 오는지가 사람마다 다르다. 직접 받는다. */}
      {type?.needTime && !type.halfDay && (
        <>
          <TimeField
            label="시작 시각"
            value={value.startTime}
            onChangeText={(startTime) => onChange({ ...value, startTime })}
          />
          <TimeField
            label="종료 시각"
            value={value.endTime}
            onChangeText={(endTime) => onChange({ ...value, endTime })}
          />
        </>
      )}

      <SelectSheet
        open={pickingType}
        title="무엇을 신청하나요"
        options={(types.data ?? []).map((each) => ({ value: each.code, label: each.name }))}
        selected={type?.code}
        onSelect={(code) => {
          const picked = types.data?.find((each) => each.code === code);
          // 종류를 바꾸면 앞 종류에서 적던 시각을 지운다. 남겨두면 안 보이는 칸의 값이
          // 그대로 실려 나간다.
          if (picked) onChange({ ...EMPTY_CHOICE, half: value.half, type: picked });
        }}
        onClose={() => setPickingType(false)}
        // 시트가 비는 경우가 셋이라 무엇 때문에 비었는지를 그대로 적는다.
        empty={typeEmptyText(types)}
      />

      <SelectSheet
        open={pickingHalf}
        title="언제 쉬나요"
        options={HALF_DAY_SLOTS.map((slot) => {
          const { label, startTime, endTime } = halfDaySlot(slot);
          return { value: slot, label, hint: `${startTime.slice(0, 5)} ~ ${endTime.slice(0, 5)}` };
        })}
        selected={value.half}
        onSelect={(half) => onChange({ ...value, half })}
        onClose={() => setPickingHalf(false)}
      />
    </>
  );
}

/** 아직 고르지 않았을 때 줄에 뭐라고 적을지. 로딩·에러도 이 자리에서 말한다. */
function typePlaceholder(types: TypesQuery): string {
  if (types.isPending) return '불러오는 중이에요';
  if (types.error) return '종류를 못 불러왔어요';
  return '고르기';
}

/** 시트가 비는 경우가 셋이다 — 부르는 중이거나, 못 받았거나, 받았는데 하나도 없거나. */
function typeEmptyText(types: TypesQuery): string {
  if (types.isPending) return '불러오는 중이에요.';
  if (types.error) return types.error.message;
  return '신청할 수 있는 종류가 없어요.';
}

type TypesQuery = ReturnType<typeof useRequestTypes>;
