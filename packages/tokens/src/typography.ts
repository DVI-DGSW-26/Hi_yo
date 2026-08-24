export const typography = {
  headline: { fontSize: 22, fontWeight: '500', lineHeight: 30, letterSpacing: -0.4 },
  sectionTitle: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  body: { fontSize: 17, fontWeight: '400', lineHeight: 26 },
  bodySmall: { fontSize: 15, fontWeight: '400', lineHeight: 23 },
  label: { fontSize: 13, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
} as const;

export const fontFamily = 'Pretendard';

export type TypographyToken = keyof typeof typography;
