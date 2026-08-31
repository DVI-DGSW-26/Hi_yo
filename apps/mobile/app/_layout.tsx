import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { colors, typography } from '@hr/tokens';
import { ApiError } from '@hr/api';
import { AuthGate } from '@/features/auth/AuthGate';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 권한 없음·업무 규칙 위반은 다시 불러도 같은 답이 온다. 재시도는 연결·서버 문제에만 한다.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isRetryable) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      // 자동 재시도를 켜지 않는다. 재직증명서 발급은 부를 때마다 새 문서번호가 찍힌다.
      retry: false,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* initialMetrics가 없으면 inset 측정이 끝날 때까지 children을 그리지 않는다. 첫 화면이 비어 보인다. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="dark" />
        {/* 로그인하지 않았으면 화면을 그리지 않는다. 눌러도 전부 401 이다. */}
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
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
