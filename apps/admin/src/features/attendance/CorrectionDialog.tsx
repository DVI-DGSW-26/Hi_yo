import { useState } from 'react';
import { Dialog, Field, FieldGrid } from '@/components';
import { formatKstClock, formatKstDateTime } from '@/lib/datetime';
import {
  CORRECTION_REASON_MAX,
  useCorrectAttendance,
  useCorrections,
  type AttendanceDaily,
} from './api';

interface Props {
  open: boolean;
  /** 고칠 대상. 닫혀 있으면 없다 */
  row: AttendanceDaily | undefined;
  onClose: () => void;
}

/**
 * 근태 보정.
 *
 * **원본을 고치지 않는다.** 보정만 쌓고 그 날짜를 다시 판정한다 (`docs/API_근태.md` 2장).
 * 되돌릴 수 없는 동작이 아니라서 `danger`를 쓰지 않았다 — 잘못 넣었으면 다시 보정한다.
 *
 * **시각이 아니라 날짜와 시각을 받는다.** 야간근무는 자정을 넘기므로 퇴근이 다음 날일 수
 * 있고, 서버 스키마가 그래서 `date-time`을 받는다. 퇴근 날짜를 따로 두지 않으면 새벽
 * 퇴근을 적을 방법이 없다.
 *
 * **고칠 것만 보낸다.** 비워 둔 쪽은 원본 값이 그대로 남는다고 스펙이 적고 있다.
 *
 * 지난 보정을 같이 보여준다. "누가 언제 왜 고쳤는지"가 분쟁에 필요한 값이고, 이미 한 번
 * 고친 날을 또 고치려는 것인지 여기서 알 수 있어야 한다.
 */
export function CorrectionDialog({ open, row, onClose }: Props) {
  const [checkInDate, setCheckInDate] = useState(row?.workDate ?? '');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState(row?.workDate ?? '');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [reason, setReason] = useState('');

  const history = useCorrections(row?.employeeId, row?.workDate ?? '');
  const correct = useCorrectAttendance(row?.employeeId);

  const checkInAt = joinDateTime(checkInDate, checkInTime);
  const checkOutAt = joinDateTime(checkOutDate, checkOutTime);
  const nothingToSend = checkInAt === undefined && checkOutAt === undefined;

  function submit() {
    if (!row || reason.trim() === '' || nothingToSend) return;
    correct.mutate(
      { workDate: row.workDate, checkInAt, checkOutAt, reason: reason.trim() },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open={open}
      title="근태 보정"
      description="고칠 쪽만 채우면 돼요. 비워 둔 쪽은 원래 값이 그대로 남아요. 원본은 고쳐지지 않고 보정이 쌓여요."
      confirmLabel="보정하기"
      loading={correct.isPending}
      onClose={onClose}
      onConfirm={submit}
    >
      <p className="muted">
        {row?.employeeName ?? `직원 ${row?.employeeId}`} · {row?.workDate} · 지금
        {' '}
        {row?.checkInAt === null || row === undefined
          ? '출근 기록 없음'
          : `출근 ${formatKstClock(row.checkInAt, row.workDate)}`}
        {' · '}
        {row?.checkOutAt === null || row === undefined
          ? '퇴근 기록 없음'
          : `퇴근 ${formatKstClock(row.checkOutAt, row.workDate)}`}
      </p>

      <FieldGrid>
        <Field label="출근 날짜" value={checkInDate} onChange={setCheckInDate} type="date" />
        <Field label="출근 시각" value={checkInTime} onChange={setCheckInTime} type="time" />
        {/* 자정을 넘겨 퇴근하면 날짜가 하루 뒤다. 그래서 퇴근 날짜를 따로 받는다. */}
        <Field label="퇴근 날짜" value={checkOutDate} onChange={setCheckOutDate} type="date" />
        <Field label="퇴근 시각" value={checkOutTime} onChange={setCheckOutTime} type="time" />
      </FieldGrid>

      <Field
        label="사유"
        value={reason}
        onChange={setReason}
        required
        maxLength={CORRECTION_REASON_MAX}
        placeholder="퇴근 태그 누락"
      />

      {/* 막힌 이유는 버튼 가까이 둔다. Button 에 disabled 를 주지 않는다. */}
      {nothingToSend && <p className="muted">고칠 시각을 한 쪽이라도 채워주세요.</p>}
      {!nothingToSend && reason.trim() === '' && <p className="muted">사유를 적어주세요.</p>}
      {correct.error && <p className="danger">{correct.error.message}</p>}

      {history.data && history.data.length > 0 && (
        <>
          <p className="muted">이 날 지난 보정 {history.data.length}건</p>
          <ul className="plain-list">
            {history.data.map((item) => (
              <li key={item.id}>
                {formatKstDateTime(item.correctedAt)} · {item.correctedByName ?? '누구인지 모름'} —{' '}
                {item.reason}
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
}

/**
 * 날짜와 시각을 서버가 받는 모양으로 합친다. 한쪽이라도 비면 **보내지 않는다** —
 * 반쪽짜리를 보내면 원본이 엉뚱한 값으로 덮인다.
 *
 * 오프셋을 붙이지 않는다. 서버가 한국 시간으로 돌고 응답에도 오프셋을 안 붙인다.
 */
function joinDateTime(date: string, time: string): string | undefined {
  if (date === '' || time === '') return undefined;
  return `${date}T${time}:00`;
}
