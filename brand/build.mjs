// Hi_yo 로고 에셋 생성기.
//
// 이 파일이 로고의 원본이다. SVG 를 손으로 고치지 말고 여기 값을 고친 뒤
//   node brand/build.mjs
// 를 돌린다. 색은 packages/tokens/src/colors.ts 와 같은 값을 쓴다.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));

// 로고 고유색이다. UI 토큰(packages/tokens/src/colors.ts)과 일부러 다르다 —
// 로고는 받은 원본이 최종이고, 토큰에 맞춰 고치지 않는다 (2026-09-11).
//
// 앱 화면에서 이 색을 쓰지 않는다. 화면의 초록은 colors.primary(#00C471) 하나뿐이다.
// 헤더 로고와 그 아래 Primary 버튼이 서로 다른 초록으로 보이는 것은 알고 두는 것이다.
const GREEN = '#1D9E75'; // 로고 전용. colors.primary 가 아니다
const INK = '#2C2C2A';   // 로고 전용. colors.textStrong 이 아니다
const WHITE = '#FFFFFF'; // colors.white 와 같다

// 스마일을 베이스라인에서 얼마나 끌어올릴지. 원본대로 0 이다 — 스마일은
// 베이스라인 아래에 놓인 "입"이고, 그것이 이 로고의 의도다. 바꾸지 않는다.
const SMILE_DY = Number(process.env.SMILE_DY ?? 0);

const round = (n, d = 1) => Number(n.toFixed(d));

// --- 글리프 -----------------------------------------------------------------
// 좌표계 원점은 "H" 의 왼쪽 아래(베이스라인). 위가 음수다.
const HI = 'M115.8 -139.6V0H87.8V-59.4H28V0H0V-139.6H28V-82.2H87.8V-139.6ZM140.4 -140.4Q140.4 -147.4 145.3 -152.1Q150.2 -156.8 157.6 -156.8Q165 -156.8 169.9 -152.1Q174.8 -147.4 174.8 -140.4Q174.8 -133.4 169.9 -128.7Q165 -124 157.6 -124Q150.2 -124 145.3 -128.7Q140.4 -133.4 140.4 -140.4ZM171.4 -110.8V0H143.4V-110.8Z';
const YO = 'M413.6 -110.8 345 52.4H315.2L339.2 -2.8L294.8 -110.8H326.2L354.8 -33.4L383.8 -110.8ZM421.6 -55.4Q421.6 -72.4 429.1 -85.4Q436.6 -98.4 449.6 -105.5Q462.6 -112.6 478.6 -112.6Q494.6 -112.6 507.6 -105.5Q520.6 -98.4 528.1 -85.4Q535.6 -72.4 535.6 -55.4Q535.6 -38.4 527.9 -25.4Q520.2 -12.4 507.1 -5.3Q494 1.8 477.8 1.8Q461.8 1.8 449 -5.3Q436.2 -12.4 428.9 -25.4Q421.6 -38.4 421.6 -55.4ZM506.8 -55.4Q506.8 -71.2 498.5 -79.7Q490.2 -88.2 478.2 -88.2Q466.2 -88.2 458.1 -79.7Q450 -71.2 450 -55.4Q450 -39.6 457.9 -31.1Q465.8 -22.6 477.8 -22.6Q485.4 -22.6 492.1 -26.3Q498.8 -30 502.8 -37.4Q506.8 -44.8 506.8 -55.4Z';

// 글자 크기 상수. 여백·정렬 계산이 전부 여기서 나온다.
const HI_W = 174.8;   // "Hi" 가로
const HI_H = 156.8;   // "i" 점 끝까지의 세로
const CAP = 139.6;    // 글자 높이(cap height). 여백 규칙의 기준이다.

// 스마일은 획(stroke)이다. linecap="round" 라 폭 20 의 절반인 10 이
// 양 끝·아래로 더 뻗는다. 아래 경계값은 그것까지 센 값이다.
const SMILE_W = 20;
const SMILE_BOX = { w: 100, h: 46 };            // 획까지 포함한 심볼 경계
const SMILE_MARK = 'M10 10Q50 62 90 10';        // 그 경계에 원점을 맞춘 형태
const smile = (dy = SMILE_DY) => `M194.8 ${-12 - dy}Q234.8 ${40 - dy} 274.8 ${-12 - dy}`;

