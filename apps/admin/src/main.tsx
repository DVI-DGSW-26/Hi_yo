import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { applyTokens } from '@/lib/applyTokens';
import { queryClient } from '@/lib/queryClient';
import { AppShell } from '@/app/AppShell';
import { AuthCallback } from '@/app/AuthCallback';
import { Home } from '@/app/Home';
import { PayrollPage } from '@/app/PayrollPage';
import { PayrollDetail } from '@/app/PayrollDetail';
import { EmployeesPage } from '@/app/EmployeesPage';
import { EmployeeNew } from '@/app/EmployeeNew';
import { EmployeeDetail } from '@/app/EmployeeDetail';
import { MastersPage } from '@/app/MastersPage';
import { InsuranceRatesPage } from '@/app/InsuranceRatesPage';
import { DutyRostersPage } from '@/app/DutyRostersPage';
import { DutyRosterDetail } from '@/app/DutyRosterDetail';
import { AttendanceOperationsPage } from '@/app/AttendanceOperationsPage';
import { DailyAttendancePage } from '@/app/DailyAttendancePage';
import { WeeklyHoursPage } from '@/app/WeeklyHoursPage';
import { HolidaysPage } from '@/app/HolidaysPage';
import { CompanyLeavePage } from '@/app/CompanyLeavePage';
import { LeaveCalendarPage } from '@/app/LeaveCalendarPage';
import { LeaveLedgerPage } from '@/app/LeaveLedgerPage';
import { ApprovalsPage } from '@/app/ApprovalsPage';
import { ApprovalDetail } from '@/app/ApprovalDetail';
import './index.css';

const router = createBrowserRouter([
  // 로그인 콜백은 좌측 메뉴 밖에 둔다. 아직 누가 로그인했는지 모른다.
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/new', element: <EmployeeNew /> },
      { path: 'employees/:employeeId', element: <EmployeeDetail /> },
      { path: 'masters', element: <MastersPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'approvals/:requestId', element: <ApprovalDetail /> },
      { path: 'company-leaves', element: <CompanyLeavePage /> },
      { path: 'leave-calendar', element: <LeaveCalendarPage /> },
      { path: 'leave-ledger', element: <LeaveLedgerPage /> },
      { path: 'holidays', element: <HolidaysPage /> },
      { path: 'payroll', element: <PayrollPage /> },
      { path: 'payroll/:payrollId', element: <PayrollDetail /> },
      { path: 'duty', element: <DutyRostersPage /> },
      { path: 'duty/:rosterId', element: <DutyRosterDetail /> },
      { path: 'attendance', element: <DailyAttendancePage /> },
      { path: 'attendance/operations', element: <AttendanceOperationsPage /> },
      { path: 'weekly-hours', element: <WeeklyHoursPage /> },
      { path: 'insurance-rates', element: <InsuranceRatesPage /> },
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
