import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography } from '@hr/tokens';
import { ApiError } from '@hr/api';
import { Button, Section } from '@/components';
import {
  callbackUrl,
  getToken,
  isCallbackUrl,
  loadToken,
  loginRetryUsed,
  readCallbackUrl,
  redirectToLoginOnce,
  setToken,
  startLogin,
} from '@/lib/auth';
import { authKeys, useAuthMe } from './api';

/**
 * 로그인하지 않았으면 화면을 그리지 않는다.
 *
 * 관리팀 화면의 `AuthGate`와 같은 판단을 한다. 다른 것은 **돌아오는 길**뿐이다 —
 * 웹은 콜백 페이지가 있지만 앱은 딥링크(`hr://auth/callback#token=...`)로 깨어난다.
 *
 * **`admin`으로 화면을 가르지 않는다.** 본인용 앱이라 관리팀이든 아니든 보는 것이 같다.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string>();
  const me = useAuthMe();

  // 저장해 둔 토큰을 메모리로 올린다. 그 전에는 로그인 화면을 보여주지 않는다 —
  // 이미 로그인한 사람에게 로그인 화면이 잠깐 스치면 안 된다.
  useEffect(() => {
    let alive = true;
    loadToken().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 서버가 돌려보낸 딥링크. 앱이 꺼져 있었으면 이 URL로 깨어난다.
  const url = Linking.useURL();
  const handled = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!url || !isCallbackUrl(url) || handled.current === url) return;
    handled.current = url;

    const { token, error } = readCallbackUrl(url);
    if (token) {
      setFailure(undefined);
      setToken(token).then(() => {
        // 토큰이 생겼으니 다시 물어본다.
        queryClient.invalidateQueries({ queryKey: authKeys.me });
      });
      return;
    }
    // 서버가 준 사유를 그대로 보여준다. 앱에서 문구를 만들지 않는다.
    setFailure(error ?? '로그인 결과를 받지 못했어요.');
  }, [url, queryClient]);

  if (!ready) return <Loading />;

  if (getToken() === null) {
    return (
      <Screen
        title="DVI 계정으로 로그인해주세요"
        body={
          failure ??
          '사내 통합 로그인을 써요. 브라우저에서 로그인하면 앱으로 돌아와요.'
        }
        action="로그인하기"
      />
    );
  }

  if (me.isPending) return <Loading />;

  if (me.error) {
    const unauthorized = me.error instanceof ApiError && me.error.kind === 'unauthorized';

    // 만료였다면 한 번은 조용히 다시 다녀온다.
    if (unauthorized && !loginRetryUsed()) {
      void redirectToLoginOnce();
      return <Loading />;
    }

    return (
      <Screen
        title="로그인했는데 들어갈 수 없어요"
        body={
          unauthorized
            ? `${me.error.message} 계정이 아직 인사 정보에 연결되지 않았을 수 있어요. 관리팀에 알려주세요.`
            : me.error.message
        }
        action="다시 로그인하기"
      />
    );
  }

  return <>{children}</>;
}

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.textWeak} />
    </View>
  );
}

/** 로그인 전 화면. 하단 CTA 대신 본문 안에 버튼을 둔다 — 다른 내용이 없는 화면이다 */
function Screen({ title, body, action }: { title: string; body: string; action: string }) {
  return (
    <View style={styles.center}>
      <Section>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.action}>
          <Button label={action} onPress={() => void startLogin()} />
        </View>
        {/*
          개발 빌드에서만 보여준다. 서버에 등록할 콜백 주소가 빌드마다 달라서,
          기기에서 실제 값을 읽어 알려줘야 로그인이 완주된다 (.env.example).
          운영 빌드에는 나오지 않는다 — 사용자에게 의미 없는 값이다.
        */}
        {__DEV__ && <Text style={styles.debug}>콜백 주소 · {callbackUrl()}</Text>}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  title: {
    ...typography.headline,
    color: colors.textStrong,
  },
  body: {
    ...typography.body,
    color: colors.textBody,
    marginTop: spacing.tight,
  },
  action: {
    marginTop: spacing.sectionTitleGap,
  },
  debug: {
    ...typography.caption,
    color: colors.textWeak,
    marginTop: spacing.sectionTitleGap,
  },
});
