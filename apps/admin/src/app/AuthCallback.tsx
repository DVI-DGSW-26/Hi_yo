import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components';
import { readCallbackHash, setToken, startLogin } from '@/lib/auth';
import './AuthScreen.css';

/**
 * 로그인 후 서버가 돌려보내는 자리 — `<프런트>/auth/callback#token=<JWT>`.
 *
 * **좌측 메뉴 밖에 둔다.** 아직 누가 로그인했는지 모르는 상태라 메뉴를 그릴 수 없다.
 *
 * 토큰은 **fragment**로 온다. 쿼리스트링이 아닌 이유는 fragment가 서버로 전송되지 않아
 * nginx 접근로그에 토큰이 남지 않기 때문이다. 꺼낸 뒤에는 주소창에서도 지운다 —
 * 그대로 두면 새로고침·뒤로가기·화면 공유에 토큰이 계속 따라다닌다.
 */
export function AuthCallback() {
  const navigate = useNavigate();

  // 주소를 읽는 것은 한 번뿐이다. 아래에서 주소창을 지우므로 다시 읽으면 비어 있다.
  const [result] = useState(() => readCallbackHash(window.location.hash));

  useEffect(() => {
    // 무엇을 하든 토큰이 주소창에 남아 있으면 안 된다. 먼저 지운다.
    window.history.replaceState(null, '', window.location.pathname);

    if (result.token) {
      setToken(result.token);
      navigate('/', { replace: true });
    }
  }, [result, navigate]);

  if (result.token) {
    return (
      <div className="auth-screen">
        <p className="muted">로그인하는 중이에요.</p>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <h1 className="page-title">로그인하지 못했어요</h1>
        {/* 서버가 준 사유를 그대로 보여준다. 앱에서 문구를 만들지 않는다. */}
        <p className="page-lead">{result.error ?? '로그인 결과를 받지 못했어요.'}</p>
        <div className="auth-actions">
          <Button label="다시 로그인하기" variant="primary" onClick={startLogin} />
        </div>
      </div>
    </div>
  );
}
