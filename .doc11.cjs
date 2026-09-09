const fs=require('fs');
const p='docs/01_물어볼_것.md';
let s=fs.readFileSync(p,'utf8');
const nl=s.includes('\r\n')?'\r\n':'\n';

// 30·31·32 줄을 줄 단위로 걸러낸다 (정규식 대신 확실하게)
const lines=s.split(/\r?\n/);
const kept=lines.filter(l=>!/^\|\s*3[012]\s*\|/.test(l));
console.log('지운 줄', lines.length-kept.length);
s=kept.join(nl);

function rep(re,to){const b=s;s=s.replace(re,to.replace(/\n/g,nl));if(s===b)throw new Error('안 걸림: '+String(re).slice(0,50));}

rep(/\*\*30·31·32는 한 덩어리다\*\*[\s\S]*?답을 기다리는 중\*\*이라 여기 둔다\./,
`**30·31·32도 답이 왔다** (2026-09-09) — 아래 「모바일 인증 전환」을 본다.
20번은 관리팀 근태 시트에서 답이 나왔다 — 「생산직(시급): 지각, 외출, 조퇴, 결근시
공제, 30분 단위」이고 관리직은 표시만이다. 화면 문구가 이미 그렇게 되어 있어 고칠 것이
없었다.`);

rep(/### 서버가 아직 못 준 것 \(기다린다\)/,
`### 모바일 인증 전환 — 이제 만들 수 있다 (2026-09-09)

**30·31·32의 답이 다 왔다.**

| 물어본 것 | 답 |
|---|---|
| API가 Keycloak 토큰을 받는가 | **받는다.** \`hi-yo-app\`이 허용 목록에 있다 |
| 앱용 클라이언트 | **\`hi-yo-app\`이 terraform으로 이미 만들어져 있다** |
| 중계 경로는 유지되는가 | **유지된다** — 관리팀 웹이 계속 쓴다. 없앨 계획 없다 |

**급하지 않다.** 중계 경로가 유지되므로 지금 배포된 APK가 계속 돈다. 전환 시점을
우리가 고를 수 있다.

**전환하면 라이브러리가 하나 늘어난다** — \`expo-auth-session\` 또는
\`react-native-app-auth\`. \`CLAUDE.md\` 7장이 라이브러리 추가를 사람에게 먼저 제안하라고
하므로 **아직 고르지 않았다.**

discovery로 확인한 값 (\`.well-known/openid-configuration\`, 2026-09-09) —

| | |
|---|---|
| issuer | \`https://api.dvi-ind.com/dauth/realms/dvi\` |
| PKCE | \`S256\` 지원 |
| \`end_session\` | \`.../protocol/openid-connect/logout\` |

**남은 요청 하나는 인프라 담당자 몫이다** — \`post_logout_redirect_uri\` 등록
(\`hi-yo\`·\`hi-yo-app\` 양쪽). 이것이 있어야 관리팀 화면의 「다른 계정으로 로그인하기」가
실제로 계정을 바꾼다. 지금은 Keycloak 세션이 남아 같은 계정으로 다시 들어온다.

### 서버가 아직 못 준 것 (기다린다)`);

fs.writeFileSync(p,s);
console.log('고침');
