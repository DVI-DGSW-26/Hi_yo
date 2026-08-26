import { eachDayOfInterval, format, parseISO } from 'date-fns';
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
import { Button, Section, SectionDivider, TextField } from '@/components';
import { LeaveBalanceSection } from '@/features/leave/LeaveBalanceSection';
import { LeaveCalendarSection } from '@/features/leave/LeaveCalendarSection';
import { LeaveRequestList } from '@/features/leave/LeaveRequestList';
import { useCreateRequest } from '@/features/leave/api';

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
 */
export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => new Date());
  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  const [reason, setReason] = useState('');
  const create = useCreateRequest();

  const selected = selectedDates(range);

  function handlePressDate(iso: string) {
    setRange((prev) => {
      // 시작일이 없거나 이미 기간이 잡혔으면 새로 시작한다.
      if (!prev.start || prev.end) return { start: iso };
      // 시작일보다 앞을 누르면 그 날이 새 시작일이 된다.
      if (iso < prev.start) return { start: iso };
      return { start: prev.start, end: iso };
    });
  }

  function submit() {
    if (!range.start) return;
    create.mutate(
      {
        typeCode: 'ANNUAL',
        startDate: range.start,
        endDate: range.end ?? range.start,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          setRange({});
          setReason('');
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
          <Section>
            <LeaveBalanceSection />
          </Section>
          <SectionDivider />
          <Section>
            <LeaveCalendarSection
              month={month}
              onChangeMonth={setMonth}
              selected={selected}
              onPressDate={handlePressDate}
            />
          </Section>
          <SectionDivider />
          <Section>
            <TextField label="사유" value={reason} onChangeText={setReason} maxLength={200} />
            <Text style={styles.note}>안 적어도 낼 수 있어요.</Text>
          </Section>
          <SectionDivider />
          <Section>
            <LeaveRequestList />
          </Section>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
          {create.error && <Text style={styles.error}>{create.error.message}</Text>}
          {!create.error && selected.length === 0 && (
            <Text style={styles.hint}>달력에서 날짜를 골라주세요.</Text>
          )}
          <Button label="신청하기" loading={create.isPending} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/** 시작일~종료일 사이를 채운다. 며칠이 깎이는지는 여기서 세지 않는다 — 서버가 센다. */
function selectedDates(range: { start?: string; end?: string }): string[] {
  if (!range.start) return [];
  if (!range.end) return [range.start];
  return eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) }).map((date) =>
    format(date, 'yyyy-MM-dd'),
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  note: { ...typography.label, color: colors.textWeak },
  hint: { ...typography.label, color: colors.textWeak, marginBottom: 8 },
  error: { ...typography.bodySmall, color: colors.danger, marginBottom: 8 },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
