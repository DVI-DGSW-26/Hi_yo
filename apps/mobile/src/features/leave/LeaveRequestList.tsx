import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { ListRow, SectionTitle, StatusText } from '@/components';
import { formatInKst, formatLeaveDays } from '@/lib/format';
import { useMyRequests, type LeaveRequest, type RequestStatus } from './api';

/**
 * 내 신청 목록.
 *
 * 상태를 색으로 구분하려 하지 않는다. 반려만 빨강, 승인만 그린, 나머지는 무채색이다
 * (DESIGN_SYSTEM.md 5장 StatusText).
 */
export function LeaveRequestList() {
  const { data, isPending, error } = useMyRequests();

  return (
    <View>
      <SectionTitle title="낸 신청" />
      {isPending ? (
        <ActivityIndicator color={colors.textDisabled} />
      ) : error ? (
        <Text style={styles.error}>{error.message}</Text>
      ) : data.content.length === 0 ? (
        <Text style={styles.empty}>아직 낸 신청이 없어요.</Text>
      ) : (
        data.content.map((request) => (
          <ListRow
            key={request.id}
            label={`${period(request)} · ${request.typeName ?? request.typeCode}`}
            right={
              <View style={styles.right}>
                <Text style={styles.days}>{formatLeaveDays(request.leaveDays)}</Text>
                <StatusText label={statusLabel(request.status)} tone={statusTone(request.status)} />
              </View>
            }
          />
        ))
      )}
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

function statusTone(status: RequestStatus): 'done' | 'error' | 'neutral' {
  if (status === 'APPROVED') return 'done';
  if (status === 'REJECTED') return 'error';
  return 'neutral';
}

const styles = StyleSheet.create({
  right: { alignItems: 'flex-end', flexShrink: 1 },
  days: { ...typography.body, color: colors.textStrong },
  empty: { ...typography.bodySmall, color: colors.textWeak },
  error: { ...typography.bodySmall, color: colors.danger },
});
