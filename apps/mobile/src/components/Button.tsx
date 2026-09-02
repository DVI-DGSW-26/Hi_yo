import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fontFamily, radius, spacing, typography } from '@hr/tokens';

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
  /*
   * 높이를 고정하지 않는다. `minHeight`만 준다 (`DESIGN_RULES.md` 4·7장).
   *
   * 지금은 라벨에 `maxFontSizeMultiplier` 1.4가 걸려 있어 글자가 29px에서 멈추고,
   * 그래서 54·44 안에 한 줄로 들어간다 — **고정 높이로 두어도 오늘은 안 잘린다.**
   * 다만 상한을 올리거나 라벨이 한 글자만 길어져도 조용히 잘린다. 실측해 보니
   * 상한이 없으면 `이전 달 보기`가 2배에서 두 줄이 되어 44 안에서 잘렸다 (2026-09-03).
   *
   * `minHeight`로 두면 넘칠 때만 자란다. 상하 여백은 주지 않았다 — 8을 주면 글꼴
   * 1.35배(iOS 기본 최대)에서 버튼이 44에서 45로 자란다. 안 깨지는 자리를 건드리지 않는다.
   * 입력칸(`TextField`)이 같은 이유로 이미 `minHeight: 54`를 쓰고 있다.
   */
  cta: { minHeight: 54 },
  inline: { minHeight: spacing.rowHeight, paddingHorizontal: 16 },
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
