import type { LeaveRequest, RequestStatus } from './api';

/**
 * 결재 화면의 표기.
 *
 * **종류 이름은 서버가 준 `typeName`을 그대로 쓴다.** 코드로 이름을 만들지 않는다 —
 * 종류가 늘거나 이름이 바뀌면 서버만 고치면 된다 (`docs/API_신청결재.md` 5장).
 */

const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: '검토 대기',
  REVIEWED: '승인 대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소',
};

export function statusText(status: RequestStatus): string {
  return STATUS_LABEL[status];
}

/**
 * 상태의 색. 승인만 그린, 반려만 빨강, 나머지는 무채색이다 (`DESIGN_ADMIN.md` 7장).
 * 취소는 신청자가 스스로 거둔 것이라 오류가 아니다.
 * **`REVIEWED`도 무채색이다** — 아직 끝나지 않은 상태라 그린을 쓰면 승인처럼 읽힌다.
 */
export function statusTone(status: RequestStatus): 'done' | 'error' | 'neutral' {
  if (status === 'APPROVED') return 'done';
  if (status === 'REJECTED') return 'error';
  return 'neutral';
}

/**
 * 신청 기간. 하루면 날짜 하나, 여러 날이면 뒤쪽은 월·일만 적는다 —
 * `2026-09-24 ~ 2026-09-26`은 표 한 칸에서 너무 길다.
 */
export function periodText(request: Pick<LeaveRequest, 'startDate' | 'endDate'>): string {
  if (request.startDate === request.endDate) return request.startDate;
  return `${request.startDate} ~ ${request.endDate.slice(5)}`;
}

/**
 * 시각. 반차·외출·조퇴처럼 시각이 필요한 종류에만 온다.
 * 서버가 주는 값은 `09:00:00` 형태다. 초는 화면에 쓰지 않는다.
 */
export function timeText(request: Pick<LeaveRequest, 'startTime' | 'endTime'>): string | null {
  const { startTime, endTime } = request;
  if (startTime == null || endTime == null) return null;
  return `${startTime.slice(0, 5)} ~ ${endTime.slice(0, 5)}`;
}
