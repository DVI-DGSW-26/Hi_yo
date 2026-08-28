import { useState } from 'react';
import { formatMinutes } from '@hr/format';
import { Field, Select, StatusText, Table, type Column } from '@/components';
import { useWeeklyWork, type WeeklyWorkSummary } from '@/features/attendance/api';
import { alertLevelText, alertLevelTone } from '@/features/attendance/labels';
import { dateRangeText, formatKstDateTime, todayInKst } from '@/lib/datetime';
import './WeeklyHoursPage.css';

/**
 * A-503 52시간 근접 알림 현황
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이번 주에 손대야 할 사람이 누구인가.**
 *
 * 주 52시간은 넘기면 회사가 처벌받는다. 그래서 표가 아니라 **명단**으로 읽혀야 한다 —
 * 기본값을 알림 대상만 보기로 두고, 전체는 골라서 본다.
 *
 * **단계는 서버가 정한다.** `alertLevel`을 그대로 쓰고 분을 보고 다시 판단하지 않는다.
 * 거르는 것도 서버가 한다(`onlyAlerted`) — 기준이 어긋나면 관리팀이 놓치는 사람이 생긴다.
 *
 * 조회만 하는 화면이라 primary 버튼이 없다. 그린도 없다 (`DESIGN_ADMIN.md` 7장 —
 * 조회가 목적인 화면은 1곳 이하가 정상이다).
 */
export function WeeklyHoursPage() {
  const [date, setDate] = useState(() => todayInKst());
  const [onlyAlerted, setOnlyAlerted] = useState(true);

  const weekly = useWeeklyWork(date, onlyAlerted);

  const columns: Column<WeeklyWorkSummary>[] = [
    {
      key: 'employee',
      header: '이름',
      sticky: true,
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'department', header: '부서', render: (row) => row.departmentName ?? '—' },
    {
      key: 'week',
      header: '주간',
      render: (row) => dateRangeText(row.weekStartDate, row.weekEndDate),
    },
    {
      key: 'total',
      header: '총 근로',
      align: 'right',
      render: (row) => formatMinutes(row.totalMinutes),
    },
    {
      key: 'normal',
      header: '소정',
      align: 'right',
      render: (row) => formatMinutes(row.normalMinutes),
    },
    {
      key: 'overtime',
      header: '연장',
      align: 'right',
      render: (row) => formatMinutes(row.overtimeMinutes),
    },
    {
      key: 'remaining',
      header: '52시간까지',
      align: 'right',
      // 넘겼으면 음수로 온다. formatMinutes 가 부호를 붙인다. 여기서 다시 계산하지 않는다.
      render: (row) => (
        <span className={row.remainingMinutes < 0 ? 'danger' : undefined}>
          {formatMinutes(row.remainingMinutes)}
        </span>
      ),
    },
    {
      key: 'overtimeRemaining',
      header: '연장 여유',
      align: 'right',
      render: (row) => (
        <span className={row.overtimeRemainingMinutes < 0 ? 'danger' : undefined}>
          {formatMinutes(row.overtimeRemainingMinutes)}
        </span>
      ),
    },
    {
      key: 'level',
      header: '단계',
      render: (row) => (
        <StatusText label={alertLevelText(row.alertLevel)} tone={alertLevelTone(row.alertLevel)} />
      ),
    },
    {
      key: 'alertedAt',
      header: '알림 보냄',
      render: (row) => (row.alertedAt === null ? '—' : formatKstDateTime(row.alertedAt)),
    },
  ];

  return (
    <section>
      <h1 className="page-title">52시간 현황</h1>

      <p className="muted">
        고른 날짜가 속한 주를 봐요. 단계는 서버가 정해요 — 화면에서 시간을 다시 재지 않아요.
      </p>

      <div className="weekly-toolbar">
        <Field label="기준일" value={date} onChange={setDate} type="date" required />
        <Select
          label="보기"
          value={onlyAlerted ? 'alerted' : 'all'}
          onChange={(value) => setOnlyAlerted(value === 'alerted')}
          options={[
            { value: 'alerted', label: '알림 대상만' },
            { value: 'all', label: '전 직원' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        rows={weekly.data}
        keyOf={(row) => row.employeeId}
        isPending={weekly.isPending}
        error={weekly.error}
        emptyText={
          onlyAlerted
            ? '이 주에 48시간을 넘긴 사람이 없어요.'
            : '이 주에 집계된 근무 기록이 없어요.'
        }
      />
    </section>
  );
}
