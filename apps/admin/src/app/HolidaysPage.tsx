import { useState } from 'react';
import { Button, Dialog, RowLink, Select, Summary, Table, type Column } from '@/components';
import { currentYear, weekdayText } from '@/lib/datetime';
import { HolidayCreateDialog } from '@/features/holidays/HolidayCreateDialog';
import { holidayTypeText } from '@/features/holidays/labels';
import {
  selectableYears,
  useDeleteHoliday,
  useHolidays,
  type Holiday,
} from '@/features/holidays/api';
import './HolidaysPage.css';

/**
 * 공휴일
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 해에 연차에서 빠질 날이 다 들어 있는가.**
 *
 * 명세서 화면 인벤토리에 없는 화면이다. 데이터 모델과 API가 확정돼 있어 명세서 3장의
 * "그 외 화면은 데이터 모델 및 화면 인벤토리를 기준으로 준용한다"를 따랐다 —
 * A-504·A-503을 올린 것과 같은 기준이다.
 *
 * **빠진 공휴일을 화면이 찾아주지 않는다.** 설날·추석이 없다고 알리려면 음력을 계산해야
 * 하고, 그건 문서에 없는 규칙이다 (`CLAUDE.md` 3장). 등록된 것을 연도별로 보여주는 데까지가
 * 화면의 일이고, 무엇이 빠졌는지는 사람이 달력을 보고 판단한다.
 */
export function HolidaysPage() {
  const [year, setYear] = useState(currentYear());
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Holiday>();

  const holidays = useHolidays(year);
  const remove = useDeleteHoliday();

  // 올해·내년 밖의 날짜를 등록하면 그 해를 목록에 더한다. 넣은 것을 볼 수 없으면
  // 잘못 넣었는지 알 방법이 없다.
  const yearOptions = [...new Set([...selectableYears(), year])].sort((left, right) => right - left);

  const columns: Column<Holiday>[] = [
    { key: 'date', header: '날짜', sticky: true, render: (row) => row.holidayDate },
    { key: 'weekday', header: '요일', render: (row) => weekdayText(row.holidayDate) },
    { key: 'name', header: '이름', render: (row) => row.name },
    { key: 'type', header: '구분', render: (row) => holidayTypeText(row.holidayType) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="row-actions">
          <RowLink label="지우기" onClick={() => setRemoving(row)} />
        </span>
      ),
    },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">공휴일</h1>
          <p className="page-lead">
            연차 차감일이 이 목록을 봐요. 넣지 않은 날은 근무일로 계산돼서 연차가 실제보다 더
            깎여요.
          </p>
        </div>
        <div className="page-head-action">
          <Button label="공휴일 등록하기" variant="primary" onClick={() => setAdding(true)} />
        </div>
      </div>

      {/* 건수를 표 위에 둔다. 열다섯 날쯤 되는 해에 아홉 줄만 있으면 그 자리에서 보인다. */}
      {holidays.data && (
        <Summary
          items={[
            { label: `${year}년 등록된 날`, value: `${holidays.data.length}일` },
            {
              label: '회사 지정',
              value: `${holidays.data.filter((row) => row.holidayType === 'COMPANY').length}일`,
            },
          ]}
          note="설날·추석 같은 음력 공휴일과 대체공휴일은 해마다 날짜가 달라 서버에 미리 들어 있지 않아요."
        />
      )}

      <Table
        columns={columns}
        rows={holidays.data}
        keyOf={(row) => row.id}
        isPending={holidays.isPending}
        error={holidays.error}
        emptyText={`${year}년에 등록된 공휴일이 없어요. 넣지 않으면 그날이 근무일로 계산돼요.`}
        toolbar={
          <Select
            label="연도"
            value={String(year)}
            onChange={(value) => setYear(Number(value))}
            options={yearOptions.map((value) => ({ value: String(value), label: `${value}년` }))}
          />
        }
      />

      {/* 열 때마다 다시 만든다. 지난번에 넣다 만 값이 남아 있으면 엉뚱한 날이 등록된다. */}
      <HolidayCreateDialog
        key={adding ? 'open' : 'closed'}
        open={adding}
        onClose={() => setAdding(false)}
        // 보고 있는 해가 아닌 날짜를 넣으면 표에 안 나타난다. 그 해로 옮겨 결과를 보여준다.
        onCreated={(holiday) => setYear(Number(holiday.holidayDate.slice(0, 4)))}
      />

      {/* 되돌릴 수 없다. 지운 뒤에도 이미 그 날짜로 계산된 연차는 그대로다 */}
      <Dialog
        open={removing !== undefined}
        title="공휴일 지우기"
        description="지우면 이후 연차 계산에서 이 날이 근무일이 돼요. 이미 이 날짜로 계산이 끝난 신청은 되돌아가지 않아요."
        confirmLabel="지우기"
        danger
        loading={remove.isPending}
        onClose={() => setRemoving(undefined)}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id, { onSuccess: () => setRemoving(undefined) });
        }}
      >
        <p className="muted">
          {removing?.holidayDate} · {removing?.name}
        </p>
        {remove.error && <p className="danger">{remove.error.message}</p>}
      </Dialog>
    </section>
  );
}
