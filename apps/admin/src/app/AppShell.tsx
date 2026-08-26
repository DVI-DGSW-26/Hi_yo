import { NavLink, Outlet } from 'react-router';
import './AppShell.css';

/**
 * 관리팀 화면의 바깥 틀. 좌측 메뉴 + 본문.
 *
 * 아직 화면이 하나도 없다. 메뉴는 명세서에 상세 스펙이 있는 세 개만 걸어두고,
 * 스펙이 없는 화면은 올리지 않는다.
 */
const MENU = [
  { to: '/employees', label: '직원' },
  { to: '/approvals', label: '연차 결재' },
  { to: '/payroll', label: '급여' },
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
