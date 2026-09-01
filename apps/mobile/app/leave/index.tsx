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
import { Button, MutationError, Section, SectionDivider, TextField } from '@/components';
import { LeaveBalanceSection } from '@/features/leave/LeaveBalanceSection';
import { LeaveCalendarSection } from '@/features/leave/LeaveCalendarSection';
import { LeaveRequestList } from '@/features/leave/LeaveRequestList';
import { LeaveTypeSection } from '@/features/leave/LeaveTypeSection';
import { halfDaySlot, type HalfDaySlot } from '@/features/leave/halfDay';
import { useCreateRequest, useRequestTypes, type RequestType } from '@/features/leave/api';

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
 */
export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => new Date());
  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  const [reason, setReason] = useState('');
  const [type, setType] = useState<RequestType>();
  const [half, setHalf] = useState<HalfDaySlot>('AM');
  const create = useCreateRequest();

  // 이 화면은 연차 화면이라 연차휴가로 시작한다. 규칙이 아니라 이 화면의 기본값이다 —
  // 서버 목록에 없으면 아무것도 고르지 않은 채로 두고 사용자가 고른다.
  const types = useRequestTypes();
  const picked = type ?? types.data?.find((each) => each.code === 'ANNUAL');

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
    if (!range.start || !picked) return;

    // 반차 시각은 인사팀이 정한 값을 그대로 싣는다. 여기서 시간을 세지 않는다.
    const times = picked.halfDay ? halfDaySlot(half) : undefined;

    create.mutate(
      {
        typeCode: picked.code,
        startDate: range.start,
        endDate: range.end ?? range.start,
        startTime: times?.startTime,
        endTime: times?.endTime,
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
            <LeaveTypeSection
              selected={picked}
              onSelect={setType}
              half={half}
              onSelectHalf={setHalf}
            />
          </Section>
          <SectionDivider />
          <Section>
            {/* 255는 서버가 받는 한계다 (LeaveRequestCreateRequest). 200에서 잘리고 있었다. */}
            <TextField label="사유" value={reason} onChangeText={setReason} maxLength={255} />
            <Text style={styles.note}>안 적어도 낼 수 있어요.</Text>
          </Section>
          <SectionDivider />
          <Section>
            <LeaveRequestList />
          </Section>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
          <MutationError mutation={create} />
          {!create.error && hint(selected.length, picked) !== undefined && (
            <Text style={styles.hint}>{hint(selected.length, picked)}</Text>
          )}
          <Button label="신청하기" loading={create.isPending} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/**
 * 아직 낼 수 없는 이유. 버튼은 항상 눌리므로(확정 결정) 막힌 이유를 이 자리에 적는다.
 *
 * 잔여 초과처럼 **서버가 판단하는 것은 여기서 말하지 않는다.** 화면이 아는 것,
 * 곧 아직 안 고른 칸만 짚는다.
 */
function hint(dayCount: number, type: RequestType | undefined): string | undefined {
  if (dayCount === 0) return '달력에서 날짜를 골라주세요.';
  if (!type) return '무엇을 신청하는지 골라주세요.';
  return undefined;
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
  hint: { ...typography.label, color: colors.textWeak, marginBottom: spacing.tight },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
