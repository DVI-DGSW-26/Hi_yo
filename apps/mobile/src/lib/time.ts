/**
 * 화면에서 받은 시각을 다루는 부분. `TimeField`가 쓰고, 신청서를 꾸릴 때도 쓴다.
 *
 * **컴포넌트에서 떼어 냈다.** `TimeField.tsx` 안에 있었는데, 그러면 이 두 함수를 쓰려는
 * 쪽이 `@/components` 배럴을 지나며 `react-native`까지 끌어오게 된다 — 화면이 아닌
 * 모듈(과 그 테스트)에는 얹을 수 없는 무게다.
 *
 * **여기서 시각을 판단하지 않는다.** 모양이 맞는지까지만 본다 — 시작이 끝보다 늦은지,
 * 근무시간 안인지는 서버가 본다 (`CLAUDE.md` 3장).
 */

/** 다 적었고 실제로 있는 시각인가. 시작이 끝보다 늦은지는 **서버가 본다** */
export function isCompleteTime(value: string): boolean {
  const matched = /^(\d{2}):(\d{2})$/.exec(value);
  if (!matched) return false;
  return Number(matched[1]) <= 23 && Number(matched[2]) <= 59;
}

/** 서버가 돌려주는 것과 같은 `HH:mm:ss` 로. 초는 화면에서 받지 않는다 */
export function toServerTime(value: string): string {
  return `${value}:00`;
}
