import { Redirect, Stack } from 'expo-router';

/**
 * 로그인하고 돌아오는 자리 — `hr://auth/callback#token=<JWT>`
 *
 * **화면이 하는 일은 없다. 그런데 파일이 있어야 한다.**
 *
 * 토큰을 꺼내 저장하는 것은 `AuthGate`가 한다. 그쪽이 `Linking.useURL()`로 딥링크를
 * 직접 보고 있어서 라우트가 필요 없어 보였는데, **`expo-router`도 같은 딥링크를 받아
 * `/auth/callback`으로 이동하려 한다.** 맞는 파일이 없으면 「Unmatched Route」가 뜨고,
 * 토큰이 멀쩡히 저장된 뒤에도 사용자는 그 화면에 갇힌다 — 돌아갈 버튼이 없다.
 *
 * **2026-09-08 안드로이드 실기기에서 드러났다.** 로그인·딥링크·서명 전부 통과한 뒤
 * 마지막에 이것 하나로 막혀 있었다. 배포 빌드로 기기에서 로그인을 끝까지 해봐야
 * 보이는 자리다 — 개발 빌드는 주소가 `exp://.../--/auth/callback`이라 라우터가 다르게
 * 다룬다.
 *
 * 그래서 여기서는 **집으로 보내기만 한다.** 토큰이 아직 없으면 `AuthGate`가 로그인
 * 화면을 그리고, 있으면 `/`가 그려진다. 어느 쪽이든 이 자리에 머물 이유가 없다.
 *
 * `replace`로 보내는 것이 중요하다 — 뒤로가기로 콜백 주소에 돌아오면 아무것도 없다.
 */
export default function AuthCallbackScreen() {
  return (
    <>
      {/* 보내기 전 한 프레임이 그려진다. 헤더에 `callback` 이 스치지 않게 지운다 */}
      <Stack.Screen options={{ headerShown: false }} />
      <Redirect href="/" />
    </>
  );
}
