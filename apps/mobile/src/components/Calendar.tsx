import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { addDays, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { colors, typography } from '@hr/tokens';

/** 날짜 아래에 찍히는 점의 종류. 화면마다 의미가 다르므로 이름은 중립적으로 둔다. */
export type MarkerType = 'full' | 'half' | 'duty' | 'group';

interface Props {
  /** 표시할 달. 아무 날짜나 넣어도 그 달 전체를 그린다. */
  month: Date;
  /** { '2026-10-14': 'full' } 형태. 서버가 준 데이터를 그대로 넣는다. */
  markers?: Record<string, MarkerType>;
  /** 선택된 날짜 목록 (yyyy-MM-dd) */
  selected?: string[];
  /** 누를 수 없는 날짜. 잔여연차 초과 등의 판단은 화면에서 한다. */
  isDisabled?: (isoDate: string) => boolean;
  onPressDate?: (isoDate: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function Calendar({ month, markers = {}, selected = [], isDisabled, onPressDate }: Props) {
  const weeks = useMemo(() => buildWeeks(month), [month]);

  return (
    <View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={d} style={[styles.weekday, i === 0 && styles.sunday]}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0]!.toISOString()} style={styles.weekRow}>
          {week.map((date, i) => {
            const iso = format(date, 'yyyy-MM-dd');
            const outside = !isSameMonth(date, month);
            const isSelected = selected.includes(iso);
            const disabled = isDisabled?.(iso) ?? false;
            const marker = markers[iso];

            return (
              <Pressable
                key={iso}
                disabled={outside || disabled || !onPressDate}
                onPress={() => onPressDate?.(iso)}
                accessibilityRole="button"
                accessibilityLabel={format(date, 'M월 d일')}
                accessibilityState={{ selected: isSelected, disabled }}
                style={styles.cell}
              >
                <View style={[styles.dayWrap, isSelected && !outside && styles.daySelected]}>
                  {/* 다른 달 날짜는 아예 그리지 않는다. 투명색으로 숨기면 시스템의
                      고대비 글꼴 설정이 색을 덮어써서 그대로 드러난다. 칸은 dayWrap
                      크기로 남으므로 격자는 어긋나지 않는다. */}
                  {outside ? null : (
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={[
                        styles.day,
                        i === 0 && styles.sunday,
                        disabled && styles.disabled,
                        isSelected && styles.daySelectedText,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  )}
                </View>
                <View style={styles.dotSlot}>
                  {marker && !outside && !isSelected ? (
                    <View style={[styles.dot, marker === 'half' && styles.dotHalf]} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function buildWeeks(month: Date): Date[][] {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const last = endOfMonth(month);
  const weeks: Date[][] = [];
  let cursor = first;

  while (cursor <= last || weeks.length < 5) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    weeks.push(week);
    cursor = addDays(cursor, 7);
    if (weeks.length >= 6) break;
  }
  return weeks;
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.textWeak,
    paddingBottom: 8,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.primary },
  // 날짜는 36x36 고정 칸 안에 들어간다. lineHeight를 고정하면 글꼴 확대 시
  // fontSize는 maxFontSizeMultiplier 1.3에서 멈추는데 lineHeight에는 그 상한이
  // 적용되지 않아 계속 커진다. 칸을 넘기므로 lineHeight만 뺀다.
  day: { ...typography.bodySmall, lineHeight: undefined, color: colors.textStrong },
  daySelectedText: { color: colors.white, fontWeight: '500' },
  sunday: { color: colors.textWeak },
  disabled: { color: colors.textDisabled },
  dotSlot: { height: 10, justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  dotHalf: { backgroundColor: colors.textWeak },
});
