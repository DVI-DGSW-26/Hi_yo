import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';
import { ListRow, QueryState, SectionTitle, StatusText } from '@/components';
import type { DutySchedule } from './api';
import { scheduleTitle, timeRangeText } from './labels';

interface Props {
  schedules: { isPending: boolean; error: Error | null; data: DutySchedule[] | undefined };
  /** 눌러서 교체를 부탁하러 간다 */
  onPressSchedule: (schedule: DutySchedule) => void;
}

/**
 * 그 달의 내 당직. 한 줄이 배정 한 건이다.
 *
 * 경비교대는 같은 날짜에 중식·석식 두 줄이 나온다. **각각 별개 단위다** —
 * 하루를 한꺼번에 다루는 줄을 만들지 않는다 (명세서 S-503).
 *
 * **눌러서 교체를 부탁한다** (2026-09-07). 8-28부터 막혀 있던 자리다 — 후보 조회가
 * 403이라 `targetId`를 고를 수가 없었고, 9-02에 본인용 경로가 열리면서 풀렸다.
 * 그래서 줄이 `nav`가 됐다. 이제 이 줄은 값을 읽는 줄이 아니라 갈 곳이라, 날짜와
 * 명단이 주인공이고 시간이 곁들이가 된다 (`ListRow` 두 강약).
 *
 * 이미 교체 요청이 걸린 배정은 `swapPending`으로 알린다. 관리팀이 대신 넣었거나
 * 다른 경로로 생긴 요청이라도 내 당직이 흔들리는 중이라는 것은 보여야 한다.
 * **그래도 눌리게 둔다** — 중복 신청을 막는 것은 서버의 판정이다.
 */
export function DutyScheduleList({ schedules, onPressSchedule }: Props) {
  return (
    <View>
      <SectionTitle title="내 당직" />
      <QueryState query={schedules} empty="이 달에 잡힌 당직이 없어요.">
        {(data) => (
          <>
            {data.map((schedule) => (
              <ListRow
                key={schedule.id}
                label={scheduleTitle(schedule)}
                variant="nav"
                value={timeRangeText(schedule.startTime, schedule.endTime) ?? undefined}
                placeholder="시간이 아직이에요"
                right={schedule.swapPending ? <StatusText label="바꾸는 중" /> : undefined}
                onPress={() => onPressSchedule(schedule)}
              />
            ))}
            <Text style={styles.note}>눌러서 교체를 부탁할 수 있어요.</Text>
          </>
        )}
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
});
