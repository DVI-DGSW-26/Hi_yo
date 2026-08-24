import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@hr/tokens';

interface Props {
  title: string;
  right?: React.ReactNode;
}

export function SectionTitle({ title, right }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sectionTitleGap,
  },
  title: { fontSize: 16, fontWeight: '500', color: colors.textStrong },
});
