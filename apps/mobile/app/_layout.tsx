import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { colors, typography } from '@hr/tokens';
import { ApiError } from '@/lib/apiError';

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
        <Stack
          screenOptions={{
            // 그림자 금지 (DESIGN_RULES.md 1장 5번). 헤더 밑에 그림자를 두지 않는다.
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.white },
            headerTitleStyle: { ...typography.sectionTitle, color: colors.textStrong },
            headerTintColor: colors.textStrong,
            contentStyle: { backgroundColor: colors.white },
          }}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
