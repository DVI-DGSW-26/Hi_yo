import { StyleSheet, Text } from 'react-native';
import { formatLeaveDays } from '@hr/format';
import { colors, spacing, typography } from '@hr/tokens';
import { ListRow, SectionTitle } from '@/components';
import { countPickedDays, dayLabel, sortedDates, type PickedDays } from './planDays';

/**
 * 연차사용계획서에서 고른 날 목록. 종이 서식의 표에 해당한다.
 *
 * **`사용계획일수`는 아직 안 낸 동안만 화면이 세어 보여주는 값이다.** 내고 나면 서버가
 * 센 `plannedDays`를 쓴다 (`LeavePlanResult`). 앱이 연차를 계산하는 자리가 아니다 —
 * 고른 것을 그대로 되비추는 것뿐이다.
 */
export function LeavePlanPickedSection({ picked }: { picked: PickedDays }) {
  const dates = sortedDates(picked);

  return (
    <>
      <SectionTitle title="고른 날" />

      {dates.length === 0 ? (
        <Text style={styles.hint}>아직 고른 날이 없어요.</Text>
      ) : (
        dates.map((iso) => (
          <ListRow
            key={iso}
            label={dayLabel(iso)}
            value={picked[iso] === 'HALF' ? '반차' : '연차'}
          />
        ))
      )}

      <ListRow label="사용계획일수" value={formatLeaveDays(countPickedDays(picked))} />

      {/* 서식의 ③·④를 옮겼다 */}
      <Text style={styles.note}>
        고른 날을 바꾸려면 3일 전까지 담당자에게 말해주세요. 적어 낸 날은 그 달 안에
        모두 써야 해요.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.label, color: colors.textWeak, marginBottom: spacing.tight },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
});
