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
} as const;

export type ColorToken = keyof typeof colors;
