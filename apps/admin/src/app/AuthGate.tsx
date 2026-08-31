import type { ReactNode } from 'react';
import { ApiError } from '@hr/api';
import { Button } from '@/components';
import { clearToken, hasToken, loginRetryUsed, redirectToLoginOnce, startLogin } from '@/lib/auth';
import { useAuthMe, type AuthMe } from '@/features/auth/api';
import './AuthScreen.css';

/**
 * 로그인하지 않았으면 화면을 그리지 않는다.
 *
 * **메뉴부터 감춘다.** 로그인 전에 좌측 메뉴를 보여주면 눌러도 전부 401이고,
 * 어디까지 볼 수 있는 사람인지도 아직 모른다.
 *
 * **401에 자동으로 다시 로그인하는 것은 한 번뿐이다** (`lib/auth.ts`).
 * 만료가 아니라 Keycloak 그룹에 없거나 인사 정보에 연결되지 않은 계정도 401이고,
 * 그 경우는 다시 로그인해도 계속 401이라 무한 루프에 빠진다.
 */
export function AuthGate({ children }: { children: (me: AuthMe) => ReactNode }) {
  const me = useAuthMe();

  if (!hasToken()) {
    return (
      <Screen title="DVI 계정으로 로그인해주세요">
        <p className="page-lead">
          사내 통합 로그인을 씁니다. 로그인하면 인사시스템으로 돌아와요.
        </p>
        <div className="auth-actions">
          <Button label="로그인하기" variant="primary" onClick={startLogin} />
        </div>
      </Screen>
    );
  }

  if (me.isPending) {
    return (
      <Screen title="불러오는 중이에요">
        <p className="page-lead">로그인한 계정을 확인하고 있어요.</p>
      </Screen>
    );
  }

  if (me.error) {
    const unauthorized = me.error instanceof ApiError && me.error.kind === 'unauthorized';

    // 만료였다면 한 번은 조용히 다시 다녀온다. 이동이 시작되면 이 화면은 곧 사라진다.
    if (unauthorized && !loginRetryUsed() && redirectToLoginOnce()) {
      return (
        <Screen title="다시 로그인하는 중이에요">
          <p className="page-lead">잠시만 기다려주세요.</p>
        </Screen>
      );
    }

    return (
      <Screen title="로그인했는데 들어갈 수 없어요">
        <p className="page-lead">{me.error.message}</p>
        {unauthorized && (
          <p className="page-lead">
            계정이 아직 인사 정보에 연결되지 않았거나, 사내 그룹에 속해 있지 않을 수 있어요.
            서버 담당자에게 Keycloak 아이디를 알려주면 연결해줘요.
          </p>
        )}
        <div className="auth-actions">
          <Button label="다시 로그인하기" variant="primary" onClick={startLogin} />
        </div>
      </Screen>
    );
  }

  // 관리 권한은 서버가 판정한다. 토큰의 롤을 보지 않는다.
  if (!me.data.admin) {
    return (
      <Screen title="관리팀 화면이에요">
        <p className="page-lead">
          {me.data.name}님은 이 화면을 볼 수 있는 권한이 없어요. 본인 화면은 모바일 앱에 있어요.
        </p>
        <div className="auth-actions">
          <Button
            label="다른 계정으로 로그인하기"
            onClick={() => {
              clearToken();
              startLogin();
            }}
          />
        </div>
      </Screen>
    );
  }

  return <>{children(me.data)}</>;
}

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth-screen">
      <div className="auth-box">
        <h1 className="page-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
