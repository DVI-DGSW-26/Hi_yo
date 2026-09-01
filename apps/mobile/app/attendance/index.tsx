import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';
import {
  Button,
  ListRow,
  QueryState,
  Section,
  SectionDivider,
  SectionTitle,
  StatusText,
} from '@/components';
import { useAuthMe } from '@/features/auth/api';
import { alertLevelText, alertLevelTone, weekdayText } from '@/features/attendance/labels';
import {
  useMyAttendance,
  useMyWeeklyWork,
  type AttendanceDay,
} from '@/features/attendance/api';
import { formatMinutes, formatServerDate, formatServerDateTime } from '@/lib/format';

/**
 * S-501 내 근태 현황 (52시간 포함)
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이번 달 얼마나 일했고, 52시간이 얼마나 남았는가.**
 *
 * **하루하루를 다 보여준다. 기본은 이번 달이다** (2026-09-01 기획 확정).
 *
 * **시간을 화면에서 만들지 않는다.** 출퇴근 시각조차 세콤 태그에서 서버가 도출한 값이고,
 * 합계도 서버가 낸다 — 스펙이 "프런트가 더하면 미판정 날짜를 어떻게 셀지가 화면마다
 * 달라져 값이 갈린다"고 적고 있다 (`CLAUDE.md` 3장).
 *
 * **52시간을 게이지로 그리지 않았다.** `Gauge`는 0~1 비율을 받는데 **서버가 비율을 주지
 * 않는다.** 앱에서 52시간을 나눠 만들면 산정 기준을 앱이 정하는 것이 된다 — 그건 추측
 * 금지 항목이다. 관리팀 A-503과 같이 분과 단계 문구로 둔다.
 *
 * **분 필드 열둘 중 일곱만 뒀다.** A-501에서 고른 것과 같다 — 기본·법정·휴일·휴일연장·
 * 주휴는 급여대장이 읽는 값이다.
 */
export default function AttendanceScreen() {
  const [month, setMonth] = useState(() => new Date());
  const me = useAuthMe();

  const from = format(startOfMonth(month), 'yyyy-MM-dd');
  const to = format(endOfMonth(month), 'yyyy-MM-dd');

  const period = useMyAttendance(me.data?.employeeId, from, to);
  const weekly = useMyWeeklyWork(me.data?.employeeId);

  return (
    <>
      <Stack.Screen options={{ title: '내 근태' }} />
      <ScrollView style={styles.flex}>
        <Section>
          <SectionTitle title="주 52시간" />
          {/* 몇 주를 보여줄지 화면이 정하지 않는다. 서버가 준 만큼 그린다. */}
          <QueryState query={weekly} empty="아직 집계된 주가 없어요.">
            {(weeks) => (
              <>
                {weeks.map((week) => (
                  <ListRow
                    key={week.weekStartDate}
                    label={`${formatServerDate(week.weekStartDate, 'M.d')} ~ ${formatServerDate(week.weekEndDate, 'M.d')}`}
                    right={
                      <View style={styles.weekRight}>
                        <Text style={styles.weekMinutes}>{formatMinutes(week.totalMinutes)}</Text>
                        <StatusText
                          label={alertLevelText(week.alertLevel)}
                          tone={alertLevelTone(week.alertLevel)}
                        />
                      </View>
                    }
                  />
                ))}
              </>
            )}
          </QueryState>
        </Section>

        <SectionDivider />

        <Section>
          <SectionTitle title={format(month, 'yyyy년 M월')} />
          <QueryState query={period}>
            {(data) => (
              <>
                <ListRow label="근무한 날" value={`${data.totals.workedDays}일`} />
                <ListRow label="총 근로" value={formatMinutes(data.totals.payrollMinutes)} />
                <ListRow label="연장" value={formatMinutes(data.totals.overtimeMinutes)} />
                <ListRow label="야간" value={formatMinutes(data.totals.nightMinutes)} />
                <ListRow label="당직" value={formatMinutes(data.totals.dutyMinutes)} />
                <ListRow label="지각" value={formatMinutes(data.totals.lateMinutes)} />
                <ListRow label="조퇴" value={formatMinutes(data.totals.earlyLeaveMinutes)} />
                {/* 아직 판정이 안 끝난 날이다. 그만큼은 급여 계산에 들어가지 않는다. */}
                {data.totals.unconfirmedDays > 0 && (
                  <Text style={styles.note}>
                    아직 정리 중인 날이 {data.totals.unconfirmedDays}일 있어요. 그 날은 아직 급여
                    계산에 들어가지 않아요.
                  </Text>
                )}
              </>
            )}
          </QueryState>

          <View style={styles.monthNav}>
            <View style={styles.navButton}>
              <Button
                label="이전 달 보기"
                variant="secondary"
                size="inline"
                onPress={() => setMonth(subMonths(month, 1))}
              />
            </View>
            <View style={styles.navButton}>
              <Button
                label="다음 달 보기"
                variant="secondary"
                size="inline"
                onPress={() => setMonth(addMonths(month, 1))}
              />
            </View>
          </View>
        </Section>

        <SectionDivider />

        <Section>
          <SectionTitle title="하루하루" />
          <QueryState query={period}>
            {(data) =>
              data.days.length === 0 ? (
                <Text style={styles.note}>이 달에 집계된 기록이 없어요.</Text>
              ) : (
                <>
                  {data.days.map((day) => (
                    <DayLine key={day.workDate} day={day} />
                  ))}
                </>
              )
            }
          </QueryState>
        </Section>
      </ScrollView>
    </>
  );
}

/**
 * 하루 한 줄. 출퇴근과 그 날 근로시간을 같이 둔다.
 *
 * **자정을 넘긴 퇴근을 `+1`로 알린다.** 야간근무는 퇴근 날짜가 하루 뒤라, 시각만 적으면
 * 새벽에 출근한 것으로 읽힌다.
 */
function DayLine({ day }: { day: AttendanceDay }) {
  return (
    <View>
      <ListRow
        label={`${formatServerDate(day.workDate, 'M.d')} (${weekdayText(day.workDate)})`}
        value={formatMinutes(day.payrollMinutes)}
      />
      <Text style={styles.dayNote}>
        {[
          clockText(day),
          day.corrected ? '보정됨' : undefined,
          day.confirmed ? undefined : '정리 중',
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </View>
  );
}

/** `08:52 ~ 18:03`. 퇴근이 다음 날이면 `+1`이 붙는다 */
function clockText(day: AttendanceDay): string {
  if (day.checkInAt === null && day.checkOutAt === null) return '기록 없음';

  const start = day.checkInAt === null ? '—' : formatServerDateTime(day.checkInAt, 'HH:mm');
  if (day.checkOutAt === null) return `${start} ~ 퇴근 기록 없음`;

  const endDate = formatServerDateTime(day.checkOutAt, 'yyyy-MM-dd');
  const end = formatServerDateTime(day.checkOutAt, 'HH:mm');
  return `${start} ~ ${end}${endDate === day.workDate ? '' : ' +1'}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  weekRight: { alignItems: 'flex-end' },
  weekMinutes: { ...typography.bodySmall, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak },
  // 줄 아래에 붙는 보조. 근로시간을 먼저 읽어야 해서 흐리고 작다.
  dayNote: { ...typography.caption, color: colors.textWeak, marginBottom: spacing.tight },
  monthNav: { flexDirection: 'row', marginTop: spacing.rowGap, gap: spacing.rowGap },
  navButton: { flex: 1 },
});
