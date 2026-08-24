// TODO: docs/DESIGN_SYSTEM.md 확정 후 값을 채운다.
// 폰트 크기·굵기·행간을 컴포넌트에서 직접 정하지 않는다.
export const typography = {} as const;

export type TypographyToken = keyof typeof typography;
