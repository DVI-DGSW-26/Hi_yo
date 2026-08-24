import { Text, StyleSheet } from 'react-native';
import { colors } from '@hr/tokens';

type Tone = 'done' | 'error' | 'neutral';

interface Props {
  label: string;
  tone?: Tone;
}

/**
 * 상태를 색으로 구분하려 하지 않는다.
 * 확정/완료만 그린, 오류만 빨강, 나머지는 전부 무채색.
 */
export function StatusText({ label, tone = 'neutral' }: Props) {
  return <Text style={[styles.base, styles[tone]]}>{label}</Text>;
}

const styles = StyleSheet.create({
  base: { fontSize: 15 },
  done: { color: colors.primary, fontWeight: '500' },
  error: { color: colors.danger },
  neutral: { color: colors.textWeak },
});
