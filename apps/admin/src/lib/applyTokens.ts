import { colors, radius, spacing, typography } from '@hr/tokens';

/**
 * `@hr/tokens`의 값을 CSS 변수로 심는다. 앱이 뜨기 전에 한 번 부른다.
 *
 * CSS 파일에 hex나 여백 숫자를 직접 적지 않기 위해서다 (DESIGN_RULES.md 1장 1·2번).
 * 모바일과 관리팀 화면이 같은 값을 쓴다는 보장이 여기서 나온다.
 *
 * 값을 늘리려면 토큰을 먼저 늘린다. 여기에만 추가하지 않는다.
 */
export function applyTokens(root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(colors)) {
    root.style.setProperty(`--color-${kebab(name)}`, value);
  }

  for (const [name, value] of Object.entries(spacing)) {
    root.style.setProperty(`--space-${kebab(name)}`, `${value}px`);
  }

  for (const [name, value] of Object.entries(radius)) {
    root.style.setProperty(`--radius-${kebab(name)}`, `${value}px`);
  }

  for (const [name, style] of Object.entries(typography)) {
    const key = kebab(name);
    root.style.setProperty(`--font-size-${key}`, `${style.fontSize}px`);
    root.style.setProperty(`--line-height-${key}`, `${style.lineHeight}px`);
    root.style.setProperty(`--font-weight-${key}`, style.fontWeight);
  }
}

/** textStrong → text-strong */
function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
