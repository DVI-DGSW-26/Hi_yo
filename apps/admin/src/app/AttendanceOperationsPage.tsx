import { useState } from 'react';
import { Button, Dialog, Field, RowLink, StatusText, Table, type Column } from '@/components';
import { CorrectionDialog } from '@/features/attendance/CorrectionDialog';
import { judgedText, judgedTone } from '@/features/attendance/labels';
import {
  useCollectAttendance,
  useDailyAttendance,
  useJudgeAttendance,
  type AttendanceDaily,
} from '@/features/attendance/api';
import { formatKstClock, todayInKst } from '@/lib/datetime';

/**
 * 근태 정리
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 날 근태가 어디까지 왔고, 무엇을 손대야 하는가.**
 *
 * 세콤 태그가 근태가 되기까지 두 단계를 거친다 (`docs/API_근태.md` 2장).
 *
 * ```
 * 수신 버퍼 ──(수집)──> 근태 기록 ──(판정)──> 판정 완료 ──> 주간 집계
 * ```
 *
 * 정기 배치가 따로 돌지만 관리팀이 "지금 반영"을 눌러야 하는 경우가 있어 서버가 두 경로를
 * 열어 뒀다. 그 자리가 이 화면이다.
 *
 * **화면번호가 없다.** 명세서 화면 인벤토리 25개에 없는 화면이고, 기획이 새 화면으로 만들라고
 * 정했다 (2026-09-01). 데이터 모델과 API가 확정돼 있어 명세서 3장의 준용 규칙을 따랐다 —
 * A-504·A-503·공휴일과 같은 기준이다.
 *
 * **동작을 상자 안에 둔다.** 제목 줄 오른쪽에 주 동작을 두는 규칙(11장)은 화면에 주 동작이
 * 하나일 때 이야기다. 여기는 수집·판정·보정 셋이고 각각 다른 상자에 속해서, 같은 상자의
 * 실행 줄에 두는 쪽이 무엇을 누르는 것인지 읽힌다.
 *
 * **A-501과 나눈 이유.** 인벤토리가 A-501을 **조회**로 못박고 있고, 판정 재실행은 그 날 전
 * 직원의 연장·야간·지각을 다시 매기는 동작이라 조회 화면에 곁들일 무게가 아니다.
 */
