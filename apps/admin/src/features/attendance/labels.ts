/**
 * **52시간 단계 문구는 `@hr/format` 에 있다** (2026-09-03에 올렸다).
 *
 * 모바일과 같은 값을 다르게 말하면 안 되는 것이라, 두 앱이 각자 갖고 있으면 어긋난다.
 * 실제로 두 파일 다 「한쪽을 고치면 다른 쪽도 고친다」고 적어만 뒀었다.
 * 여기서는 다시 내보내기만 한다 — 부르는 자리를 바꾸지 않으려고 남겨 둔 문이다.
 */
export { alertLevelText, alertLevelTone } from '@hr/format';

/**
 * 판정이 끝났는가 (A-501).
 *
 * **그린을 쓰지 않는다.** `DESIGN_ADMIN.md` 7장의 `done`은 확정·승인·마감에 쓰는 색이고
 * 판정 확정도 거기 들지만, 이 표는 서른 줄 넘게 늘어서고 정상인 줄이 대부분이다.
 * 정상이 초록으로 깔리면 손대야 할 줄이 그 사이에 묻힌다 — 52시간 현황에서 `여유 있어요`를
 * 무채색으로 둔 것과 같은 판단이다.
 *
 * 판정 전은 빨강이다. 7장이 `error`의 예로 **근태 누락**을 직접 들고 있고, 실제로
 * 급여 계산에서 그 사람이 빠진다.
 */
export function judgedText(confirmed: boolean): string {
  return confirmed ? '판정 완료' : '판정 전';
}

export function judgedTone(confirmed: boolean): 'done' | 'error' | 'neutral' {
  return confirmed ? 'neutral' : 'error';
}
