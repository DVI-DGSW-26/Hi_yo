import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@hr/tokens';

interface Props {
  open: boolean;
  /** 시트가 무엇을 묻는지. 화면 제목과 같은 무게로 읽힌다 */
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 아래에서 올라오는 시트. **모바일에서 화면 위에 겹치는 것은 전부 이걸 쓴다.**
 *
 * 왜 하단인가 — 엄지가 닿는다. 화면이 커질수록 가운데 대화상자의 버튼은 손에서 멀어지고,
 * iPhone SE(375×667)에서는 반대로 가운데 상자가 화면을 거의 다 먹는다.
 *
 * 규칙을 지키느라 다르게 만든 것들.
 * - **그림자를 쓰지 않는다.** 떠 있는 느낌은 뒤를 덮는 `scrim`이 낸다 (`DESIGN_RULES.md` 1장 5번)
 * - 위쪽 두 귀만 둥글다. 아래는 화면 끝에 붙으므로 라운드를 주면 틈이 생긴다
 * - **높이를 고정하지 않는다.** 글꼴을 키우면 내용만큼 자라고, 화면의 80%를 넘으면 그 안에서
 *   스크롤한다 (`DESIGN_SYSTEM.md` 2장 글꼴 확대 대응)
 * - 하단 여백은 `useSafeAreaInsets`로 받는다. 홈 인디케이터에 버튼이 가리면 안 된다
 *
 * 라운드 값(16)은 여기서만 쓴다. 두 번째로 쓰이는 순간 토큰으로 올린다
 * (`DESIGN_SYSTEM.md` 3장).
 */
export function Sheet({ open, title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      // 안드로이드 뒤로가기. 이걸 주지 않으면 시트가 안 닫히고 화면이 통째로 빠진다.
      onRequestClose={onClose}
      // iOS 보이스오버가 뒤 화면을 읽지 않게 막는다.
      accessibilityViewIsModal
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* 막을 누르면 닫힌다. 스크린리더에는 닫기 버튼 하나로 읽힌다. */}
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sectionY }]}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView
            // 내용이 짧으면 그만큼만 차지한다. 길면 이 안에서만 스크롤한다.
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.sectionY,
    // 화면을 다 덮지 않는다. 뒤가 보여야 무엇 위에 떠 있는지 안다.
    maxHeight: '80%',
  },
  title: {
    ...typography.headline,
    color: colors.textStrong,
    marginBottom: spacing.sectionTitleGap,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: spacing.tight },
});
