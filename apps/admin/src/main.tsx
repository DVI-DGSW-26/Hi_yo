import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ApiError } from '@hr/api';
import { applyTokens } from '@/lib/applyTokens';
import { AppShell } from '@/app/AppShell';
import { Home } from '@/app/Home';
import { NotBuilt } from '@/app/NotBuilt';
import './index.css';

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
      // 자동 재시도를 켜지 않는다. 급여 확정·발급처럼 두 번 부르면 안 되는 것들이 있다.
      retry: false,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'employees', element: <NotBuilt screenId="A-102" title="직원 등록·수정" /> },
      { path: 'approvals', element: <NotBuilt screenId="A-302" title="연차 신청 검토·승인" /> },
      {
        path: 'payroll',
        element: (
          <NotBuilt
            screenId="A-601"
            title="급여 계산 실행·수정"
            blockedBy="API는 docs/API_급여.md에 정리돼 있어요. 관리팀 화면의 디자인 규칙이 정해지면 시작할 수 있어요."
          />
        ),
      },
    ],
  },
]);

applyTokens();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
