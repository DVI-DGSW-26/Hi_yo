import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fontFamily, radius, typography } from '@hr/tokens';

type Variant = 'primary' | 'secondary';
type Size = 'cta' | 'inline';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/**
 * 한 화면에 primary는 1개만 쓴다.
 * disabled prop은 의도적으로 제공하지 않는다.
 * 누를 수 없는 상황이면 눌렀을 때 인라인 에러로 알린다.
 */
export function Button({ label, onPress, variant = 'primary', size = 'cta', loading }: Props) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        size === 'cta' ? styles.cta : styles.inline,
        isPrimary ? styles.primary : styles.secondary,
        pressed && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.textBody} />
      ) : (
        <Text
          maxFontSizeMultiplier={1.4}
          style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: { height: 54 },
  inline: { height: 44, paddingHorizontal: 16 },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPress },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
  },
  secondaryPressed: { backgroundColor: colors.divider },
  label: { fontFamily, fontSize: 17, fontWeight: '500' },
  labelPrimary: { color: colors.white },
  labelSecondary: { color: colors.textBody },
});
