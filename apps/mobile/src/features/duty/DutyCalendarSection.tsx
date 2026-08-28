import { addMonths, subMonths } from 'date-fns';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@hr/tokens';
import { Button, Calendar, QueryState, SectionTitle, type MarkerType } from '@/components';
import { formatServerDate } from '@/lib/format';
import type { DutySchedule } from './api';

interface Props {
  month: Date;
  onChangeMonth: (month: Date) => void;
  /** 그 달의 내 배정. 화면이 이미 부른 것을 그대로 받는다 — 같은 걸 두 번 부르지 않는다 */
  schedules: { isPending: boolean; error: Error | null; data: DutySchedule[] | undefined };
}

/**
 * 내 당직 달력.
 *
 * 점은 서버가 준 배정을 그대로 찍는다. 앞으로 언제 당직인지가 한눈에 보이는 것이
 * 이 섹션의 전부다 — 누르는 기능을 두지 않는다. 교체 신청은 아래 목록에서 한다.
 * 달력에서도 고르게 하면 같은 일을 두 곳에서 하게 되고, 경비교대는 하루에 두 건이라
 * 날짜만으로는 어느 배정인지 정해지지 않는다.
 */
export function DutyCalendarSection({ month, onChangeMonth, schedules }: Props) {
  return (
    <View>
      <SectionTitle title={`${formatServerDate(monthIso(month), 'yyyy년 M월')}`} />

      {/* 당직이 없는 달은 정상이다. 빈 상태를 두지 않고 빈 달력을 그대로 그린다 */}
      <QueryState query={schedules}>
        {(data) => <Calendar month={month} markers={toMarkers(data)} />}
      </QueryState>

      <View style={styles.monthNav}>
        <View style={styles.navButton}>
          <Button
            label="이전 달 보기"
            variant="secondary"
            size="inline"
            onPress={() => onChangeMonth(subMonths(month, 1))}
          />
        </View>
        <View style={styles.navButton}>
          <Button
            label="다음 달 보기"
            variant="secondary"
            size="inline"
            onPress={() => onChangeMonth(addMonths(month, 1))}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * 배정을 달력 점으로 옮긴다. 전부 `duty`다 —
 * 경비교대는 같은 날짜에 두 건이 와도 점은 하나로 겹친다. 몇 건인지는 아래 목록이 보여준다.
 */
function toMarkers(schedules: DutySchedule[]): Record<string, MarkerType> {
  const markers: Record<string, MarkerType> = {};
  for (const schedule of schedules) {
    markers[schedule.dutyDate] = 'duty';
  }
  return markers;
}

/** 달 제목도 KST로 찍는다. 기기 타임존을 따라가면 월말·월초에 한 달이 밀린다 */
function monthIso(month: Date): string {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`;
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    marginTop: spacing.rowGap,
    gap: spacing.rowGap,
  },
  navButton: { flex: 1 },
});
