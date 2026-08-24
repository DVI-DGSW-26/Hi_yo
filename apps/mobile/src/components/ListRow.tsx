import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';

interface Props {
  label: string;
  value?: string;
  /** 값이 아직 없을 때 쓴다. textDisabled 색으로 표시된다. */
  placeholder?: string;
  onPress?: () => void;
}

/**
 * 라벨-값 한 줄. 섹션 안에 쌓아서 쓴다.
 * 값은 서버가 준 그대로 넣는다. 여기서 포맷하거나 마스킹하지 않는다.
 */
export function ListRow({ label, value, placeholder, onPress }: Props) {
  const text = value ?? placeholder;
  const isPlaceholder = value === undefined && placeholder !== undefined;

  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      {text !== undefined && (
        <Text style={[styles.value, isPlaceholder && styles.placeholder]}>{text}</Text>
      )}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text === undefined ? label : `${label} ${text}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // 터치 영역 최소 44. 글꼴을 키우면 이보다 커진다 (고정 높이가 아니다).
    minHeight: 44,
    marginBottom: spacing.rowGap,
  },
  pressed: { backgroundColor: colors.divider },
  label: {
    ...typography.bodySmall,
    color: colors.textWeak,
    marginRight: spacing.rowGap,
  },
  value: {
    ...typography.body,
    color: colors.textStrong,
    flexShrink: 1,
    textAlign: 'right',
  },
  placeholder: { color: colors.textDisabled },
});
