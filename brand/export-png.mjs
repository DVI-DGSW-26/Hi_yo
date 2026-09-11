// SVG → PNG. 헤드리스 Chrome 으로 찍는다 (별도 의존성 없이 쓰려고).
//   node brand/export-png.mjs
// 배경은 투명하다.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const PNG = join(OUT, 'png');
const TMP = join(OUT, '.tmp-export');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'google-chrome',
].find((p) => {
  try { return readFileSync(p) && true; } catch { return p.indexOf('/') === -1; }
});

// [원본 SVG, 내보낼 이름, 가로 px]
const JOBS = [
  ['hiyo-logo.svg', 'hiyo-logo-1200.png', 1200],
  ['hiyo-logo-on-dark.svg', 'hiyo-logo-on-dark-1200.png', 1200],
  ['hiyo-logo-mono.svg', 'hiyo-logo-mono-1200.png', 1200],
  ['hiyo-logo-mono-reverse.svg', 'hiyo-logo-mono-reverse-1200.png', 1200],
  ['hiyo-mark.svg', 'hiyo-mark-512.png', 512],
  ['hiyo-icon.svg', 'hiyo-icon-1024.png', 1024],
];

mkdirSync(PNG, { recursive: true });
mkdirSync(TMP, { recursive: true });

for (const [src, out, w] of JOBS) {
  const svg = readFileSync(join(OUT, src), 'utf8');
  const [, vw, vh] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const h = Math.round((w * Number(vh)) / Number(vw));

  const page = join(TMP, out + '.html');
  writeFileSync(
    page,
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`,
  );

  execFileSync(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `--screenshot=${join(PNG, out)}`,
    `--window-size=${w},${h}`,
    pathToFileURL(page).href,
  ], { stdio: 'ignore' });

  console.log(`${out.padEnd(34)} ${w}x${h}`);
}

rmSync(TMP, { recursive: true, force: true });
