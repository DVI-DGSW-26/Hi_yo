/**
 * 반차 시각. **인사팀이 확정한 값이다** (2026-09-01).
 *
 * | 반차 | 시각 |
 * |---|---|
 * | 오전 | `09:00` ~ `13:00` |
 * | 오후 | `13:00` ~ `18:00` |
 *
 * **점심시간이 반차 시간에 포함된다.** 그래서 오전과 오후의 길이가 다르다 — 앱이 고칠
 * 일이 아니다. 여기서 시간을 세지도, 몇 일이 깎이는지 계산하지도 않는다. 차감은 서버가
 * 한다 (`CLAUDE.md` 3장).
 *
 * **앱이 이 값을 갖고 있는 이유 —— 서버가 주지 않는다.** `RequestTypeResponse`에는
 * `halfDay` 참·거짓만 있고 시각 필드가 없다. 그래서 회사가 시각을 바꾸면 앱을 다시
 * 배포해야 한다. **종류 응답에 시각을 실어달라고 요청해 뒀다** (`docs/01_물어볼_것.md`).
 * 서버가 주기 시작하면 이 파일을 지운다.
 */

export type HalfDaySlot = 'AM' | 'PM';

interface Slot {
  label: string;
  /** 서버가 돌려주는 것과 같은 `HH:mm:ss` 모양으로 보낸다 */
  startTime: string;
  endTime: string;
}

const SLOTS: Record<HalfDaySlot, Slot> = {
  AM: { label: '오전', startTime: '09:00:00', endTime: '13:00:00' },
  PM: { label: '오후', startTime: '13:00:00', endTime: '18:00:00' },
};

/** 고르는 차례. 오전이 먼저다 */
export const HALF_DAY_SLOTS: HalfDaySlot[] = ['AM', 'PM'];

export function halfDaySlot(slot: HalfDaySlot): Slot {
  return SLOTS[slot];
}

/** `09:00 ~ 13:00` — 고른 반차를 화면에 적을 때 */
export function halfDayText(slot: HalfDaySlot): string {
  const { label, startTime, endTime } = SLOTS[slot];
  return `${label} ${startTime.slice(0, 5)} ~ ${endTime.slice(0, 5)}`;
}
