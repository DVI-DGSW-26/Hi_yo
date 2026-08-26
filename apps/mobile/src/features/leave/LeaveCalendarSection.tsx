import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';
import { Button, Calendar, SectionTitle, type MarkerType } from '@/components';
import { useLeaveCalendar } from './api';

interface Props {
  month: Date;
  onChangeMonth: (month: Date) => void;
  /** 선택된 날짜 (yyyy-MM-dd). 시작일~종료일 사이를 채운 배열이다 */
  selected: string[];
  onPressDate: (isoDate: string) => void;
}

/**
 * 연차 달력.
 *
 * 점은 서버가 준 달력 데이터를 그대로 찍는다. 앱에서 연차를 세거나 합치지 않는다.
 *
 * **지난 날짜를 막지 않는다.** 사후 신청을 받는지는 도메인 규칙이고 문서에 없다.
 * 앱이 미리 막으면 규칙이 다를 때 조용히 틀린다. S-301 확정 결정과 같은 원칙으로,
 * 고르는 것은 열어두고 판정은 서버가 한다.
 */
export function LeaveCalendarSection({ month, onChangeMonth, selected, onPressDate }: Props) {
  const from = format(startOfMonth(month), 'yyyy-MM-dd');
  const to = format(endOfMonth(month), 'yyyy-MM-dd');
  const { data, isPending, error } = useLeaveCalendar(from, to);

  return (
    <View>
      <SectionTitle title={format(month, 'yyyy년 M월')} />

      {isPending ? (
        <ActivityIndicator color={colors.textDisabled} />
      ) : error ? (
        <Text style={styles.error}>{error.message}</Text>
      ) : (
        <Calendar
          month={month}
          markers={toMarkers(data)}
          selected={selected}
          onPressDate={onPressDate}
        />
      )}

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
 * 서버의 신청 종류를 달력 점으로 옮긴다.
 *
 * 반차만 따로 구분하고 나머지는 전부 `full`이다. 단체연차(`group`)는 달력 응답에 그걸
 * 가릴 값이 없어서 쓰지 않는다.
 */
function toMarkers(entries: { date: string; typeCode: string }[]): Record<string, MarkerType> {
  const markers: Record<string, MarkerType> = {};
  for (const entry of entries) {
    markers[entry.date] = entry.typeCode === 'HALF_DAY' ? 'half' : 'full';
  }
  return markers;
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    marginTop: spacing.rowGap,
    gap: spacing.rowGap,
  },
  navButton: { flex: 1 },
  error: { ...typography.bodySmall, color: colors.danger },
});
