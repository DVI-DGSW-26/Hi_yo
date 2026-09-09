import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@hr/tokens';
import { Button, MutationError, Section, SectionDivider, TextField } from '@/components';
import { LeaveBalanceSection } from '@/features/leave/LeaveBalanceSection';
import { LeaveCalendarSection } from '@/features/leave/LeaveCalendarSection';
import { LeavePromotionSection } from '@/features/leave/LeavePromotionSection';
import { LeaveRequestList } from '@/features/leave/LeaveRequestList';
import { LeaveSignatureSection } from '@/features/leave/LeaveSignatureSection';
import {
  EMPTY_CHOICE,
  LeaveTypeSection,
  type LeaveTypeChoice,
} from '@/features/leave/LeaveTypeSection';
import {
  needsTime,
  nextRange,
  requestTimes,
  selectedDates,
  submitHint,
  type DateRange,
} from '@/features/leave/requestDraft';
import { useCreateRequest, useRequestTypes } from '@/features/leave/api';

/**
 * S-301 연차 현황 및 신청
 *
 * 이 화면이 전달할 단 하나의 메시지 — **얼마 남았고, 언제 쓸 수 있는가.**
 *
 * 잔여 초과 판정은 서버가 한다. 버튼은 항상 눌리고 막힌 이유는 인라인 에러로 알린다
 * (docs/00_문서_인덱스.md — S-301 잔여연차 초과 신청 차단, 2026-08-24 확정).
 * `Button`에 `disabled`를 주지 않는다.
 *
 * 차감 일수도 서버가 계산한다. 주말·공휴일을 앱에서 빼지 않는다.
 *
 * **종류를 고를 수 있다** (2026-09-01). 그전에는 `ANNUAL`이 박혀 있어 연차만 낼 수 있었다.
 * 반차가 풀린 것은 인사팀이 시각을 확정해 준 덕이다 — API가 `startTime`·`endTime`을
 * 요구하는데 오전·오후가 몇 시부터인지가 정해져 있지 않았다.
 *
 * 시각을 직접 적는 종류(외출·조퇴)도 낼 수 있다. `TimeField`를 만들었다.
 *
 * **기간·시각·안내 문구를 판단하는 부분은 `requestDraft.ts`에 있다.** 이 파일은 무엇을
 * 어떤 차례로 보여줄지만 안다.
 *
 * **연차촉진 통보를 맨 위에 둔다** (2026-09-09). 마감이 걸린 서류라 잔여보다 먼저 본다.
 * 받은 통보가 없으면 그 자리는 통째로 사라진다 — 대부분의 직원에게는 통보가 없다.
 */
export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => new Date());
  const [range, setRange] = useState<DateRange>({});
  const [reason, setReason] = useState('');
  const [choice, setChoice] = useState<LeaveTypeChoice>(EMPTY_CHOICE);
  const [signature, setSignature] = useState('');
  const create = useCreateRequest();

  // 이 화면은 연차 화면이라 연차휴가로 시작한다. 규칙이 아니라 이 화면의 기본값이다 —
  // 서버 목록에 없으면 아무것도 고르지 않은 채로 두고 사용자가 고른다.
  const types = useRequestTypes();
  const picked = choice.type ?? types.data?.find((each) => each.code === 'ANNUAL');
  const value: LeaveTypeChoice = { ...choice, type: picked };

  const selected = selectedDates(range);
  const hint = submitHint(selected.length, value, signature);

  function submit() {
    if (!range.start || !picked) return;

    // 반차는 인사팀이 정한 시각, 그 밖의 needTime 은 사용자가 적은 시각을 싣는다.
    // 어느 쪽이든 여기서 시간을 세지 않는다 — 차감은 서버가 한다.
    const times = requestTimes(value);

    // 시각이 필요한 종류인데 덜 적었으면 보내지 않는다. 반쪽짜리로 보내면 서버가
    // 400을 돌려주는데, 그건 화면이 이미 아는 것이라 물어볼 일이 아니다.
    // 왜 안 나가는지는 `hint`가 버튼 위에 적는다.
    if (needsTime(value) && times === undefined) return;

    // 종이 서식의 「작성」 칸이라 화면에서 필수로 받는다. 서버에서는 선택이다.
    if (!signature) return;

    create.mutate(
      {
        typeCode: picked.code,
        startDate: range.start,
        endDate: range.end ?? range.start,
        startTime: times?.startTime,
        endTime: times?.endTime,
        reason: reason.trim() || undefined,
        signatureImage: signature,
      },
      {
        onSuccess: () => {
          setRange({});
          setReason('');
          setChoice(EMPTY_CHOICE);
          setSignature('');
        },
      },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '연차' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
          <LeavePromotionSection />
          <Section>
            <LeaveBalanceSection />
          </Section>
          <SectionDivider />
          <Section>
            <LeaveCalendarSection
              month={month}
              onChangeMonth={setMonth}
              selected={selected}
              onPressDate={(iso) => setRange((prev) => nextRange(prev, iso))}
            />
          </Section>
          <SectionDivider />
          <Section>
            <LeaveTypeSection value={value} onChange={setChoice} />
          </Section>
          <SectionDivider />
          <Section>
            {/* 255는 서버가 받는 한계다 (LeaveRequestCreateRequest). 200에서 잘리고 있었다. */}
            <TextField label="사유" value={reason} onChangeText={setReason} maxLength={255} />
            <Text style={styles.note}>안 적어도 낼 수 있어요.</Text>
          </Section>
          <SectionDivider />
          <Section>
            <LeaveSignatureSection value={signature} onChange={setSignature} />
          </Section>
          <SectionDivider />
          <Section>
            <LeaveRequestList />
          </Section>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
          <MutationError mutation={create} />
          {!create.error && hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
          <Button label="신청하기" loading={create.isPending} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  note: { ...typography.label, color: colors.textWeak },
  hint: { ...typography.label, color: colors.textWeak, marginBottom: spacing.tight },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
