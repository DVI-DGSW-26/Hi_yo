import { useState } from 'react';
import { Dialog, Field } from '@/components';
import { todayInKst, weekdayText } from '@/lib/datetime';
import { REASON_MAX, useCreateCompanyLeave, type CompanyLeave } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 등록한 날짜가 지금 보고 있는 해가 아니면 화면을 그 해로 옮긴다 */
  onCreated: (companyLeave: CompanyLeave) => void;
}

/**
 * 단체연차 날짜를 잡는다.
 *
 * **날짜 기본값이 오늘이다.** 이 화면을 여는 가장 흔한 경우가 "오늘 다 쉽시다"라서다.
 * 여름휴가처럼 미리 잡는 날은 고쳐서 넣는다.
 *
 * **등록만으로는 아무의 연차도 줄지 않는다.** 그 사실을 설명에 적어둔다 — 여기서 끝난 줄
 * 알고 닫으면 아무도 쉬지 못한 것이 되고, 반대로 이미 차감된 줄 알면 두 번 누르지 않는다.
 *
 * 지우는 API가 없어 잘못 넣어도 되돌릴 수 없다. 그래서 날짜의 요일을 아래에 보여준다.
 */
export function CompanyLeaveCreateDialog({ open, onClose, onCreated }: Props) {
  const create = useCreateCompanyLeave();

  const [targetDate, setTargetDate] = useState(todayInKst());
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);

  const dateError = tried && !targetDate ? '날짜를 넣어주세요.' : undefined;
  const reasonError = tried && !reason.trim() ? '사유를 넣어주세요.' : undefined;

  return (
    <Dialog
      open={open}
      title="단체연차 등록"
      description="날짜만 잡아둬요. 등록해도 아직 아무의 연차도 줄지 않고, 목록에서 차감하기를 눌러야 실제로 빠져요."
      confirmLabel="등록하기"
      loading={create.isPending}
      onClose={onClose}
      onConfirm={() => {
        setTried(true);
        if (!targetDate || !reason.trim()) return;

        create.mutate(
          { targetDate, reason: reason.trim() },
          {
            onSuccess: (companyLeave) => {
              onCreated(companyLeave);
              onClose();
            },
          },
        );
      }}
    >
      <Field
        label="날짜"
        value={targetDate}
        onChange={setTargetDate}
        type="date"
        required
        error={dateError}
      />
      {targetDate && !dateError && (
        <p className="muted company-leave-weekday">{weekdayText(targetDate)}요일이에요.</p>
      )}

      <Field
        label="사유"
        value={reason}
        onChange={setReason}
        required
        placeholder="여름휴가 · 창립기념일"
        maxLength={REASON_MAX}
        error={reasonError}
      />

      {/* 같은 날짜를 두 번 넣는 것도 서버가 막는다. 그 문구를 그대로 보여준다. */}
      {create.error && <p className="danger">{create.error.message}</p>}
    </Dialog>
  );
}
