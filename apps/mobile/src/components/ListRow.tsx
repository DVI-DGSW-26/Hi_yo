import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';

type Variant = 'value' | 'nav';

interface Props {
  label: string;
  value?: string;
  /** 값이 아직 없을 때 쓴다. textDisabled 색으로 표시된다. */
  placeholder?: string;
  /** 값 자리에 StatusText 같은 요소를 넣을 때 쓴다. 주면 value·placeholder 대신 이게 그려진다. */
  right?: React.ReactNode;
  /**
   * `value`(기본) — 라벨이 항목 이름, 값이 데이터다. 값을 진하게 읽힌다.
   * `nav` — 눌러서 이동하는 줄. 갈 곳의 이름인 라벨을 진하게 읽힌다.
   */
  variant?: Variant;
  onPress?: () => void;
}

/**
 * 라벨-값 한 줄. 섹션 안에 쌓아서 쓴다.
 * 값은 서버가 준 그대로 넣는다. 여기서 포맷하거나 마스킹하지 않는다.
 *
 * 강약이 두 종류다. 데이터를 보여주는 줄은 값이 주인공이고(`value`),
 * 눌러서 이동하는 줄은 갈 곳의 이름이 주인공이다(`nav`).
 */
export function ListRow({
  label,
  value,
  placeholder,
  right,
  variant = 'value',
  onPress,
}: Props) {
  const text = value ?? placeholder;
  const isPlaceholder = value === undefined && placeholder !== undefined;
  const isNav = variant === 'nav';

  const content = (
    <>
      <Text style={isNav ? styles.navLabel : styles.label}>{label}</Text>
      {right === undefined ? (
        text !== undefined && (
          <Text
            style={[
              isNav ? styles.navValue : styles.value,
              isPlaceholder && styles.placeholder,
            ]}
          >
            {text}
          </Text>
        )
      ) : (
        // 값 자리에 들어온 요소도 값과 같은 폭을 차지해야 오른쪽 끝에 선다.
        <View style={styles.rightSlot}>{right}</View>
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
    alignItems: 'center',
    // 터치 영역 최소 44. 글꼴을 키우면 이보다 커진다 (고정 높이가 아니다).
    minHeight: spacing.rowHeight,
    marginBottom: spacing.rowGap,
    /*
     * 라벨과 값이 한 줄에 못 들어가면 값이 아랫줄로 내려간다 (2026-09-03 실측).
     *
     * 시스템 글꼴을 2.2배로 키우면 `지급 합계 / 12,345,678원`이 화면 밖으로 나갔다.
     * 금액에는 끊을 자리가 없어서(`3,847,200원`은 한 덩어리다) 값을 아무리 좁혀도
     * 제 폭 아래로 못 줄고, 그대로 잘려 나간다 — **급여명세서에서 금액이 잘리는 것이다.**
     *
     * `space-between` 대신 값에 `flexGrow`를 준다. 한 줄에 들어갈 때는 값이 남는 폭을
     * 채워 오른쪽 끝에 서므로 지금과 똑같이 보이고(1.35배까지 높이·위치가 같다),
     * 넘칠 때만 아랫줄로 내려가 온전한 금액이 남는다. 관리팀 연차 달력에서 이름을
     * 지키려고 쓴 처방과 같다 (`00_문서_인덱스.md` 「큰 글꼴·좁은 창 점검」).
     */
    flexWrap: 'wrap',
  },
  pressed: { backgroundColor: colors.divider },
  // 라벨도 줄어들 수 있어야 값이 설 자리가 남는다. 라벨은 끊을 자리가 있어서 접힌다.
  label: {
    ...typography.bodySmall,
    color: colors.textWeak,
    marginRight: spacing.rowGap,
    flexShrink: 1,
  },
  // flexGrow가 space-between 자리를 대신한다. 남는 폭을 값이 먹고 글자는 오른쪽에 붙는다.
  value: {
    ...typography.body,
    color: colors.textStrong,
    flexShrink: 1,
    flexGrow: 1,
    textAlign: 'right',
  },
  navLabel: {
    ...typography.body,
    color: colors.textStrong,
    marginRight: spacing.rowGap,
    flexShrink: 1,
  },
  navValue: {
    ...typography.bodySmall,
    color: colors.textWeak,
    flexShrink: 1,
    flexGrow: 1,
    textAlign: 'right',
  },
  rightSlot: { flexGrow: 1, flexShrink: 1, alignItems: 'flex-end' },
  placeholder: { color: colors.textDisabled },
});