// --- 경계 -------------------------------------------------------------------
// 가로: H 왼쪽 0 ~ o 오른쪽 535.6. 스마일(184.8~284.8)은 그 안에 든다.
// 세로: i 점 위 -156.8 ~ y 내림 +52.4. 스마일 아래끝(24-dy)도 그 안에 든다.
const W = 535.6;
const TOP = -HI_H;
const BOTTOM = 52.4;
const H = BOTTOM - TOP;

const head = (w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Hi_yo">`;

function wordmark({ letters, smileColor }) {
  return [
    head(round(W), round(H)),
    `<g transform="translate(0,${-TOP})">`,
    `<path d="${HI}" fill="${letters}"/>`,
    `<path d="${smile()}" fill="none" stroke="${smileColor}" stroke-width="${SMILE_W}" stroke-linecap="round"/>`,
    `<path d="${YO}" fill="${letters}"/>`,
    `</g></svg>`,
  ].join('');
}

// 스마일만 떼어낸 심볼.
function mark(color) {
  return [
    head(SMILE_BOX.w, SMILE_BOX.h),
    `<path d="${SMILE_MARK}" fill="none" stroke="${color}" stroke-width="${SMILE_W}" stroke-linecap="round"/>`,
    `</svg>`,
  ].join('');
}

// 앱 아이콘. 바탕 그린 + 흰 "Hi" + 흰 스마일.
// 흰색과 그린의 대비는 2.3:1 이다 — 글자를 읽히게 하는 용도로 쓰지 않는다.
function icon() {
  const S = 512;
  const ICON_HI_W = 200;    // 아이콘 안에서 "Hi" 가 차지할 가로
  const ICON_SMILE_W = 170; // 스마일이 차지할 가로
  const GAP = 26;           // 베이스라인과 스마일 사이

  const hiScale = ICON_HI_W / HI_W;
  const hiH = HI_H * hiScale;
  const smileScale = ICON_SMILE_W / SMILE_BOX.w;
  const smileH = SMILE_BOX.h * smileScale;

  const top = (S - (hiH + GAP + smileH)) / 2;
  const baseline = top + hiH;

  return [
    head(S, S),
    `<rect width="${S}" height="${S}" rx="${round(S * 0.2237)}" fill="${GREEN}"/>`,
    `<g transform="translate(${round((S - ICON_HI_W) / 2)},${round(baseline)}) scale(${round(hiScale, 4)})">`,
    `<path d="${HI}" fill="${WHITE}"/></g>`,
    `<g transform="translate(${round((S - ICON_SMILE_W) / 2)},${round(baseline + GAP)}) scale(${round(smileScale, 4)})">`,
    `<path d="${SMILE_MARK}" fill="none" stroke="${WHITE}" stroke-width="${SMILE_W}" stroke-linecap="round"/></g>`,
    `</svg>`,
  ].join('');
}

const files = {
  // 밝은 배경 기본형.
  'hiyo-logo.svg': wordmark({ letters: INK, smileColor: GREEN }),
  // 어두운 배경. 글자만 흰색으로 뒤집고 그린은 그대로 둔다.
  'hiyo-logo-on-dark.svg': wordmark({ letters: WHITE, smileColor: GREEN }),
  // 진짜 단색. 스마일까지 한 색이다 — 팩스·각인·1도 인쇄용.
  'hiyo-logo-mono.svg': wordmark({ letters: INK, smileColor: INK }),
  'hiyo-logo-mono-reverse.svg': wordmark({ letters: WHITE, smileColor: WHITE }),
  // 심볼 단독.
  'hiyo-mark.svg': mark(GREEN),
  'hiyo-mark-mono.svg': mark(INK),
  'hiyo-mark-mono-reverse.svg': mark(WHITE),
  // 앱 아이콘.
  'hiyo-icon.svg': icon(),
};

for (const [name, svg] of Object.entries(files)) {
  writeFileSync(join(OUT, name), svg + '\n');
  console.log(`${name.padEnd(30)} ${String(svg.length + 1).padStart(5)} B`);
}

export { GREEN, INK, WHITE, CAP, W, H, files };
