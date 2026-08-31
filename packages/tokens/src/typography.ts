export const fontFamily = 'Pretendard';

export const typography = {
  /**
   * 관리팀 화면의 제목. `headline`보다 한 단 크고 굵다.
   *
   * 웹 화면은 좌측 메뉴·도구줄·표가 한 화면에 같이 있어서, 모바일과 같은 크기로는
   * 제목이 표 헤더에 묻힌다 (`DESIGN_ADMIN.md` 11장). 모바일은 `headline`을 그대로 쓴다.
   */
  pageTitle: { fontFamily, fontSize: 26, fontWeight: '600', lineHeight: 34, letterSpacing: -0.4 },
  headline: { fontFamily, fontSize: 22, fontWeight: '500', lineHeight: 30, letterSpacing: -0.4 },
  sectionTitle: { fontFamily, fontSize: 16, fontWeight: '500', lineHeight: 24 },
  body: { fontFamily, fontSize: 17, fontWeight: '400', lineHeight: 26 },
  bodySmall: { fontFamily, fontSize: 15, fontWeight: '400', lineHeight: 23 },
  /**
   * 화면 제목 아래에서 그 화면이 무엇인지 설명하는 줄, 그리고 상자 안의 안내문.
   * `bodySmall`(15)보다 작고 `label`(13)보다 크다 — 읽는 문장이지 값이 아니다.
   */
  lead: { fontFamily, fontSize: 14, fontWeight: '400', lineHeight: 22 },
  label: { fontFamily, fontSize: 13, fontWeight: '400', lineHeight: 20 },
  caption: { fontFamily, fontSize: 12, fontWeight: '400', lineHeight: 18 },
} as const;

export type TypographyToken = keyof typeof typography;
