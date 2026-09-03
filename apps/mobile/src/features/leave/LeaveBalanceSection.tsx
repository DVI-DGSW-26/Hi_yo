import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';
import { ListRow, QueryState } from '@/components';
import { formatLeaveDays } from '@/lib/format';
import { useLeaveBalance } from './api';

/**
 * 잔여 연차.
 *
 * 숫자를 그린으로 칠하지 않는다. 예산 2곳을 선택된 날짜와 신청 버튼이 쓴다고 보고 비웠는데,
 * 세어 보니 **이 화면은 이미 네 곳이다** — 달력 점과 신청 목록의 `승인했어요`가 더 있다
 * (2026-09-03, DESIGN_SYSTEM.md 1장). 여기를 칠하지 않는다는 결론은 그대로다.
 *
 * `remaining`과 `confirmedRemaining`이 다르면 그 이유를 적는다. 결재 대기중인 신청 때문에
 * 잔여가 줄어 보이는 지점이라 직원이 가장 많이 되묻는 자리다.
 *
 * 잔여는 단건이라 빈 상태가 없다. `empty`를 넘기지 않는다.
 */
export function LeaveBalanceSection() {
  const balance = useLeaveBalance();

  return (
    <QueryState query={balance}>
      {(data) => (
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
      )}
    </QueryState>
  );
}

const styles = StyleSheet.create({
  headline: { ...typography.headline, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
  rows: { marginTop: spacing.sectionTitleGap },
});
