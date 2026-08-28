import { endOfMonth, format, startOfMonth } from 'date-fns';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '@hr/tokens';
import { Section, SectionDivider } from '@/components';
import { DutyCalendarSection } from '@/features/duty/DutyCalendarSection';
import { DutyScheduleList } from '@/features/duty/DutyScheduleList';
import { DutySentSwapList } from '@/features/duty/DutySentSwapList';
import { DutySwapInbox } from '@/features/duty/DutySwapInbox';
import { useMyDutySchedules, useSentSwaps, useSwapInbox } from '@/features/duty/api';
import { useMe } from '@/features/employees/api';

/**
 * S-503 당직 스케줄 확인 · 교체 신청
 *
 * 이 화면이 전달할 단 하나의 메시지 — **내 당직이 언제고, 지금 내가 답할 것이 있는가.**
 *
 * 그래서 답할 것을 맨 위에 둔다. 상대는 24시간 안의 답을 기다리고 있고, 그 시간이 지나면
 * 자동으로 반려돼 원 담당자가 그대로 간다. 내 일정을 먼저 보여주면 남의 마감을 놓친다.
 *
 * **교체를 부탁하는 쪽은 만들지 않았다.** 신청에 `targetId`가 필요한데 일반 직원은 후보를
 * 알아낼 수 없다 — 명단 대상자도 당직표 전체도 403이다 (2026-08-28 실호출 확인).
 * 화면 이름이 "확인·교체 신청"이지만 지금 만들 수 있는 것은 확인과 응답까지다
 * (`docs/00_문서_인덱스.md` — 교체 상대 후보를 본인이 볼 수 없다).
 */
export default function DutyScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date());

  const me = useMe();
  const employeeId = me.data?.summary.id;
  const from = format(startOfMonth(month), 'yyyy-MM-dd');
  const to = format(endOfMonth(month), 'yyyy-MM-dd');

  const schedules = useMyDutySchedules(employeeId, from, to);
  const inbox = useSwapInbox();
  const sent = useSentSwaps();

  return (
    <>
      <Stack.Screen options={{ title: '당직' }} />
      <ScrollView style={styles.flex}>
        <Section>
          <DutySwapInbox
            swaps={inbox}
            onPressSwap={(swap) => router.push(`/duty/swap/${swap.id}`)}
          />
        </Section>
        <SectionDivider />
        <Section>
          <DutyCalendarSection month={month} onChangeMonth={setMonth} schedules={schedules} />
        </Section>
        <SectionDivider />
        <Section>
          <DutyScheduleList schedules={schedules} />
        </Section>
        <SectionDivider />
        <Section>
          <DutySentSwapList swaps={sent} />
        </Section>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
});