export function AttendanceOperationsPage() {
  const [date, setDate] = useState(() => todayInKst());
  const [correcting, setCorrecting] = useState<AttendanceDaily>();
  const [confirming, setConfirming] = useState(false);

  const daily = useDailyAttendance(date);
  const judge = useJudgeAttendance();
  const collect = useCollectAttendance();

  const unconfirmed = daily.data?.filter((row) => !row.confirmed).length;

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
      render: (row) => (row.checkInAt == null ? '—' : formatKstClock(row.checkInAt, row.workDate)),
    },
    {
      key: 'checkOut',
      header: '퇴근',
      // 출근은 찍혔는데 퇴근이 없으면 태그가 빠진 것이다. 여기서 고칠 줄이 그 줄이다.
      render: (row) => {
        if (row.checkOutAt != null) return formatKstClock(row.checkOutAt, row.workDate);
        if (row.checkInAt == null) return '—';
        return <span className="danger">기록 없어요</span>;
      },
    },
    { key: 'corrected', header: '보정', render: (row) => (row.corrected ? '보정됨' : '—') },
    {
      key: 'judged',
      header: '판정',
      render: (row) => (
        <StatusText label={judgedText(row.confirmed)} tone={judgedTone(row.confirmed)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="row-actions">
          <RowLink label="보정하기" onClick={() => setCorrecting(row)} />
        </span>
      ),
    },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">근태 정리</h1>
          <p className="page-lead">
            세콤 태그를 근태로 옮기고, 어긋난 것을 고치고, 다시 판정해요. 정기 배치가 따로 돌기
            때문에 여기는 지금 반영해야 할 때만 써요.
          </p>
        </div>
      </div>

      {/* 수집은 날짜와 무관하다. 버퍼에 쌓인 것을 통째로 옮긴다 — 파라미터가 없다. */}
      <div className="panel">
        <div className="panel-body">
          <h2 className="section-title">세콤 수집</h2>
          <p className="muted">
            단말이 보낸 원본을 근태 기록으로 옮겨요. 날짜를 고르지 않아요 — 쌓인 것을 통째로
            옮겨요.
          </p>
          {collect.data && (
            <p className="muted">
              {collect.data.read}행을 읽어 {collect.data.collected}건을 옮겼어요.
              {collect.data.changed > 0 &&
                ` ${collect.data.changed}건은 시각이 바뀌었어요 — 그 날짜를 다시 판정해야 해요.`}
            </p>
          )}
          {collect.data && collect.data.skipped > 0 && (
            <p className="danger">
              {collect.data.skipped}건은 직원을 못 찾았거나 형식을 못 읽어 건너뛰었어요.
            </p>
          )}
        </div>
        <div className="panel-actions">
          <p className={collect.error ? 'panel-note is-error' : 'panel-note'}>
            {collect.error
              ? collect.error.message
              : '옮긴 뒤에는 그 날짜를 다시 판정해야 근태가 완성돼요.'}
          </p>
          <div className="panel-buttons">
            <Button label="수집 실행하기" loading={collect.isPending} onClick={() => collect.mutate()} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <h2 className="section-title">판정</h2>
          <p className="muted">
            연장·야간·지각·조퇴가 판정에서 나와요. 여러 번 돌려도 같은 결과라 되돌릴 일이
            없어요.
          </p>
          {judge.data && (
            <p className="muted">
              {judge.data.date} — {judge.data.judged}명을 판정하고 {judge.data.aggregated}명의 주간
              집계를 다시 냈어요.
              {judge.data.confirmed && ' 확정까지 마쳤어요.'}
            </p>
          )}
        </div>
        <div className="panel-actions">
          <p className={judge.error ? 'panel-note is-error' : 'panel-note'}>
            {judge.error
              ? judge.error.message
              : '확정해야 이 날 근태가 급여 계산에 들어가요. 확정하지 않으면 그 사람은 급여에서 빠져요.'}
          </p>
          {/* 오른쪽이 주 동작이다 (DESIGN_ADMIN.md 11장). 확정은 무게가 달라 왼쪽에 둔다. */}
          <div className="panel-buttons">
            <Button label="확정까지 하기" onClick={() => setConfirming(true)} />
            <Button
              label="판정 다시 하기"
              variant="primary"
              loading={judge.isPending && judge.variables?.confirm !== true}
              onClick={() => judge.mutate({ date })}
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        rows={daily.data}
        keyOf={(row) => row.employeeId}
        isPending={daily.isPending}
        error={daily.error}
        emptyText="이 날에 집계된 근태 기록이 없어요. 세콤 수집을 먼저 돌려보세요."
        toolbar={<Field label="기준일" value={date} onChange={setDate} type="date" required />}
      />

      <Dialog
        open={confirming}
        title="근태 확정"
        description={`${date} 근태를 확정하면 이 날이 급여 계산에 들어가요. 확정을 되돌리는 경로가 스펙에 없어요.`}
        confirmLabel="확정하기"
        loading={judge.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          judge.mutate({ date, confirm: true }, { onSuccess: () => setConfirming(false) })
        }
      >
        <p className="muted">
          {unconfirmed === undefined
            ? '이 날 근태를 아직 못 불러왔어요.'
            : `아직 판정 전인 사람이 ${unconfirmed}명이에요.`}
        </p>
        {judge.error && <p className="danger">{judge.error.message}</p>}
      </Dialog>

      {/* 열 때마다 다시 만든다. 지난번에 적다 만 값이 남아 있으면 엉뚱한 사람이 보정된다. */}
      <CorrectionDialog
        key={correcting?.employeeId ?? 'closed'}
        open={correcting !== undefined}
        row={correcting}
        onClose={() => setCorrecting(undefined)}
      />
    </section>
  );
}
