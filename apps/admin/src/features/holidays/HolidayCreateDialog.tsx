import { useState } from 'react';
import { Dialog, Field, Select } from '@/components';
import { weekdayText } from '@/lib/datetime';
import { HOLIDAY_TYPE_OPTIONS } from './labels';
import { HOLIDAY_NAME_MAX, useCreateHoliday, type Holiday, type HolidayType } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 등록된 날짜가 지금 보고 있는 해가 아니면 화면을 그 해로 옮긴다 */
  onCreated: (holiday: Holiday) => void;
}

/**
 * 공휴일을 넣는다.
 *
 * **날짜를 화면이 채워주지 않는다.** 설날이 며칠인지, 대체공휴일이 붙는지는 사람이 안다.
 * 음력 계산도 공휴일 규칙도 문서에 없는 것이고, 한 건이 틀리면 전 직원의 연차가 틀어진다
 * (`CLAUDE.md` 3장).
 *
 * 요일을 입력한 날짜 아래에 보여준다. 토·일에 넣고 있으면 손이 미끄러진 것이거나
 * 대체공휴일을 같이 넣어야 하는 날이다 — 넣기 전에 알아채는 편이 낫다.
 */
export function HolidayCreateDialog({ open, onClose, onCreated }: Props) {
  const create = useCreateHoliday();

  const [holidayDate, setHolidayDate] = useState('');
  const [name, setName] = useState('');
  const [holidayType, setHolidayType] = useState<HolidayType>('PUBLIC');
  // 누르기 전에는 빈 칸을 오류로 칠하지 않는다. 열자마자 빨간 화면이 되면 읽지 않는다.
  const [tried, setTried] = useState(false);

  const dateError = tried && !holidayDate ? '날짜를 넣어주세요.' : undefined;
  const nameError = tried && !name.trim() ? '이름을 넣어주세요.' : undefined;

  return (
    <Dialog
      open={open}
      title="공휴일 등록"
      description="넣는 즉시 이후 연차 계산에 반영돼요. 이미 계산이 끝난 신청은 다시 계산되지 않아요."
      confirmLabel="등록하기"
      loading={create.isPending}
      onClose={onClose}
      onConfirm={() => {
        setTried(true);
        if (!holidayDate || !name.trim()) return;

        create.mutate(
          { holidayDate, name: name.trim(), holidayType },
          {
            onSuccess: (holiday) => {
              onCreated(holiday);
              onClose();
            },
          },
        );
      }}
    >
      <Field
        label="날짜"
        value={holidayDate}
        onChange={setHolidayDate}
        type="date"
        required
        error={dateError}
      />
      {holidayDate && !dateError && (
        <p className="muted holiday-weekday">{weekdayText(holidayDate)}요일이에요.</p>
      )}

      <Field
        label="이름"
        value={name}
        onChange={setName}
        required
        placeholder="설날 · 추석 · 대체공휴일"
        maxLength={HOLIDAY_NAME_MAX}
        error={nameError}
      />

      <Select
        label="구분"
        value={holidayType}
        onChange={(value) => setHolidayType(value as HolidayType)}
        options={HOLIDAY_TYPE_OPTIONS}
      />

      {/* 같은 날짜를 두 번 넣는 것도 서버가 막는다. 그 문구를 그대로 보여준다. */}
      {create.error && <p className="danger">{create.error.message}</p>}
    </Dialog>
  );
}
