import { useState } from 'react';
import { Button, Dialog, RowLink, Select, StatusText, Table, type Column } from '@/components';
import { currentYear, formatKstDateTime, weekdayText } from '@/lib/datetime';
import { ApplyResultNotice } from '@/features/companyLeaves/ApplyResultNotice';
import { CompanyLeaveCreateDialog } from '@/features/companyLeaves/CompanyLeaveCreateDialog';
import {
  selectableYears,
  useApplyCompanyLeave,
  useCompanyLeaves,
  type CompanyLeave,
} from '@/features/companyLeaves/api';
import './CompanyLeavePage.css';

/**
 * A-304 단체연차
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 날짜가 전 직원의 연차에서 빠졌는가.**
 *
 * 여름휴가처럼 전 직원이 같은 날 쉬는 일정이다. 대표가 "오늘 다 쉽시다" 하면 관리팀이
 * 여기서 날짜를 넣고 차감한다.
 *
 * **등록과 차감이 두 단계다.** 서버가 그렇게 나눠 두었다 — 등록만으로는 아무의 연차도
 * 줄지 않는다. 화면에서 한 번에 처리하도록 합치지 않는다. 차감은 되돌릴 수 없고 한 번만
 * 되는 동작이라 확인 단계가 있어야 한다 (`DESIGN_ADMIN.md` 6장).
 *
 * **잔여가 모자란 사람을 화면이 처리하지 않는다.** 무급으로 돌릴지 마이너스로 둘지는
 * 서버 스펙이 "시스템이 정할 문제가 아니다"라고 못박고 있고, 명세서 5장(자동 무급 전환)과
 * 어긋난 채로 확정되지 않았다 (`docs/API_연차.md` 8장). 명단만 보여주고 사람이 판단한다.
 */
export function CompanyLeavePage() {
  const [year, setYear] = useState(currentYear());
  const [adding, setAdding] = useState(false);
  const [applying, setApplying] = useState<CompanyLeave>();

  const companyLeaves = useCompanyLeaves(year);
  const apply = useApplyCompanyLeave();

  // 등록한 날짜가 올해·내년 밖이면 그 해를 목록에 더한다. 넣은 것을 볼 수 없으면
  // 차감을 누를 방법도 없다.
  const yearOptions = [...new Set([...selectableYears(), year])].sort((left, right) => right - left);

  const columns: Column<CompanyLeave>[] = [
    { key: 'date', header: '날짜', sticky: true, render: (row) => row.targetDate },
    { key: 'weekday', header: '요일', render: (row) => weekdayText(row.targetDate) },
    { key: 'reason', header: '사유', render: (row) => row.reason },
    {
      key: 'applied',
      header: '상태',
      // 차감은 되돌릴 수 없는 이정표다. A-601의 `확정`과 같은 자리라 그린을 쓴다
      // (`DESIGN_ADMIN.md` 7장). 이 화면의 그린은 등록 버튼과 이것 둘이다.
      render: (row) =>
        row.applied ? (
          <StatusText label="차감 완료" tone="done" />
        ) : (
          <StatusText label="차감 전" />
        ),
    },
    {
      key: 'appliedBy',
      header: '차감한 사람',
      render: (row) =>
        row.applied
          ? `${row.appliedByName ?? '누구인지 안 왔어요'}${
              row.appliedAt ? ` · ${formatKstDateTime(row.appliedAt)}` : ''
            }`
          : '—',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="row-actions">
          {/* 이미 차감한 건에는 링크를 두지 않는다. 서버도 두 번은 받지 않는다 */}
          {!row.applied && <RowLink label="차감하기" onClick={() => setApplying(row)} />}
        </span>
      ),
    },
  ];

  return (
    <section>
      <h1 className="page-title">단체연차</h1>

      <p className="muted company-leave-meta">
        전 직원이 같은 날 쉬는 일정이에요. 등록만으로는 아무의 연차도 줄지 않고,{' '}
        <strong>차감하기</strong>를 눌러야 전 직원의 신청서가 만들어지고 잔여에서 빠져요.
        차감은 한 번만 할 수 있고 되돌릴 수 없어요.
      </p>

      <div className="company-leave-toolbar">
        <Select
          label="연도"
          value={String(year)}
          onChange={(value) => setYear(Number(value))}
          options={yearOptions.map((value) => ({ value: String(value), label: `${value}년` }))}
        />
        <div className="company-leave-action">
          <Button label="단체연차 등록하기" variant="primary" onClick={() => setAdding(true)} />
        </div>
      </div>

      {/* 차감 결과는 표 위에 남긴다. 빠진 사람이 여기 말고는 드러날 곳이 없다. */}
      {apply.data && <ApplyResultNotice result={apply.data} />}

      <Table
        columns={columns}
        rows={companyLeaves.data}
        keyOf={(row) => row.id}
        isPending={companyLeaves.isPending}
        error={companyLeaves.error}
        emptyText={`${year}년에 등록된 단체연차가 없어요.`}
      />

      {/* 열 때마다 다시 만든다. 날짜 기본값이 그때의 오늘이어야 한다. */}
      <CompanyLeaveCreateDialog
        key={adding ? 'open' : 'closed'}
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(companyLeave) => setYear(Number(companyLeave.targetDate.slice(0, 4)))}
      />

      {/* 전 직원의 잔여가 걸린 동작이다. 무엇이 일어나는지 구체적으로 적는다 */}
      <Dialog
        open={applying !== undefined}
        title="단체연차 차감"
        description="이 날짜로 전 직원의 연차 신청서를 만들고 잔여에서 빼요. 한 번만 할 수 있고 되돌릴 수 없어요. 잔여가 모자란 사람은 차감되지 않고 명단으로 나와요."
        confirmLabel="차감하기"
        danger
        loading={apply.isPending}
        onClose={() => setApplying(undefined)}
        onConfirm={() => {
          if (!applying) return;
          apply.mutate(applying.id, { onSuccess: () => setApplying(undefined) });
        }}
      >
        <p className="muted">
          {applying?.targetDate}
          {applying ? ` (${weekdayText(applying.targetDate)})` : ''} · {applying?.reason}
        </p>
        {apply.error && <p className="danger">{apply.error.message}</p>}
      </Dialog>
    </section>
  );
}
