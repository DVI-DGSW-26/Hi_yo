import { NavLink, Outlet } from 'react-router';
import { AuthGate } from '@/app/AuthGate';
import { clearToken } from '@/lib/auth';
import './AppShell.css';

/**
 * 관리팀 화면의 바깥 틀. 좌측 메뉴 + 본문.
 *
 * **메뉴를 모듈로 묶는다.** 명세서의 화면 인벤토리가 이미 인사정보·연차·근태·급여로 나뉘어
 * 있고, 관리팀 화면은 16개까지 늘어난다. 평평한 목록으로 두면 찾는 데 시간이 걸린다.
 * 그룹 이름은 인벤토리의 모듈명을 그대로 쓴다 — 여기서 새로 짓지 않는다.
 *
 * **만들어진 화면만 올린다.** 상세 스펙이 없어도 데이터 모델과 API가 확정된 것은 올렸다
 * (보험 요율·당직·52시간, 명세서 3장 "그 외 화면은 데이터 모델 및 화면 인벤토리를 기준으로
 * 준용"). 아직 못 만든 화면을 회색으로 늘어놓지 않는다 — 눌러도 아무 데도 안 가는 줄이
 * 메뉴의 절반이면 메뉴를 안 읽게 된다.
 */
const MENU = [
  {
    module: '인사정보',
    items: [{ to: '/employees', label: '직원' }],
  },
  {
    module: '연차',
    items: [
      { to: '/leave-calendar', label: '연차 달력' },
      { to: '/approvals', label: '연차 결재' },
      { to: '/leave-ledger', label: '연차관리대장' },
      { to: '/company-leaves', label: '단체연차' },
      { to: '/holidays', label: '공휴일' },
    ],
  },
  {
    module: '근태',
    items: [
      { to: '/attendance', label: '근태 현황' },
      { to: '/duty', label: '당직' },
      { to: '/weekly-hours', label: '52시간' },
    ],
  },
  {
    module: '급여',
    items: [
      { to: '/payroll', label: '급여 계산' },
      { to: '/insurance-rates', label: '보험 요율' },
    ],
  },
] as const;

export function AppShell() {
  return (
    <AuthGate>
      {(me) => (
        <div className="shell">
          {/* 스크린리더가 "주요 메뉴"로 읽는다. 본문과 구분되는 랜드마크가 된다. */}
          <nav className="shell-nav" aria-label="주요 메뉴">
            <div className="shell-brand">
              <NavLink to="/">HR 관리</NavLink>
            </div>

            {MENU.map((group) => (
              <div key={group.module} className="shell-group">
                {/* 모듈 이름은 누를 수 없다. 갈 곳이 아니라 묶음의 이름이다. */}
                <h2 className="shell-module">{group.module}</h2>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => (isActive ? 'shell-link is-active' : 'shell-link')}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}

            {/*
              누구로 보고 있는지를 메뉴 맨 아래에 둔다. 관리팀 화면은 권한에 따라
              보이는 것이 달라서, 계정을 모르면 화면을 잘못 읽는다.
              로그아웃은 토큰을 지우는 것이 전부다 — 전 서비스 동시 로그아웃은 아직 없다.
            */}
            <div className="shell-account">
              <span className="shell-account-name">{me.name}</span>
              <button
                type="button"
                className="shell-logout"
                onClick={() => {
                  clearToken();
                  window.location.assign('/');
                }}
              >
                로그아웃
              </button>
            </div>
          </nav>
          <main className="shell-main">
            <Outlet />
          </main>
        </div>
      )}
    </AuthGate>
  );
}
