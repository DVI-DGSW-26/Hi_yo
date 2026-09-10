import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { colors, typography } from '@hr/tokens';
import { AuthGate } from '@/features/auth/AuthGate';
import { queryClient } from '@/lib/queryClient';

/**
 * **웹에서만 폰 폭으로 가운데 정렬한다** (2026-09-10).
 *
 * 아이폰 쓰는 직원이 브라우저로 들어온다. 그런데 이 화면들은 폰 폭에 맞춰 만든 것이라
 * 데스크톱에서 열면 라벨이 왼쪽 끝, 값이 오른쪽 끝으로 벌어져서 눈이 멀리 이동해야 한다.
 *
 * **430은 이 디자인이 상정하는 가장 넓은 폰이다.** 그보다 넓히면 실제 기기에 없는 폭이
 * 되어 줄바꿈이 기기와 달라진다. 최소는 iPhone SE(375)를 본다 (`CLAUDE.md` 6장).
 * 한 곳에서만 쓰는 값이라 토큰으로 올리지 않았다 (`DESIGN_RULES.md` 4장).
 *
 * **앱에서는 아무 일도 하지 않는다** — 두 스타일 다 `flex: 1` 뿐이다.
 */
const PHONE_MAX_WIDTH = 430;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    // 바깥 바탕. 이미 구획 사이에 쓰는 색이라 새 색을 들이지 않는다.
    ...(Platform.OS === 'web' ? { backgroundColor: colors.divider, alignItems: 'center' } : null),
  },
  shell: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? { width: '100%', maxWidth: PHONE_MAX_WIDTH, backgroundColor: colors.white }
      : null),
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* initialMetrics가 없으면 inset 측정이 끝날 때까지 children을 그리지 않는다. 첫 화면이 비어 보인다. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="dark" />
        {/* 로그인하지 않았으면 화면을 그리지 않는다. 눌러도 전부 401 이다. */}
        <View style={styles.page}>
          <View style={styles.shell}>
            <AuthGate>
          <Stack
            screenOptions={{
              // 그림자 금지 (DESIGN_RULES.md 1장 5번). 헤더 밑에 그림자를 두지 않는다.
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.white },
              headerTitleStyle: { ...typography.sectionTitle, color: colors.textStrong },
              headerTintColor: colors.textStrong,
              contentStyle: { backgroundColor: colors.white },
              // 제목을 양쪽 플랫폼 모두 가운데로 맞춘다. iOS는 가운데, 안드로이드는 왼쪽이
              // 기본이라 그대로 두면 같은 앱이 기기마다 다르게 읽힌다.
              headerTitleAlign: 'center',
              // iOS는 뒤로가기 화살표 옆에 이전 화면 제목을 붙인다. `재직증명서` 처럼 긴
              // 제목이 잘려서 `재직...` 으로 남는다. 화살표만 둔다.
              headerBackButtonDisplayMode: 'minimal',
              // 헤더 높이는 건드리지 않는다. spacing.navHeight(52)가 있지만 네이티브 스택은
              // 상태바 inset을 더해 스스로 정하고, 강제로 맞추면 노치가 있는 기기에서
              // 제목이 상태바에 물린다. 토큰은 관리팀 화면과 스펙 수치용으로 남겨둔다.
            }}
          />
            </AuthGate>
          </View>
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
