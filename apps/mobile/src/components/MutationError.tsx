import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';

/**
 * 신청 · 발급처럼 **누른 뒤에 실패한 것**을 버튼 바로 위에 알린다.
 *
 * 조회 실패는 `QueryState`가 그린다. 이쪽은 자리가 다르다 — 누른 버튼 옆에 붙어야
 * 무엇이 실패했는지 알 수 있어서 아래 여백(`tight`)을 갖는다.
 *
 * `Button`에 `disabled`가 없으므로 **막힌 이유는 전부 이 자리로 온다**
 * (DESIGN_SYSTEM.md 5장). 서버가 준 한국어를 그대로 쓴다 — 앱에서 문구를 만들지 않는다.
 */
export function MutationError({ mutation }: { mutation: { error: Error | null } }): ReactNode {
  if (!mutation.error) return null;

  return <Text style={styles.text}>{mutation.error.message}</Text>;
}

const styles = StyleSheet.create({
  text: { ...typography.bodySmall, color: colors.danger, marginBottom: spacing.tight },
});
