export const colors = {
  primary: '#00C471',
  primaryPress: '#00B267',

  textStrong: '#191F28',
  textBody: '#4E5968',
  textWeak: '#8B95A1',
  textDisabled: '#D1D6DB',

  white: '#FFFFFF',
  divider: '#F2F4F6',
  border: '#E5E8EB',
  borderStrong: '#D1D6DB',

  danger: '#E24B4A',

  /**
   * 키보드 포커스 표시 전용. `:focus-visible`에만 쓴다.
   *
   * `primary`를 쓰지 않는 이유가 둘이다.
   * 1. 흰 배경 대비가 2.3:1 이라 포커스 표시에 필요한 3:1 에 못 미친다.
   * 2. 포커스는 화면 어디에나 생긴다. 그린이 거기 쓰이면 "한 화면에 그린 2곳"
   *    예산이 의미를 잃는다.
   *
   * 값은 `textStrong`과 같다(대비 16:1). 의미가 달라 이름을 따로 둔다 —
   * 바꿀 일이 생기면 여기만 고친다.
   */
  focusRing: '#191F28',
} as const;

export type ColorToken = keyof typeof colors;
