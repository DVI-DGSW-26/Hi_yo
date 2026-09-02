import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { ListRow, MoreButton, QueryState, SectionTitle, StatusText } from '@/components';
import { formatInKst, formatLeaveDays } from '@/lib/format';
import { useMyRequests, type LeaveRequest, type RequestStatus } from './api';

/**
 * 내 신청 목록.
 *
 * 상태를 색으로 구분하려 하지 않는다. 반려만 빨강, 승인만 그린, 나머지는 무채색이다
 * (DESIGN_SYSTEM.md 5장 StatusText).
 *
 * 한 쪽씩 받아 이어 붙인다. 전에는 첫 20건에서 잘렸고 잘렸다는 표시도 없었다.
 */
export function LeaveRequestList() {
  const requests = useMyRequests();

  // 받은 쪽들을 한 줄로 편다. QueryState 는 배열을 그대로 받아 빈 상태를 판정한다.
  const items = requests.data?.pages.flatMap((page) => page.content);

  return (
    <View>
      <SectionTitle title="낸 신청" />
      <QueryState
        query={{
          isPending: requests.isPending,
          // 첫 쪽부터 실패한 경우만 여기서 그린다. 뒤쪽이 실패한 것은 MoreButton 이 맡는다 —
          // 이미 받은 줄까지 지울 이유가 없다.
          error: items === undefined ? requests.error : null,
          data: items,
        }}
        empty="아직 낸 신청이 없어요."
      >
        {(data) => (
          <>
            {data.map((request) => (
              <ListRow
                key={request.id}
                label={`${period(request)} · ${request.typeName ?? request.typeCode}`}
                right={
                  <View style={styles.right}>
                    <Text style={styles.days}>{formatLeaveDays(request.leaveDays)}</Text>
                    <StatusText
                      label={statusLabel(request.status)}
                      tone={statusTone(request.status)}
                    />
                  </View>
                }
              />
            ))}
            <MoreButton query={requests} hasItems={data.length > 0} />
          </>
        )}
      </QueryState>
    </View>
  );
}

/**
 * 서버의 날짜(`2026-08-24`)에는 시각이 없다. KST 자정으로 못 박아 넘긴다 —
 * 시각을 붙이지 않으면 기기 타임존에 따라 하루 밀린다.
 */
function period(request: LeaveRequest): string {
  const start = formatInKst(`${request.startDate}T00:00:00+09:00`, 'M.d');
  if (request.startDate === request.endDate) return start;
  return `${start} ~ ${formatInKst(`${request.endDate}T00:00:00+09:00`, 'M.d')}`;
}

function statusLabel(status: RequestStatus): string {
  switch (status) {
    case 'APPROVED':
      return '승인했어요';
    case 'REJECTED':
      return '반려했어요';
    case 'CANCELED':
      return '취소했어요';
    default:
      return '결재 기다리는 중';
  }
}

/**
 * **승인을 그린으로 칠하지 않는다** (2026-09-03).
 *
 * 이 목록은 낸 것이 대부분 승인되는 자리라, 승인을 칠하면 목록 한 줄 걸러 초록이 된다.
 * 관리팀 화면이 같은 이유로 근태 `판정 완료`와 52시간 `여유 있어요`를 칠하지 않는다 —
 * 정상이 초록으로 깔리면 손대야 할 줄이 그 사이에 묻힌다 (`DESIGN_RULES.md` 2장).
 *
 * 그린 예산도 이 화면이 이미 다 썼다. 선택된 날짜와 `신청하기`가 두 곳이다
 * (`DESIGN_SYSTEM.md` 1장). **반려는 빨강 그대로다** — 되물어야 하는 줄이다.
 */
function statusTone(status: RequestStatus): 'error' | 'neutral' {
  if (status === 'REJECTED') return 'error';
  return 'neutral';
}

const styles = StyleSheet.create({
  right: { alignItems: 'flex-end', flexShrink: 1 },
  days: { ...typography.body, color: colors.textStrong },
});
