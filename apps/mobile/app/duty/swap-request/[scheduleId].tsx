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
  SelectSheet,
  TextField,
} from '@/components';
import { useRequestSwap, useSwapCandidates } from '@/features/duty/api';
import { dutyDateText, rosterText } from '@/features/duty/labels';

/**
 * S-503 — 내 당직을 대신 서 달라고 부탁한다.
 *
 * 이 화면이 전달할 단 하나의 메시지 — **누구에게 부탁할 것인가.**
 *
 * **8-28부터 막혀 있던 화면이다.** 신청에 `targetId`가 필요한데 일반 직원은 후보를
 * 알아낼 방법이 없었다 — 명단 대상자도 당직표 전체도 403이었다. 9-02에 서버가
 * `GET /duty/schedules/{scheduleId}/swap-candidates`를 본인용으로 열어 주면서 풀렸다.
 *
 * **후보를 앱에서 더 추리지 않는다.** 명단 안인지, 그날 이미 배정됐는지는 서버가 보고
 * 걸러 준 결과가 목록이다. 부탁이 막히는 이유도 서버 문구를 그대로 옮긴다 —
 * 버튼에 `disabled`를 주지 않는다 (`DESIGN_SYSTEM.md` 5장).
 *
 * **이미 교체 요청이 걸린 배정도 들어올 수 있게 뒀다.** 중복 신청은 서버가 막는다.
 * 앱이 미리 막으면 왜 못 누르는지 알 수 없고, 그 판정은 앱이 아는 것이 아니다.
 *
 * 배정의 날짜·명단은 목록에서 넘겨받는다. **단건 조회 API가 없다** —
 * `GET /duty/schedules/{employeeId}`는 기간으로만 부를 수 있고, 이 화면이 달을 다시
 * 정해서 부르면 목록과 다른 값을 볼 수 있다. 개인정보는 넘기지 않는다 (`CLAUDE.md` 2장).
 */
export default function DutySwapRequestScreen() {
  const { scheduleId, dutyDate, rosterName, slotCode } = useLocalSearchParams<{
    scheduleId: string;
    dutyDate: string;
    rosterName?: string;
    slotCode?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [targetId, setTargetId] = useState<number>();
  const [reason, setReason] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const candidates = useSwapCandidates(Number(scheduleId));
  const request = useRequestSwap();

  const picked = candidates.data?.find((each) => each.employeeId === targetId);

  function submit() {
    // 고르지 않았으면 보내지 않는다. 왜 안 나가는지는 아래 `hint`가 버튼 위에 적는다.
    if (targetId === undefined) return;

    request.mutate(
      { scheduleId: Number(scheduleId), targetId, reason: reason.trim() || undefined },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '교체 부탁하기' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
          <Section>
            <Text style={styles.headline}>이 당직을 대신 서 줄 사람을 골라주세요</Text>
            <Text style={styles.note}>
              부탁받은 사람이 24시간 안에 답하지 않으면 당직은 그대로 유지돼요.
            </Text>
          </Section>

          <SectionDivider />

          <Section>
            <SectionTitle title="바꿀 당직" />
            <ListRow label="날짜" value={dutyDateText(dutyDate)} />
            {/* 명단 이름도 슬롯도 없을 수 있다. 라우터 파라미터는 빈 문자열로 온다 */}
            <ListRow label="명단" value={rosterText(rosterName || null, slotCode || null)} />
          </Section>

          <SectionDivider />

          <Section>
            <SectionTitle title="부탁할 사람" />
            <QueryState
              query={candidates}
              empty="지금 대신 서 줄 수 있는 사람이 없어요. 같은 명단에 있는 사람에게만 부탁할 수 있어요."
            >
              {() => (
                <ListRow
                  label="동료"
                  variant="nav"
                  value={picked === undefined ? undefined : personName(picked.name)}
                  placeholder="눌러서 고르기"
                  onPress={() => setPickerOpen(true)}
                />
              )}
            </QueryState>
          </Section>

          <SectionDivider />

          <Section>
            {/* 한계가 명세에 없다. 답하는 화면의 「한마디」와 같은 값으로 맞춰 뒀다 */}
            <TextField label="사유" value={reason} onChangeText={setReason} maxLength={200} />
            <Text style={styles.note}>안 적어도 부탁할 수 있어요.</Text>
          </Section>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
          <MutationError mutation={request} />
          {!request.error && targetId === undefined && (
            <Text style={styles.hint}>부탁할 사람을 골라주세요.</Text>
          )}
          <Button label="부탁하기" loading={request.isPending} onPress={submit} />
        </View>
      </KeyboardAvoidingView>

      <SelectSheet
        open={pickerOpen}
        title="누구에게 부탁할까요"
        options={(candidates.data ?? []).map((each) => ({
          value: each.employeeId,
          label: personName(each.name),
        }))}
        selected={targetId}
        onSelect={setTargetId}
        onClose={() => setPickerOpen(false)}
        empty="지금 대신 서 줄 수 있는 사람이 없어요."
      />
    </>
  );
}

/**
 * 후보 응답에는 `employeeId`와 `name`만 온다. 부서가 실려 오지 않아 **동명이인을
 * 구분할 수가 없다** — `SelectSheet`의 `hint` 자리를 비워 둔 이유다.
 */
function personName(name: string | null): string {
  return name === null ? '이름을 못 받았어요' : `${name}님`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  headline: { ...typography.headline, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
  hint: { ...typography.label, color: colors.textWeak, marginBottom: spacing.tight },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
