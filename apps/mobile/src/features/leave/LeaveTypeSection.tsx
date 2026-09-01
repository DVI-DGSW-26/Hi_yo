import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { ListRow, SelectSheet } from '@/components';
import { HALF_DAY_SLOTS, halfDaySlot, halfDayText, type HalfDaySlot } from './halfDay';
import { useRequestTypes, type RequestType } from './api';

interface Props {
  selected: RequestType | undefined;
  onSelect: (type: RequestType) => void;
  half: HalfDaySlot;
  onSelectHalf: (slot: HalfDaySlot) => void;
}

/**
 * 무엇을 신청하는지 고르는 자리.
 *
 * **종류 이름은 서버가 준다.** `GET /requests/types`의 `name`을 그대로 쓴다 — 코드로 이름을
 * 만들지 않는다. 어떤 칸이 필요한지도 서버가 정한다: `halfDay`면 오전·오후를 고르고,
 * 그 밖의 `needTime`이면 시각을 직접 받아야 한다.
 *
 * **시각을 직접 받는 종류(외출·조퇴)는 아직 고를 수 없다.** 시각을 고르는 칸이
 * `src/components`에 없고, 새 컴포넌트는 만들기 전에 사람에게 묻는다
 * (`DESIGN_RULES.md` 1장 3번). 목록에서 빼되 **왜 없는지 화면에 적는다** — 조용히 사라지면
 * 사용자는 자기가 잘못 찾는 줄 안다. 거르는 기준은 서버가 준 `needTime`·`halfDay`
 * 두 값이고 앱이 종류를 임의로 가르지 않는다.
 */
export function LeaveTypeSection({ selected, onSelect, half, onSelectHalf }: Props) {
  const types = useRequestTypes();
  const [pickingType, setPickingType] = useState(false);
  const [pickingHalf, setPickingHalf] = useState(false);

  const pickable = types.data?.filter((type) => !type.needTime || type.halfDay) ?? [];
  const hidden = (types.data?.length ?? 0) - pickable.length;

  return (
    <>
      <ListRow
        label="종류"
        variant="nav"
        value={selected?.name}
        placeholder={typePlaceholder(types)}
        onPress={() => setPickingType(true)}
      />

      {/* 반차는 오전·오후만 고르면 된다. 시각은 인사팀이 정한 값이 들어간다. */}
      {selected?.halfDay && (
        <ListRow
          label="반차"
          variant="nav"
          value={halfDayText(half)}
          onPress={() => setPickingHalf(true)}
        />
      )}

      {hidden > 0 && (
        <Text style={styles.note}>
          시각을 직접 적어야 하는 종류(외출·조퇴)는 아직 여기서 신청할 수 없어요. 종이 신청서로
          내주세요.
        </Text>
      )}

      <SelectSheet
        open={pickingType}
        title="무엇을 신청하나요"
        options={pickable.map((type) => ({ value: type.code, label: type.name }))}
        selected={selected?.code}
        onSelect={(code) => {
          const picked = pickable.find((type) => type.code === code);
          if (picked) onSelect(picked);
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
        selected={half}
        onSelect={onSelectHalf}
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

/** 시트가 비는 경우가 셋이다 — 아직 못 받았거나, 못 받았거나, 받았는데 고를 게 없거나. */
function typeEmptyText(types: TypesQuery): string {
  if (types.isPending) return '불러오는 중이에요.';
  if (types.error) return types.error.message;
  return '지금 여기서 신청할 수 있는 종류가 없어요.';
}

type TypesQuery = ReturnType<typeof useRequestTypes>;

const styles = StyleSheet.create({
  note: { ...typography.label, color: colors.textWeak },
});
