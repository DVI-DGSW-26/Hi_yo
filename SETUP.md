# 개발 환경 준비

## 요구 사항

- Node.js 20 이상 (확인: `node -v` — 현재 v24.18.0에서 구성함)
- npm 10 이상
- iOS 실기기/시뮬레이터 빌드는 macOS 필요. Windows에서는 Android + Expo Go/Development Build로 개발한다.

## 설치

리포지터리 루트에서 한 번만 실행한다. npm workspaces라 하위 앱에서 따로 설치하지 않는다.

```bash
npm install
```

## 실행

```bash
npm run mobile     # Expo 개발 서버 (apps/mobile)
npm run admin      # Vite 개발 서버 (apps/admin)
```

타입 검사:

```bash
npm run typecheck --workspace @hr/mobile
```

## 구조

```
apps/mobile      Expo (React Native) + expo-router. 본인용 화면 전부
apps/admin       React + Vite. 관리팀 화면
packages/tokens  컬러/타이포/여백 토큰. 양쪽이 공유 (@hr/tokens)
docs/            디자인 규칙 등 확정 문서
```

`apps/mobile/metro.config.js`는 모노레포용으로 손봐둔 상태다.
`packages/tokens`를 Metro가 추적하도록 `watchFolders`와 `nodeModulesPaths`를 지정했으니 지우지 않는다.

## EAS (사내 배포 / OTA)

`apps/mobile/eas.json`에 프로필 3개가 있다.

| 프로필 | 용도 |
|---|---|
| `development` | Development Build. 네이티브 모듈 붙일 때 쓴다 |
| `preview` | internal distribution. 사내 링크 배포 |
| `production` | 스토어 / TestFlight |

```bash
npm i -g eas-cli
eas login
eas build:configure          # projectId 발급 — 최초 1회
eas build --profile preview --platform android
eas update --channel preview --message "..."
```

`eas build:configure`를 돌리기 전까지 `app.json`에 `extra.eas.projectId`가 없어서 EAS 명령이 실패한다.

### 번들 식별자

```
ios.bundleIdentifier  com.dvi.hr
android.package       com.dvi.hr
```

**첫 TestFlight 업로드 전까지만 바꿀 수 있다.** 한 번 올라가면 고정이다.
Apple Developer 등록 시 App ID와 맞춰야 하므로, 다른 값을 쓰기로 했다면 지금 `app.json`에서 고친다.

## 폰트

Pretendard Regular(400)·Medium(500)을 `assets/fonts/`에 두고 `expo-font` config plugin으로
네이티브에 임베드한다. `fontFamily: Pretendard` 하나로 `fontWeight` 400/500이 갈린다.

**Expo Go에서는 폰트가 적용되지 않는다.** 네이티브 임베드 방식이라 Development Build가 필요하다.

```bash
eas build --profile development --platform android
```

폰트 설정을 바꿨는지 로컬에서 확인만 하려면:

```bash
npx expo prebuild --platform android --no-install
cat android/app/src/main/res/font/xml_pretendard.xml   # weight 400/500 매핑
grep ReactFontManager android/app/src/main/java/com/dvi/hr/MainApplication.kt
rm -rf android                                          # 확인 후 지운다
```

`android/`·`ios/`는 커밋하지 않는다(gitignore). 필요할 때 prebuild로 다시 만든다.
prebuild는 `package.json`의 `android`·`ios` 스크립트를 `expo run:*`로 바꿔놓으므로
지운 뒤 `expo start --*`로 되돌린다.

## 먼저 처리해야 할 것

- [ ] **Apple Developer Program 조직 계정 등록** — D-U-N-S 번호 확인에 며칠~2주. 코드보다 먼저 시작한다.
- [ ] API 명세 + 인증 방식 확정 → `apps/mobile/src/lib/api.ts`
- [ ] 전자서명 구현 방식 확정 → 연차 모듈 전체가 걸려 있다
- [ ] `docs/DESIGN_RULES.md` 2~9장 확정 (특히 6장 문구 규칙)
- [ ] S-101/302/501/502/601 화면 상세 스펙
- [ ] 리포지터리 private 전환 — org owner(`dvi-admin`, `YoonJinPark`) 권한 필요

완료: 디자인 토큰·공통 컴포넌트·Pretendard (2026-08-24)
