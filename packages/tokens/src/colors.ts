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

  /**
   * 모달 뒤를 덮는 막. 하단 시트(`Sheet`)와 그 위에 올라가는 것들이 쓴다.
   *
   * 그림자가 아니다 — 그림자·그라디언트 금지 규칙과 무관하다. 시트가 흰 배경이고
   * 그 뒤 화면도 흰 배경이라, 덮지 않으면 어디까지가 시트인지 읽히지 않는다.
   *
   * 값은 `textStrong`에 투명도 40%다. 새 색을 들이지 않고 이미 쓰는 검정을 옅게 쓴다.
   * 뒤 내용이 비쳐 보여야 무엇을 덮고 있는지 알 수 있어서 불투명하게 하지 않는다.
   *
   * 40%는 관리팀 `Dialog`가 이미 쓰던 값이다. 그쪽 CSS에 적혀 있던 것을 여기로 올렸고,
   * 두 앱이 같은 값을 본다.
   */
  scrim: 'rgba(25, 31, 40, 0.4)',
} as const;

export type ColorToken = keyof typeof colors;
