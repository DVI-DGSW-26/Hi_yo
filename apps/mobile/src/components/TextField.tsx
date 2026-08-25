import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@hr/tokens';

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** 값이 없을 때 보이는 예시. 라벨을 여기에 반복하지 않는다 */
  placeholder?: string;
  /** 서버가 받는 한계를 그대로 넣는다. 넘겨서 422를 받게 두지 않는다 */
  maxLength?: number;
  /** 인라인 오류. Button에 disabled가 없으므로 막힌 이유는 전부 이 자리로 온다 */
  error?: string;
}

/**
 * 한 줄 입력. 라벨은 필드 위에 둔다.
 *
 * 높이를 고정하지 않는다. 시스템 글꼴을 키운 사용자가 있고, 고정 높이 안에 글자를 가두면
 * 잘린다. minHeight만 준다 — 버튼(54)과 같은 값이라 폼과 하단 CTA의 리듬이 맞는다.
 *
 * TODO: 라벨 위치·오류 표기·비활성 상태는 DESIGN_RULES.md 7장이 비어 있어 확정되지 않았다.
 * 확정되면 여기에 맞춘다.
 */
export function TextField({ label, value, onChangeText, placeholder, maxLength, error }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error !== undefined && styles.inputError,
        ]}
      />
      {error !== undefined && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.rowGap },
  label: {
    ...typography.label,
    color: colors.textWeak,
    marginBottom: 8,
  },
  input: {
    ...typography.body,
    color: colors.textStrong,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    backgroundColor: colors.white,
  },
  inputFocused: { borderColor: colors.borderStrong },
  inputError: { borderColor: colors.danger },
  error: {
    ...typography.label,
    color: colors.danger,
    marginTop: 8,
  },
});
