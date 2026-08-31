/**
 * 52시간 알림 단계의 표기.
 *
 * 단계는 **서버가 정한 `alertLevel`을 그대로 쓴다.** 분을 보고 다시 판단하지 않는다 —
 * 스키마가 "프런트가 분 단위로 다시 판단하면 서버와 기준이 어긋난다"고 적고 있다.
 *
 * 서버 설명은 이 단계를 "화면에서 색을 고르는 기준"이라고 하지만, **색은 셋뿐이다.**
 * `DESIGN_ADMIN.md` 7장이 `done`·`error`·`neutral` 말고 새 tone을 만들지 못하게 하고,
 * 뱃지도 금지한다. 그래서 **경고(2)와 초과(3)가 같은 빨강**이고 구분은 문구가 한다.
 * 넘긴 것과 넘길 것 둘 다 관리팀이 지금 손대야 하는 줄이라 같은 무게로 둔다.
 */

const LEVEL_LABEL: Record<number, string> = {
  0: '여유 있어요',
  1: '48시간을 넘겼어요',
  2: '52시간이 코앞이에요',
  3: '52시간을 넘겼어요',
};

export function alertLevelText(level: number): string {
  // 서버가 새 단계를 늘릴 수 있다. 모르는 값은 숫자를 그대로 보여주고 지어내지 않는다.
  return LEVEL_LABEL[level] ?? `단계 ${level}`;
}

export function alertLevelTone(level: number): 'done' | 'error' | 'neutral' {
  return level >= 2 ? 'error' : 'neutral';
}

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
