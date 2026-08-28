import { NavLink, Outlet } from 'react-router';
import './AppShell.css';

/**
 * 관리팀 화면의 바깥 틀. 좌측 메뉴 + 본문.
 *
 * 메뉴는 명세서에 상세 스펙이 있는 세 개에 보험 요율을 더한 것이다.
 * 보험 요율은 화면 스펙이 없지만 서버 API 가 확정돼 있고 조회만 하므로 올렸다.
 * 당직(A-504)도 같다 — 명세서는 인벤토리에만 있고 상세 스펙이 없으나 데이터 모델과
 * API 가 확정돼 있다 (명세서 3장 '그 외 화면은 데이터 모델 및 화면 인벤토리를 기준으로 준용').
 * 그 외에 스펙이 없는 화면은 올리지 않는다.
 */
const MENU = [
  { to: '/employees', label: '직원' },
  { to: '/approvals', label: '연차 결재' },
  { to: '/duty', label: '당직' },
  { to: '/weekly-hours', label: '52시간' },
  { to: '/payroll', label: '급여' },
  { to: '/insurance-rates', label: '보험 요율' },
] as const;

export function AppShell() {
  return (
    <div className="shell">
      <nav className="shell-nav">
        <div className="shell-brand">
          <NavLink to="/">HR 관리</NavLink>
        </div>
        {MENU.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'shell-link is-active' : 'shell-link')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
