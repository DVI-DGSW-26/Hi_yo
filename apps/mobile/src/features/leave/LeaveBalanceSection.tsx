import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { ListRow } from '@/components';
import { formatLeaveDays } from '@/lib/format';
import { useLeaveBalance } from './api';

/**
 * 잔여 연차.
 *
 * 숫자를 그린으로 칠하지 않는다. 이 화면의 그린 예산 2곳은 선택된 날짜와 신청 버튼이 쓴다
 * (DESIGN_SYSTEM.md 1장).
 *
 * `remaining`과 `confirmedRemaining`이 다르면 그 이유를 적는다. 결재 대기중인 신청 때문에
 * 잔여가 줄어 보이는 지점이라 직원이 가장 많이 되묻는 자리다.
 */
export function LeaveBalanceSection() {
  const { data, isPending, error } = useLeaveBalance();

  if (isPending) return <ActivityIndicator color={colors.textDisabled} />;
  if (error) return <Text style={styles.error}>{error.message}</Text>;

  return (
    <View>
      <Text style={styles.headline}>연차가 {formatLeaveDays(data.remaining)} 남았어요</Text>
      {data.pending > 0 && (
        <Text style={styles.note}>
          결재를 기다리는 {formatLeaveDays(data.pending)}을 뺀 숫자예요. 승인 전 기준으로는{' '}
          {formatLeaveDays(data.confirmedRemaining)}이에요.
        </Text>
      )}
      <View style={styles.rows}>
        <ListRow label={`${data.fiscalYear}년 발생`} value={formatLeaveDays(data.granted)} />
        <ListRow label="사용" value={formatLeaveDays(data.used)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { ...typography.headline, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak, marginTop: 8 },
  rows: { marginTop: 20 },
  error: { ...typography.bodySmall, color: colors.danger },
});
