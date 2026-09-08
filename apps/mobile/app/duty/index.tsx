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
 * **교체를 부탁하는 쪽이 열렸다** (2026-09-07). 신청에 필요한 `targetId`를 고를 방법이
 * 없어 8-28부터 확인과 응답까지만 만들어 뒀는데, 9-02에 서버가 후보 조회를 본인용으로
 * 열어 주면서 화면 이름대로 "확인·교체 신청"이 전부 된다.
 *
 * 내 당직 한 줄을 누르면 부탁하는 화면으로 간다. **배정의 날짜·명단을 같이 넘긴다** —
 * 단건 조회 API가 없어서다. 이름 같은 개인정보는 넘기지 않는다 (`CLAUDE.md` 2장).
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
          <DutyScheduleList
            schedules={schedules}
            onPressSchedule={(schedule) =>
              router.push({
                pathname: '/duty/swap-request/[scheduleId]',
                params: {
                  scheduleId: schedule.id,
                  dutyDate: schedule.dutyDate,
                  rosterName: schedule.rosterName ?? '',
                  slotCode: schedule.slotCode ?? '',
                },
              })
            }
          />
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
