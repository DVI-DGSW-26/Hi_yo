// TODO: docs/DESIGN_SYSTEM.md 확정 후 값을 채운다.
// 값을 추측해서 넣지 않는다. 여기 없는 색은 컴포넌트에 직접 쓰지 않는다.
export const colors = {} as const;

export type ColorToken = keyof typeof colors;
