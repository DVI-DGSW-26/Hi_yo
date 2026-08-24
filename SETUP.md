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

## 먼저 처리해야 할 것

- [ ] **Apple Developer Program 조직 계정 등록** — D-U-N-S 번호 확인에 며칠~2주. 코드보다 먼저 시작한다.
- [ ] `docs/DESIGN_SYSTEM.md` 작성 → `packages/tokens` 값 채우기 (지금 전부 비어 있음)
- [ ] `docs/DESIGN_RULES.md` 2~9장 확정
- [ ] API 명세 확정 → `apps/mobile/src/lib/api.ts` 베이스 URL·인증 방식
