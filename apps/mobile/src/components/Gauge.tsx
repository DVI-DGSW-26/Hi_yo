import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '@hr/tokens';

interface Props {
  /** 0~1. 서버가 준 값으로 계산하되 1을 넘어도 바가 깨지지 않는다. */
  ratio: number;
  /** 게이지 아래 한 줄 설명 */
  caption?: string;
  captionRight?: string;
}

export function Gauge({ ratio, caption, captionRight }: Props) {
  const clamped = Math.min(1, Math.max(0, ratio));

  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(clamped * 100)}%` }]} />
      </View>
      {(caption || captionRight) && (
        <View style={styles.captionRow}>
          <Text style={styles.caption}>{caption}</Text>
          {captionRight ? <Text style={styles.caption}>{captionRight}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radius.gauge,
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primary },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  caption: { ...typography.label, color: colors.textWeak },
});
