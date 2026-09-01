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
import {
  Button,
  MutationError,
  Section,
  SectionDivider,
  TextField,
  isCompleteTime,
  toServerTime,
} from '@/components';
import { LeaveBalanceSection } from '@/features/leave/LeaveBalanceSection';
import { LeaveCalendarSection } from '@/features/leave/LeaveCalendarSection';
import { LeaveRequestList } from '@/features/leave/LeaveRequestList';
import {
  EMPTY_CHOICE,
  LeaveTypeSection,
  type LeaveTypeChoice,
} from '@/features/leave/LeaveTypeSection';
import { halfDaySlot } from '@/features/leave/halfDay';
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
 */
export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => new Date());
  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  const [reason, setReason] = useState('');
  const [choice, setChoice] = useState<LeaveTypeChoice>(EMPTY_CHOICE);
  const create = useCreateRequest();

  // 이 화면은 연차 화면이라 연차휴가로 시작한다. 규칙이 아니라 이 화면의 기본값이다 —
  // 서버 목록에 없으면 아무것도 고르지 않은 채로 두고 사용자가 고른다.
  const types = useRequestTypes();
  const picked = choice.type ?? types.data?.find((each) => each.code === 'ANNUAL');
  const value: LeaveTypeChoice = { ...choice, type: picked };

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

    // 반차는 인사팀이 정한 시각, 그 밖의 needTime 은 사용자가 적은 시각을 싣는다.
    // 어느 쪽이든 여기서 시간을 세지 않는다 — 차감은 서버가 한다.
    const times = requestTimes(value);

    // 시각이 필요한 종류인데 덜 적었으면 보내지 않는다. 반쪽짜리로 보내면 서버가
    // 400을 돌려주는데, 그건 화면이 이미 아는 것이라 물어볼 일이 아니다.
    // 왜 안 나가는지는 아래 `hint`가 버튼 위에 적는다.
    if (needsTyped(value) && times === undefined) return;

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
          setChoice(EMPTY_CHOICE);
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
            <LeaveRequestList />
          </Section>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
          <MutationError mutation={create} />
          {!create.error && hint(selected.length, value) !== undefined && (
            <Text style={styles.hint}>{hint(selected.length, value)}</Text>
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
 * 곧 아직 안 채운 칸만 짚는다. 시작이 끝보다 늦은지도 서버가 본다.
 */
function hint(dayCount: number, value: LeaveTypeChoice): string | undefined {
  if (dayCount === 0) return '달력에서 날짜를 골라주세요.';
  if (!value.type) return '무엇을 신청하는지 골라주세요.';
  if (needsTyped(value) && requestTimes(value) === undefined) {
    return '시작 시각과 종료 시각을 적어주세요.';
  }
  return undefined;
}

/** 시각을 사용자가 직접 적어야 하는 종류인가. 반차는 값이 정해져 있어 여기 들지 않는다 */
function needsTyped(value: LeaveTypeChoice): boolean {
  return value.type?.needTime === true && !value.type.halfDay;
}

/**
 * 신청에 실을 시각. 필요 없는 종류면 `undefined`다.
 *
 * 직접 적는 종류인데 아직 덜 적었으면 `undefined`를 돌려준다 — 반쪽짜리 시각을
 * 보내지 않는다.
 */
function requestTimes(value: LeaveTypeChoice): { startTime: string; endTime: string } | undefined {
  if (value.type?.halfDay) {
    const slot = halfDaySlot(value.half);
    return { startTime: slot.startTime, endTime: slot.endTime };
  }
  if (!needsTyped(value)) return undefined;
  if (!isCompleteTime(value.startTime) || !isCompleteTime(value.endTime)) return undefined;
  return { startTime: toServerTime(value.startTime), endTime: toServerTime(value.endTime) };
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
