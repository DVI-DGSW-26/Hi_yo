export const fontFamily = 'Pretendard';

export const typography = {
  headline: { fontFamily, fontSize: 22, fontWeight: '500', lineHeight: 30, letterSpacing: -0.4 },
  sectionTitle: { fontFamily, fontSize: 16, fontWeight: '500', lineHeight: 24 },
  body: { fontFamily, fontSize: 17, fontWeight: '400', lineHeight: 26 },
  bodySmall: { fontFamily, fontSize: 15, fontWeight: '400', lineHeight: 23 },
  label: { fontFamily, fontSize: 13, fontWeight: '400', lineHeight: 20 },
  caption: { fontFamily, fontSize: 12, fontWeight: '400', lineHeight: 18 },
} as const;

export type TypographyToken = keyof typeof typography;
