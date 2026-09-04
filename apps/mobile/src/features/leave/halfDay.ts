import type { RequestType } from './api';

/**
 * 반차 시각. **서버가 준다** (2026-09-02부터).
 *
 * 그전에는 앱이 `09:00`·`13:00`·`18:00`을 갖고 있었다. 회사가 시각을 바꾸면 앱을 다시
 * 배포해야 해서 종류 응답에 실어달라고 요청했고, `GET /requests/types`가
 * `amStartTime`·`amEndTime`·`pmStartTime`·`pmEndTime`을 주기 시작했다.
 *
 * **시각을 지어내지 않는다.** 안 실려 오면 `undefined`를 돌려주고 화면이 그 사실을 적는다 —
 * 틀린 시각으로 신청서가 나가는 것보다 안 나가는 편이 낫다.
 *
 * **점심시간이 반차에 포함돼 오전과 오후의 길이가 다르다.** 앱이 고칠 일이 아니다.
 * 여기서 시간을 세지도, 몇 일이 깎이는지 계산하지도 않는다 — 차감은 서버가 한다
 * (`CLAUDE.md` 3장).
 */

export type HalfDaySlot = 'AM' | 'PM';

/** 고르는 차례. 오전이 먼저다 */
export const HALF_DAY_SLOTS: HalfDaySlot[] = ['AM', 'PM'];

const LABEL: Record<HalfDaySlot, string> = { AM: '오전', PM: '오후' };

export interface HalfDayTimes {
  /** 서버가 돌려주는 것과 같은 `HH:mm:ss` 모양으로 그대로 보낸다 */
  startTime: string;
  endTime: string;
}

/** `오전` · `오후` */
export function halfDayLabel(slot: HalfDaySlot): string {
  return LABEL[slot];
}

/** 신청에 실을 시각. **종류에 안 실려 왔으면 `undefined`다** — 앱이 만들어 넣지 않는다 */
export function halfDayTimes(
  type: RequestType | undefined,
  slot: HalfDaySlot,
): HalfDayTimes | undefined {
  if (type === undefined) return undefined;

  const startTime = slot === 'AM' ? type.amStartTime : type.pmStartTime;
  const endTime = slot === 'AM' ? type.amEndTime : type.pmEndTime;
  if (startTime === null || endTime === null) return undefined;

  return { startTime, endTime };
}

/** `09:00 ~ 13:00` — 고르는 시트의 곁들임말. 시각이 없으면 아무것도 적지 않는다 */
export function halfDayHint(
  type: RequestType | undefined,
  slot: HalfDaySlot,
): string | undefined {
  const times = halfDayTimes(type, slot);
  if (times === undefined) return undefined;
  return `${times.startTime.slice(0, 5)} ~ ${times.endTime.slice(0, 5)}`;
}

/**
 * `오전 09:00 ~ 13:00` — 고른 반차를 줄에 적을 때.
 * 시각이 없어도 **이름은 남긴다.** 줄이 통째로 비면 무엇을 골랐는지 알 수 없다.
 */
export function halfDayText(type: RequestType | undefined, slot: HalfDaySlot): string {
  const hint = halfDayHint(type, slot);
  return hint === undefined ? LABEL[slot] : `${LABEL[slot]} ${hint}`;
}
