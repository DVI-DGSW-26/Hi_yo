import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';
import { Button } from './Button';

interface Props {
  /** `useInfiniteQuery` 결과를 그대로 넘긴다 */
  query: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    error: Error | null;
    fetchNextPage: () => unknown;
  };
  /** 이미 그려진 줄이 있는지. 첫 쪽부터 실패한 경우는 `QueryState`가 그린다 */
  hasItems: boolean;
}

/**
 * 목록의 다음 쪽을 이어 붙인다.
 *
 * **쪽 번호를 두지 않는다.** 관리팀 표는 `이전`·`다음`으로 오가지만, 폰에서는 위에서
 * 아래로 읽어 내려가는 것이 전부라 쪽을 짚어 갈 일이 없다.
 *
 * 더 받을 것이 없으면 아무것도 그리지 않는다. `마지막이에요` 같은 줄을 남기지 않는다 —
 * 목록이 끝난 것은 스크롤이 멈추면 알 수 있고, 짧은 목록마다 그 줄이 붙으면 지저분하다.
 *
 * 무한 스크롤로 하지 않았다. 이 목록들은 아래에 다른 섹션이 이어져서(연차 화면은 신청
 * 목록 아래로 계속된다) 스크롤 끝을 감지해 자동으로 더 부르면 그 섹션에 닿을 수가 없다.
 *
 * **다음 쪽이 실패해도 이미 받은 줄은 지우지 않는다.** 오류는 여기 버튼 위에 붙는다.
 * `QueryState`가 조회 실패에 값을 지우는 것은 틀린 값을 보고 있는 줄 모르는 편이 더
 * 위험해서인데, 여기서는 앞쪽이 이미 맞는 값이고 뒤가 안 온 것뿐이라 사정이 다르다.
 */
export function MoreButton({ query, hasItems }: Props) {
  if (!query.hasNextPage) return null;

  return (
    <View style={styles.wrap}>
      {query.error && hasItems && <Text style={styles.error}>{query.error.message}</Text>}
      <Button
        label="더 보기"
        variant="secondary"
        size="inline"
        loading={query.isFetchingNextPage}
        onPress={() => query.fetchNextPage()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 마지막 줄과 붙지 않게 띄운다. 목록의 일부가 아니라 목록에 붙는 동작이다.
  wrap: { marginTop: spacing.tight, alignItems: 'flex-start' },
  error: { ...typography.bodySmall, color: colors.danger, marginBottom: spacing.tight },
});
