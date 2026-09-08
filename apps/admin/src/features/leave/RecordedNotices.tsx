import { formatLeaveDays } from '@hr/format';
import { ResultList, ResultNotice } from '@/components';
import { formatKstDateTime, shortDate } from '@/lib/datetime';
import { promotionChannelLabel, promotionRoundLabel, type PromotionNotice } from './api';

/**
 * 이 화면에서 방금 남긴 통보 기록들.
 *
 * **기록하면 그 줄이 표에서 사라진다.** 대상 목록은 「아직 기록이 없는 사람」이라 그것이
 * 정상인데, 사라지고 나면 무엇을 남겼는지 확인할 자리가 없어진다 — **서버에 기록을 다시
 * 조회하는 경로가 아직 없다** (`GET /leave/promotions` 가 없다. `docs/01_물어볼_것.md` 29번).
 * 그래서 남긴 것을 화면이 들고 있는다.
 *
 * **여기 잔여는 통보서에 찍힌 스냅샷이다.** 대상 목록의 잔여는 목록을 연 순간의 값이라
 * 두 값이 다를 수 있다 (스펙 설명). 증빙이 되는 쪽은 이쪽이라 여기에 적는다.
 *
 * 상자 모양은 단체연차 차감·급여 계산 결과가 쓰던 것과 같다 (`components/ResultNotice`).
 */
export function RecordedNotices({ notices }: { notices: PromotionNotice[] }) {
  if (notices.length === 0) return null;

  return (
    <ResultNotice
      summary={`${notices.length}명에게 보낸 것을 기록했어요.`}
      note="화면을 새로 열면 이 목록은 사라져요. 서버에 발송 기록을 다시 조회하는 경로가 아직 없어요."
    >
      <ResultList title={`기록한 통보 ${notices.length}건`}>
        {notices.map((notice) => (
          <li key={notice.id}>
            {notice.employeeName ?? `직원 ${notice.employeeId}`} ·{' '}
            {promotionRoundLabel(notice.round)} · {promotionChannelLabel(notice.channel)} · 잔여{' '}
            {notice.remainingDays == null ? '안 왔어요' : formatLeaveDays(notice.remainingDays)} ·
            보낸 시각 {notice.sentAt ? formatKstDateTime(notice.sentAt) : '안 왔어요'} · 계획서 마감{' '}
            {notice.planDueOn ? shortDate(notice.planDueOn) : '안 왔어요'}
          </li>
        ))}
      </ResultList>
    </ResultNotice>
  );
}
