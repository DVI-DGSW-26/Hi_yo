import { Link, useParams } from 'react-router';
import { DetailList } from '@/components';
import { DutyMembersSection } from '@/features/duty/DutyMembersSection';
import { DutyScheduleSection } from '@/features/duty/DutyScheduleSection';
import { useDutyMembers, useDutyRosters } from '@/features/duty/api';
import { rotationCycleText, slotText, timeRangeText } from '@/features/duty/labels';

/**
 * A-504 당직 명단 · 스케줄 관리 — 명단 하나
 *
 * 이 화면이 전달할 단 하나의 메시지 — **누가 어떤 순서로 도는가, 그래서 당직표가 어떻게 되는가.**
 *
 * 대상자를 먼저 두고 당직표를 아래에 둔다. 대상자가 없으면 편성이 아예 돌지 않아
 * 순서가 곧 작업 순서다.
 *
 * **명단 단건 조회 API가 없다.** `GET /duty/rosters`가 배열을 주므로 그 안에서 찾는다 —
 * 없는 엔드포인트를 만들지 않는다 (`CLAUDE.md` 4장). 명단은 셋뿐이고 한 시간 캐시된다.
 */
export function DutyRosterDetail() {
  const { rosterId: raw } = useParams<{ rosterId: string }>();
  const rosterId = raw ? Number(raw) : undefined;

  const rosters = useDutyRosters();
  const members = useDutyMembers(rosterId);
  const roster = rosters.data?.find((item) => item.id === rosterId);

  if (rosters.isPending) return <p className="muted">불러오는 중이에요.</p>;
  if (rosters.error) return <p className="danger">{rosters.error.message}</p>;

  if (!roster) {
    return (
      <section className="page-blocks">
        <Link to="/duty" className="back-link">
          당직 명단으로
        </Link>
        <p className="muted">찾을 수 없는 명단이에요.</p>
      </section>
    );
  }

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <Link to="/duty" className="back-link">
            당직 명단으로
          </Link>
          <h1 className="page-title">{roster.name}</h1>
          <p className="page-lead">
            순번은 관리팀이 정해요. 여기 있는 순서대로 자동 편성이 돌아요.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <DetailList
            items={[
              { label: '순환', value: rotationCycleText(roster.rotationCycle) },
              {
                label: '자동 편성',
                value: roster.autoAssignable ? '순번대로 돌릴 수 있어요' : '직접 넣어야 해요',
              },
              { label: '근무 시간', value: timeRangeText(roster.workStart, roster.workEnd) },
              {
                label: '슬롯',
                value: roster.useSlot
                  ? roster.slots
                      .map(
                        (slot) =>
                          `${slotText(slot.code)} ${timeRangeText(slot.startTime, slot.endTime)}`,
                      )
                      .join(' · ')
                  : '하루에 한 건이에요',
              },
            ]}
          />
        </div>
      </div>

      <DutyMembersSection rosterId={roster.id} />

      {/* 대상자를 못 불러오면 편성도 담당자 변경도 고를 수가 없다. 표가 이미 오류를
          보여주고 있으므로 여기서 문구를 또 만들지 않는다. */}
      {members.data && <DutyScheduleSection roster={roster} members={members.data} />}
    </section>
  );
}
