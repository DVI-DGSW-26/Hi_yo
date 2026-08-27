# 개발 환경 준비

## 요구 사항

- Node.js 20 이상 (확인: `node -v` — 현재 v24.18.0에서 구성함)
- npm 10 이상
- iOS 실기기/시뮬레이터는 macOS 필요. **Windows에서는 Android 개발 빌드로 개발한다.**

## 설치

리포지터리 루트에서 한 번만 실행한다. npm workspaces라 하위 앱에서 따로 설치하지 않는다.

```bash
npm install
```

### 루트 `package.json`의 `overrides`를 지우지 않는다

네이티브 빌드는 같은 모듈을 **한 버전만** 담는다. `expo-modules-core`가 받는
`react-native-worklets` 범위를 `expo-router`가 넘겨버려 C++ 컴파일이 깨진 적이 있다.
`react`도 중복이었다. 지우면 EAS 빌드가 다시 깨진다.

확인은 `npx expo-doctor` (21/21 통과가 정상).

## 환경 변수 — 이걸 안 하면 앱이 안 뜬다

두 앱 모두 `.env`가 필요하다. `.env`는 커밋되지 않는다.

```bash
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example  apps/admin/.env
```

| | 값 |
|---|---|
| 개발 서버 | `https://api.dvi-ind.com/hi-yo` |
| Swagger | `https://api.dvi-ind.com/hi-yo/swagger-ui/index.html` |

**인증은 아직 개발용 스텁이다.** 사내 OAuth가 완성되면 없어진다.
`X-Debug-Employee-No: employee:<직원 id>` 헤더를 붙인다.

| id | 계정 |
|---|---|
| `1` | 사원001, 관리팀 |
| `2` | 사원002, 일반 직원 |
| `3` | 사원003, 관리팀 (결재 2단계 확인용) |

모바일은 `EXPO_PUBLIC_DEV_EMPLOYEE_ID=2`, 관리팀 화면은 `VITE_DEV_EMPLOYEE_ID=1`이 기본값이다.
관리팀 화면을 `2`로 두면 목록 조회가 403으로 막힌다.

이 헤더는 **개발 빌드에서만** 붙는다 (`__DEV__` / `import.meta.env.DEV`).
최종 인증이 정해지면 `src/lib/devAuth.ts`를 통째로 지운다.

## 실행

```bash
npm run mobile     # Expo 개발 서버 (apps/mobile)
npm run admin      # Vite 개발 서버 (apps/admin) — http://localhost:5173
```

타입 검사:

```bash
npm run typecheck --workspace @hr/mobile
npm run typecheck --workspace @hr/admin
```

## 구조

```
apps/mobile      Expo (React Native) + expo-router. 본인용 화면 전부
apps/admin       React + Vite + react-router. 관리팀 화면
packages/tokens  컬러/타이포/여백 토큰 (@hr/tokens)
packages/api     HTTP 클라이언트·오류 정규화·목록 봉투 타입 (@hr/api)
packages/format  숫자 표기 — 금액·근무시간·연차 일수 (@hr/format)
docs/            확정 문서. 먼저 읽는다
```

`packages/*`는 **양쪽이 공유한다.** 서버 오류 규칙이나 금액 표기가 바뀌면 여기 한 곳만 고친다.
`packages/api`에는 플랫폼과 무관한 것만 둔다 — 인증과 baseURL은 앱이 넣는다.

`apps/mobile/metro.config.js`는 모노레포용이다. `packages/*`를 Metro가 추적하도록
`watchFolders`와 `nodeModulesPaths`를 지정했으니 지우지 않는다.

`apps/admin`은 `src/lib/applyTokens.ts`가 토큰을 CSS 변수로 심는다.
**CSS에 hex나 여백 숫자를 직접 적지 않는다.**

## 모바일 실행 — Expo Go로는 안 된다

**Expo Go에서는 이 프로젝트가 뜨지 않는다.** 폰이 매니페스트만 받고 번들을 받아가지 않는다.
`app.json`의 `expo-font` 플러그인도 Expo Go에서는 적용되지 않아 Pretendard가 나오지 않는다.

**개발 빌드(Development Build)를 폰에 설치하고, 거기서 Metro에 붙는다.**

```bash
npx eas-cli@latest login          # 브라우저 OAuth 로 열린다
npx eas-cli@latest build --profile development --platform android
```

EAS 프로젝트는 이미 연결돼 있다 (`@sehuiiiiiiii/hr-mobile`, `app.json`의 `extra.eas.projectId`).
`eas build:configure`를 다시 돌릴 필요 없다.

