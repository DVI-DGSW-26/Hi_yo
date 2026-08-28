import { View } from 'react-native';
import { ListRow, QueryState, SectionTitle, StatusText } from '@/components';
import type { DutySchedule } from './api';
import { scheduleTitle, timeRangeText } from './labels';

interface Props {
  schedules: { isPending: boolean; error: Error | null; data: DutySchedule[] | undefined };
}

/**
 * 그 달의 내 당직. 한 줄이 배정 한 건이다.
 *
 * 경비교대는 같은 날짜에 중식·석식 두 줄이 나온다. **각각 별개 단위다** —
 * 하루를 한꺼번에 다루는 줄을 만들지 않는다 (명세서 S-503).
 *
 * **교체를 부탁하는 화면은 만들지 않았다.** 신청에 `targetId`가 필요한데 일반 직원은
 * 후보를 알아낼 방법이 없다 — 명단 대상자도 당직표 전체도 403이다 (2026-08-28 실호출).
 * 서버가 열어주면 이 줄을 눌러 들어가게 한다
 * (`docs/00_문서_인덱스.md` — 교체 상대 후보를 본인이 볼 수 없다).
 *
 * 이미 교체 요청이 걸린 배정은 `swapPending`으로 알린다. 관리팀이 대신 넣었거나
 * 다른 경로로 생긴 요청이라도 내 당직이 흔들리는 중이라는 것은 보여야 한다.
 */
export function DutyScheduleList({ schedules }: Props) {
  return (
    <View>
      <SectionTitle title="내 당직" />
      <QueryState query={schedules} empty="이 달에 잡힌 당직이 없어요.">
        {(data) =>
          data.map((schedule) => (
            <ListRow
              key={schedule.id}
              label={scheduleTitle(schedule)}
              value={timeRangeText(schedule.startTime, schedule.endTime) ?? undefined}
              placeholder="시간이 아직이에요"
              right={schedule.swapPending ? <StatusText label="바꾸는 중" /> : undefined}
            />
          ))
        }
      </QueryState>
    </View>
  );
}
