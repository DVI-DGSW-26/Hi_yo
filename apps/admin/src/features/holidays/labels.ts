import type { HolidayType } from './api';

/**
 * 공휴일 구분.
 *
 * `HolidayCreateRequest`의 enum 두 값이다 (2026-08-31 Swagger 확인).
 * 등록 설명이 "회사 지정 휴무일도 여기에 넣는다"고 적고 있어 `COMPANY`가 그것이다.
 * `docs/API_연차.md` 9장에 값을 모르겠다고 적어둔 것은 그 뒤에 풀렸다.
 *
 * **구분에 따라 연차 차감이 달라지는지는 확인되지 않았다.** 서버는 두 값 모두
 * 같은 목록으로 돌려주고, 차감에서 구분을 보는지 아닌지가 스펙에 없다.
 * 화면은 등록할 때 고른 값을 그대로 보여주기만 한다.
 */
const TYPE_LABEL: Record<HolidayType, string> = {
  PUBLIC: '법정공휴일',
  COMPANY: '회사 지정',
};

export function holidayTypeText(type: HolidayType): string {
  return TYPE_LABEL[type];
}

export const HOLIDAY_TYPE_OPTIONS: { value: HolidayType; label: string }[] = [
  { value: 'PUBLIC', label: TYPE_LABEL.PUBLIC },
  { value: 'COMPANY', label: TYPE_LABEL.COMPANY },
];
