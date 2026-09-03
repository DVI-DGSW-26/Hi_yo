import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
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
  /** 숫자만 받는 칸(시각·연락처)에 쓴다. 글자 키보드를 띄우면 손이 한 번 더 간다 */
  keyboardType?: KeyboardTypeOptions;
}

/**
 * 한 줄 입력. 라벨은 필드 위에 둔다.
 *
 * 높이를 고정하지 않는다. 시스템 글꼴을 키운 사용자가 있고, 고정 높이 안에 글자를 가두면
 * 잘린다. minHeight만 준다 — 버튼(54)과 같은 값이라 폼과 하단 CTA의 리듬이 맞는다.
 *
 * 라벨 위치·오류 표기·비활성 상태는 DESIGN_RULES.md 7장에 적혀 있다 (2026-09-02).
 * 지금 이 파일이 하고 있는 것이 그 규칙이다 — 라벨은 필드 위, 오류는 필드 아래 인라인,
 * 테두리만 danger 로 바꾸고 배경은 칠하지 않는다.
 *
 * **필수 표시가 없는 것은 의도다** (2026-09-03 확정. 7장). 모바일 입력칸 다섯 중 넷이
 * 선택이라, 관리팀처럼 `*`로 필수를 찍으면 별 하나가 뜨고 나머지 넷이 예외처럼 읽힌다 —
 * 같은 기호가 두 앱에서 반대로 작동한다. 대신 **선택인 칸에 「안 적어도 돼요」를 적고**,
 * 못 낸 이유는 눌렀을 때 인라인으로 알린다. 칸이 늘어 필수가 다수가 되면 다시 정한다.
 *
 * **읽기 전용 표기는 아직 없다.** 쓸 자리가 없어서 정하지 않았다 — 생기는 곳은 S-101
 * 통장정보 수정의 예금주 하나이고 그 화면은 서버에 걸려 있다 (물어볼 것 10번).
 * 그 화면을 만들 때 같이 정한다.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  error,
  keyboardType,
}: Props) {
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
        keyboardType={keyboardType}
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
    marginBottom: spacing.tight,
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
    marginTop: spacing.tight,
  },
});
