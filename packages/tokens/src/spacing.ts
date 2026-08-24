// TODO: docs/DESIGN_SYSTEM.md 확정 후 값을 채운다.
// 여백 숫자를 컴포넌트에서 임의로 정하지 않는다.
export const spacing = {} as const;

export type SpacingToken = keyof typeof spacing;
