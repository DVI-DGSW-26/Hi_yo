import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { formatAmount, formatTargetYm } from '@hr/format';
import { colors } from '@hr/tokens';
import { ListRow, QueryState, Section, SectionTitle } from '@/components';
import { useAuthMe } from '@/features/auth/api';
import { useMyPayrolls } from '@/features/payroll/api';

/**
 * S-601 급여명세서 조회 — 목록
 *
 * 이 화면이 전달할 단 하나의 메시지 — **어느 달 것을 볼 것인가.**
 *
 * **확정되지 않은 급여는 보여주지 않는다** (2026-09-01 확정). 계산만 돌아간 금액은 아직
 * 바뀔 수 있어서, 직원이 그 숫자를 보고 기대하면 나중에 문제가 된다.
 *
 * 실수령액은 서버가 준 `finalAmount`다. 지급에서 공제를 빼보지 않는다.
 */
export default function PayrollListScreen() {
  const router = useRouter();
  const me = useAuthMe();
  const payrolls = useMyPayrolls(me.data?.employeeId);

  return (
    <>
      <Stack.Screen options={{ title: '급여명세서' }} />
      <ScrollView style={styles.flex}>
        <Section>
          <SectionTitle title="받은 명세서" />
          {/*
            "없다"가 아니라 "아직 확정된 것이 없다"로 적는다. 계산 중인 달이 있어도
            여기서는 안 보이는 것이 맞고, 그것을 문구가 말해준다.
          */}
          <QueryState query={payrolls} empty="아직 확정된 명세서가 없어요.">
            {(data) => (
              <>
                {data.map((payroll) => (
                  <ListRow
                    key={payroll.id}
                    label={formatTargetYm(payroll.targetYm)}
                    value={`${formatAmount(payroll.finalAmount)}원`}
                    variant="nav"
                    onPress={() => router.push(`/payroll/${payroll.id}`)}
                  />
                ))}
              </>
            )}
          </QueryState>
        </Section>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
});
