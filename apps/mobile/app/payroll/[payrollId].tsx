import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatAmount, formatMinutes, formatTargetYm } from '@hr/format';
import { colors, spacing, typography } from '@hr/tokens';
import { ListRow, QueryState, Section, SectionDivider, SectionTitle } from '@/components';
import { usePayroll, type PayrollItem } from '@/features/payroll/api';

/**
 * S-601 급여명세서 조회 — 한 건
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이번 달에 얼마를 받고, 무엇이 빠졌는가.**
 *
 * **`items`를 순서대로 그린다.** 서버 스펙이 "순서대로 출력하면 명세서가 된다"고 적고
 * 있다 — 항목 코드로 분기하지 않고, 항목이 늘어도 이 파일을 고치지 않는다.
 *
 * **합계를 앱에서 내지 않는다.** 지급 총액·공제 총액·실수령액 전부 서버가 준 값이다.
 * 항목을 더해 맞춰보지도 않는다 (`CLAUDE.md` 3장).
 *
 * **확정된 것만 그린다.** 목록이 이미 걸러 주지만 주소로 바로 들어올 수 있어서 여기서도
 * 본다 (2026-09-01 확정).
 */
export default function PayslipScreen() {
  const { payrollId } = useLocalSearchParams<{ payrollId: string }>();
  const payroll = usePayroll(Number(payrollId));

  return (
    <>
      <Stack.Screen options={{ title: '급여명세서' }} />
      <ScrollView style={styles.flex}>
        <QueryState query={payroll} wrapState={(state) => <Section>{state}</Section>}>
          {(data) =>
            !data.confirmed ? (
              <Section>
                <Text style={styles.empty}>아직 확정되지 않은 달이에요. 확정되면 볼 수 있어요.</Text>
              </Section>
            ) : (
              <>
                <Section>
                  <Text style={styles.month}>{formatTargetYm(data.targetYm)}</Text>
                  <Text style={styles.amount}>{formatAmount(data.finalAmount)}원</Text>
                  <Text style={styles.note}>실제로 받는 금액이에요.</Text>
                  {/* 자동계산과 최종이 다르면 관리팀이 고친 것이다. 이유를 서버가 준다. */}
                  {data.modified && (
                    <Text style={styles.note}>
                      {data.modifyReason ?? '관리팀이 금액을 고쳤어요. 사유는 받지 못했어요.'}
                    </Text>
                  )}
                </Section>

                <SectionDivider />
                <Section>
                  <SectionTitle title="지급" />
                  <ItemLines items={data.items.filter((item) => item.kind === 'PAYMENT')} />
                  <ListRow label="지급 합계" value={`${formatAmount(data.totalPayment)}원`} />
                </Section>

                <SectionDivider />
                <Section>
                  <SectionTitle title="공제" />
                  <ItemLines items={data.items.filter((item) => item.kind === 'DEDUCTION')} />
                  <ListRow label="공제 합계" value={`${formatAmount(data.totalDeduction)}원`} />
                </Section>
              </>
            )
          }
        </QueryState>
      </ScrollView>
    </>
  );
}

/**
 * 명세서의 줄들. 서버가 준 차례를 그대로 둔다 — 금액순으로 다시 세우지 않는다.
 *
 * `basis`는 "왜 이 금액인가"에 답하는 값이라 줄 아래에 곁들인다. 되물을 일이 생기는
 * 자리가 여기다.
 */
function ItemLines({ items }: { items: PayrollItem[] }) {
  if (items.length === 0) return <Text style={styles.empty}>이 달에는 없어요.</Text>;

  return (
    <>
      {items.map((item) => (
        <View key={item.code}>
          <ListRow label={item.name} value={`${formatAmount(item.amount)}원`} />
          {(item.basis !== null || item.minutes !== null) && (
            <Text style={styles.basis}>
              {[
                item.minutes === null ? undefined : formatMinutes(item.minutes),
                item.basis ?? undefined,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  month: { ...typography.label, color: colors.textWeak },
  amount: { ...typography.headline, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak },
  empty: { ...typography.bodySmall, color: colors.textWeak },
  // 줄 아래에 붙는 근거. 값보다 흐리고 작아야 금액을 먼저 읽는다.
  basis: { ...typography.caption, color: colors.textWeak, marginBottom: spacing.tight },
});
