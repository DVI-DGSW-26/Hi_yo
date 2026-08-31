import { useState } from 'react';
import { formatMinutes } from '@hr/format';
import { Field, Select, StatusText, Summary, Table, type Column } from '@/components';
import { useDailyAttendance, type AttendanceDaily } from '@/features/attendance/api';
import { judgedText, judgedTone } from '@/features/attendance/labels';
import { formatKstClock, todayInKst } from '@/lib/datetime';

/**
 * A-501 전 직원 근태 현황
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 날 근태가 아직 정리되지 않은 사람이 누구인가.**
 *
 * 판정이 확정되지 않은 날이 남아 있으면 **그 사람은 급여 계산에서 통째로 빠진다**
 * (`docs/API_급여.md` — 미확정 근태가 있는 직원을 `skipped`로 돌려준다). 월말에
 * 발견하면 이미 늦다. 그래서 이 표는 근무시간을 보는 표이기 전에 **덜 끝난 날을 찾는
 * 명단**이다.
 *
 * **시간을 화면에서 만들지 않는다.** 출퇴근 시각조차 세콤 태그에서 서버가 도출한
 * 파생값이고, 연장·야간·지각은 판정의 결과다 (명세서 7.3). 분을 더하거나 빼지 않는다.
 *
 * **시간 칸을 다 늘어놓지 않았다.** 스키마에 분 필드가 열둘인데, 기본·법정·휴일·
 * 휴일연장·주휴 다섯은 뺐다 — 그것들은 한 달치를 항목별로 쌓아 보는 급여대장(A-601)이
 * 읽는 값이고, 하루를 보는 표에 열둘을 늘어놓으면 무엇을 봐야 하는지가 사라진다
 * (`CLAUDE.md` 8장 — 명세서의 필드를 순서대로 나열하지 않는다).
 *
 * 조회만 하는 화면이라 primary 버튼이 없다. 보정·판정 재실행·세콤 수집은 API가 열려
 * 있으나 화면 인벤토리에서 A-501의 유형이 **조회**라 넣지 않았다.
 */
export function DailyAttendancePage() {
  const [date, setDate] = useState(() => todayInKst());
  const [onlyUnconfirmed, setOnlyUnconfirmed] = useState(false);

  const daily = useDailyAttendance(date);

  /*
   * 거르는 것을 화면에서 한다. 52시간 현황과 다른 판단이다 — 그쪽은 서버가 `onlyAlerted`를
   * 주고 단계도 서버가 매기니 화면이 다시 거르면 기준이 어긋난다. 여기는 서버에 거르는
   * 파라미터가 없고 `confirmed`가 서버가 준 참·거짓 그대로다. 다시 판정하는 것이 아니다.
   */
  const rows =
    daily.data && onlyUnconfirmed ? daily.data.filter((row) => !row.confirmed) : daily.data;

  const columns: Column<AttendanceDaily>[] = [
    {
      key: 'employee',
      header: '이름',
      sticky: true,
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'department', header: '부서', render: (row) => row.departmentName ?? '—' },
    {
      key: 'checkIn',
      header: '출근',
      render: (row) => (row.checkInAt === null ? '—' : formatKstClock(row.checkInAt, row.workDate)),
    },
    {
      key: 'checkOut',
      header: '퇴근',
      // 출근은 찍혔는데 퇴근이 없으면 태그가 빠진 것이다. 둘 다 없으면 안 나온 날이라
      // 누락이 아니다. 두 값을 읽은 것이지 근태를 판정한 것이 아니다.
      render: (row) => {
        if (row.checkOutAt !== null) return formatKstClock(row.checkOutAt, row.workDate);
        if (row.checkInAt === null) return '—';
        return <span className="danger">기록 없어요</span>;
      },
    },
    {
      key: 'payroll',
      header: '급여 기준',
      align: 'right',
      render: (row) => formatMinutes(row.payrollMinutes),
    },
    {
      key: 'overtime',
      header: '연장',
      align: 'right',
      render: (row) => formatMinutes(row.overtimeMinutes),
    },
    {
      key: 'night',
      header: '야간',
      align: 'right',
      render: (row) => formatMinutes(row.nightMinutes),
    },
    {
      key: 'duty',
      header: '당직',
      align: 'right',
      render: (row) => formatMinutes(row.dutyMinutes),
    },
    {
      key: 'late',
      header: '지각',
      align: 'right',
      render: (row) => formatMinutes(row.lateMinutes),
    },
    {
      key: 'earlyLeave',
      header: '조퇴',
      align: 'right',
      render: (row) => formatMinutes(row.earlyLeaveMinutes),
    },
    {
      key: 'corrected',
      header: '보정',
      // 보정된 날은 출퇴근 시각이 태그 원본과 다르다. 값을 의심할 때 필요한 표시라
      // 판정과 한 칸에 섞지 않고 따로 둔다 — 성격이 다른 사실이다.
      render: (row) => (row.corrected ? '보정됨' : '—'),
    },
    {
      key: 'judged',
      header: '판정',
      render: (row) => (
        <StatusText label={judgedText(row.confirmed)} tone={judgedTone(row.confirmed)} />
      ),
    },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">근태 현황</h1>
          <p className="page-lead">
            고른 날 하루를 봐요. 출퇴근 시각도 연장·야간도 서버가 세콤 태그에서 판정한 값이에요 —
            화면에서 시간을 다시 재지 않아요.
          </p>
        </div>
      </div>

      {/* 판정 전 건수가 이 화면의 목적이라 표 위에 둔다 (DESIGN_ADMIN.md 11장). */}
      {daily.data && (
        <Summary
          items={[
            { label: '집계된 직원', value: `${daily.data.length}명` },
            {
              label: '판정 전',
              value: `${daily.data.filter((row) => !row.confirmed).length}명`,
            },
            {
              label: '보정된 날',
              value: `${daily.data.filter((row) => row.corrected).length}건`,
            },
          ]}
          note="판정 전인 날이 남아 있으면 그 사람은 급여 계산에서 빠져요."
        />
      )}

      <Table
        columns={columns}
        rows={rows}
        keyOf={(row) => row.employeeId}
        isPending={daily.isPending}
        error={daily.error}
        emptyText={
          onlyUnconfirmed
            ? '이 날은 전 직원 판정이 끝났어요.'
            : '이 날에 집계된 근태 기록이 없어요.'
        }
        toolbar={
          <>
            <Field label="날짜" value={date} onChange={setDate} type="date" required />
            <Select
              label="보기"
              value={onlyUnconfirmed ? 'unconfirmed' : 'all'}
              onChange={(value) => setOnlyUnconfirmed(value === 'unconfirmed')}
              options={[
                { value: 'all', label: '전 직원' },
                { value: 'unconfirmed', label: '판정 전만' },
              ]}
            />
          </>
        }
      />
    </section>
  );
}