빌드가 끝나면 나오는 APK 링크를 폰에서 열어 설치한다. 그다음:

1. `npm run mobile` 로 Metro 를 띄운다
2. 폰의 `HR` 앱에서 PC 의 LAN 주소(`<PC IP>:8081`)를 넣는다
3. 이후 코드 수정은 Metro 로 바로 반영된다. **재빌드할 일 없다**

> 삼성폰은 `설정 → 보안 및 개인정보 보호 → 자동 차단`이 켜져 있으면 APK 설치가 조용히 막힌다.

### iOS

**지금은 실기기 확인이 불가능하다.** 유료 Apple Developer Program 계정이 없다.
시뮬레이터 빌드는 macOS 가 필요하다.

## EAS 프로필

`apps/mobile/eas.json`에 셋이 있다.

| 프로필 | 용도 |
|---|---|
| `development` | Development Build. 지금 개발은 전부 이걸로 한다 |
| `preview` | internal distribution. 사내 링크 배포 |
| `production` | 스토어 / TestFlight |

`.env`는 EAS 빌드에 올라가지 않는다(gitignore 대상). 개발 빌드는 JS를 로컬 Metro에서 받아오므로
문제없지만, **preview·production 빌드는 EAS 환경 변수를 따로 등록해야 한다.**

### 번들 식별자

```
ios.bundleIdentifier  com.dvi.hr
android.package       com.dvi.hr
```

**첫 TestFlight 업로드 전까지만 바꿀 수 있다.** 한 번 올라가면 고정이다.

### EAS 소유 계정

지금 `app.json`의 `owner`가 개인 계정(`sehuiiiiiiii`)이다.
회사 조직으로 옮기려면 `owner`를 바꾸고 프로젝트를 다시 연결한다.

## 폰트

Pretendard Regular(400)·Medium(500).

- 모바일 — `assets/fonts/`에 두고 `expo-font` config plugin으로 네이티브에 임베드
- 관리팀 화면 — `public/fonts/`에 두고 `@font-face`

`fontFamily: Pretendard` 하나로 `fontWeight` 400/500이 갈린다. **600 이상은 프로젝트에 없다.**

폰트 설정을 바꿨는지 로컬에서 확인만 하려면:

```bash
npx expo prebuild --platform android --no-install
cat android/app/src/main/res/font/xml_pretendard.xml   # weight 400/500 매핑
rm -rf android                                          # 확인 후 지운다
```

`android/`·`ios/`는 커밋하지 않는다. prebuild는 `package.json`의 `android`·`ios` 스크립트를
`expo run:*`로 바꿔놓으므로 지운 뒤 되돌린다.

## 먼저 읽을 것

1. `docs/00_문서_인덱스.md` — 무엇이 확정됐고 무엇이 비어 있는지
2. `docs/DESIGN_RULES.md` — UI 코드를 한 줄이라도 쓰기 전에
3. `docs/DESIGN_SYSTEM.md` — 값과 컴포넌트 (React Native 기준)
4. `docs/DESIGN_ADMIN.md` — 관리팀 화면 규칙 (표·폼·버튼·대화상자)
5. `docs/API_급여.md` — 급여 · 보험 요율 엔드포인트
6. `docs/API_신청결재.md` — 연차 · 반차 · 조퇴 등 신청과 결재 엔드포인트

## 먼저 처리해야 할 것

- [ ] **Apple Developer Program 조직 계정 등록** — D-U-N-S 번호 확인에 며칠~2주. 코드보다 먼저 시작한다.
      이게 없으면 iOS 확인도 TestFlight 배포도 못 한다.
- [ ] **인증 방식 확정** — 지금은 개발용 스텁이다. 정해지면 `devAuth.ts`를 지우고 인터셉터를 바꾼다
- [ ] **재직증명서 단건·PDF 권한 검증** — 서버에 구멍이 있다 (`docs/00_문서_인덱스.md` 참고)
- [ ] 전자서명 구현 방식 확정 → S-302가 걸려 있다
- [ ] `docs/DESIGN_RULES.md` 2~9장 확정 (특히 6장 문구 규칙)
- [ ] S-101/302/501/502/601 화면 상세 스펙
- [ ] 리포지터리 private 전환 — org owner(`dvi-admin`, `YoonJinPark`) 권한 필요

완료
- 디자인 토큰·공통 컴포넌트·Pretendard (2026-08-24)
- API 명세(급여)·개발 서버·개발 빌드 (2026-08-26)
- 관리팀 화면 디자인 규칙 (2026-08-26)
