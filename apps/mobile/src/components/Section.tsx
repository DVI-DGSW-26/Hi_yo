import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@hr/tokens';

/** 흰 배경 섹션. 카드를 회색 위에 띄우지 않는다. */
export function Section({ children }: { children: React.ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

/** 섹션 사이를 나누는 회색 띠. 화면 전체 폭을 채운다. */
export function SectionDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.screenX,
    paddingVertical: spacing.sectionY,
  },
  divider: {
    height: spacing.dividerHeight,
    backgroundColor: colors.divider,
  },
});
