import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@hr/tokens';
import {
  Button,
  ListRow,
  MutationError,
  QueryState,
  Section,
  SectionDivider,
  SectionTitle,
  TextField,
} from '@/components';
import { useDecideSwap, useInboxSwap } from '@/features/duty/api';
import { dutyDateText, rosterText } from '@/features/duty/labels';
import { formatServerDateTime } from '@/lib/format';

/**
 * S-503 — 나에게 온 당직 교체 부탁에 답한다.
 *
 * 이 화면이 전달할 단 하나의 메시지 — **내가 대신 서 줄 수 있는가.**
 *
 * **화면 인벤토리 25개에 없던 화면이다.** 명세서 흐름이 "상대방 동의"를 필수로 두고
 * 알림도 상대방에게 가는데 동의를 누를 데가 없었다. S-503 안에 두기로 했다
 * (`docs/00_문서_인덱스.md` — S-503 교체 동의 화면, 2026-08-28 확정).
 *
 * 동의하면 그 자리에서 담당자가 바뀐다. 24시간 안에 답하지 않으면 자동으로 반려되고
 * 원 담당자가 그대로 간다 — 그래서 마감 시각을 값으로 보여준다.
 */
export default function DutySwapDecisionScreen() {
  const { swapId } = useLocalSearchParams<{ swapId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [comment, setComment] = useState('');

  const swap = useInboxSwap(Number(swapId));
  const decide = useDecideSwap();

  function answer(agreed: boolean) {
    decide.mutate(
      { swapId: Number(swapId), agreed, comment: comment.trim() || undefined },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '교체 부탁' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
          <QueryState query={swap} wrapState={(state) => <Section>{state}</Section>}>
            {(data) =>
              data === null ? (
                <Section>
                  <Text style={styles.headline}>이미 답한 부탁이에요</Text>
                  <Text style={styles.note}>
                    답을 마쳤거나 시간이 지나 자동으로 반려됐어요.
                  </Text>
                </Section>
              ) : (
                <>
                  <Section>
                    <Text style={styles.headline}>
                      {data.requesterName ?? '동료'}님이 당직을 바꿔달라고 했어요
                    </Text>
                    {data.expiresAt !== null && (
                      <Text style={styles.note}>
                        {formatServerDateTime(data.expiresAt, 'M월 d일 HH:mm')}까지 답하지 않으면
                        그대로 유지돼요.
                      </Text>
                    )}
                  </Section>
                  <SectionDivider />
                  <Section>
                    <SectionTitle title="바꿀 당직" />
                    <ListRow label="날짜" value={dutyDateText(data.dutyDate)} />
                    <ListRow
                      label="명단"
                      value={rosterText(data.rosterName, data.slotCode)}
                    />
                    <ListRow
                      label="부탁한 사람"
                      value={`${data.requesterName ?? '동료'}님`}
                    />
                    <ListRow
                      label="사유"
                      value={data.reason ?? undefined}
                      placeholder="안 적었어요"
                    />
                  </Section>
                  <SectionDivider />
                  <Section>
                    <TextField
                      label="한마디"
                      value={comment}
                      onChangeText={setComment}
                      maxLength={200}
                    />
                    <Text style={styles.note}>안 적어도 답할 수 있어요.</Text>
                  </Section>
                </>
              )
            }
          </QueryState>
        </ScrollView>

        {swap.data && (
          <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
            <MutationError mutation={decide} />
            <View style={styles.buttons}>
              <View style={styles.button}>
                <Button
                  label="거절하기"
                  variant="secondary"
                  loading={decide.isPending}
                  onPress={() => answer(false)}
                />
              </View>
              <View style={styles.button}>
                <Button
                  label="바꿔주기"
                  loading={decide.isPending}
                  onPress={() => answer(true)}
                />
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  headline: { ...typography.headline, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
  buttons: { flexDirection: 'row', gap: spacing.rowGap },
  button: { flex: 1 },
});
