import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { formatLeaveDays } from '@hr/format';
import { Button, Dialog, RowLink, Select, Summary, Table, type Column } from '@/components';
import { orDash } from '@/lib/cell';
import {
  grantTypeLabel,
  selectableLedgerYears,
  useDeleteLeaveGrant,
  useEmployeeLeaveBalance,
  useLeaveGrants,
  type LeaveGrant,
} from '@/features/leave/api';
import { LeaveGrantForm } from '@/features/leave/LeaveGrantForm';

/**
 * A-306 연차 발생 등록
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 사람에게 이 해 연차를 얼마나 넣었는가.**
 *
 * 대장(A-303)에서 한 사람을 눌러 들어온다. `GET /leave/grants`가 `employeeId`를 필수로
 * 받아서 전 직원을 한 번에 넣는 화면이 될 수 없고, 애초에 **넣어야 할 값이 사람마다
 * 다르다** — 서버가 계산하지 않고 관리팀이 산정한 값을 보관만 한다
 * (`LeaveGrantCreateRequest` 설명).
 *
 * **발생 표만으로는 잔여를 알 수 없어** 잔여를 따로 받아 위에 적는다. 사용·결재대기가
 * 빠져 있어서다. **화면이 다시 세지 않는다** (`CLAUDE.md` 3장).
 *
 * 수정(`PUT /leave/grants/{id}`)은 넣지 않았다. 잘못 넣은 것은 지우고 다시 넣는다 —
 * 폼이 하나 더 생기는 만큼의 값이 없다.
 */
export function LeaveGrantsPage() {
  const navigate = useNavigate();
  const params = useParams<{ employeeId: string }>();
  const employeeId = Number(params.employeeId);

  const yearOptions = selectableLedgerYears();
  const [year, setYear] = useState(() => yearOptions[0]!);
  const [removing, setRemoving] = useState<LeaveGrant | null>(null);

  const balance = useEmployeeLeaveBalance(employeeId, year);
  const grants = useLeaveGrants(employeeId, year);
  const remove = useDeleteLeaveGrant();

  const columns: Column<LeaveGrant>[] = [
    {
      key: 'grantType',
      header: '종류',
      sticky: true,
      render: (row) => grantTypeLabel(row.grantType),
    },
    {
      key: 'grantedDays',
      header: '일수',
      align: 'right',
      render: (row) => formatLeaveDays(row.grantedDays),
    },
    { key: 'grantedOn', header: '생긴 날', render: (row) => orDash(row.grantedOn) },
    { key: 'expiresOn', header: '사라지는 날', render: (row) => orDash(row.expiresOn) },
    { key: 'note', header: '메모', render: (row) => orDash(row.note) },
    { key: 'createdByName', header: '넣은 사람', render: (row) => orDash(row.createdByName) },
    {
      key: 'remove',
      header: '',
      // 행별 동작은 버튼이 아니라 글자 링크다 (`DESIGN_ADMIN.md` 5장).
      render: (row) => <RowLink label="지우기" onClick={() => setRemoving(row)} />,
    },
  ];

  const name = balance.data?.employeeName ?? grants.data?.[0]?.employeeName;

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">{name ? `${name} 연차 발생` : '연차 발생'}</h1>
          <p className="page-lead">
            서버가 연차를 자동으로 주지 않아요. 관리팀이 산정한 일수를 여기에 넣어야 그 사람
            연차가 생겨요.
          </p>
        </div>
        <div className="page-head-action">
          <Button label="대장으로" onClick={() => navigate('/leave-ledger')} />
        </div>
      </div>

      {/* 발생 표만 봐서는 잔여를 알 수 없다. 사용·결재대기가 빠져 있다 */}
      {balance.data && (
        <Summary
          items={[
            { label: `${year}년 총 연차`, value: formatLeaveDays(balance.data.granted) },
            { label: '사용', value: formatLeaveDays(balance.data.used) },
            { label: '결재 대기', value: formatLeaveDays(balance.data.pending) },
            { label: '잔여', value: formatLeaveDays(balance.data.remaining) },
          ]}
          note="잔여는 결재 대기중인 신청까지 뺀 값이에요. 화면에서 다시 계산하지 않아요."
        />
      )}

      <Table
        columns={columns}
        rows={grants.data}
        keyOf={(row) => row.id}
        isPending={grants.isPending}
        error={grants.error}
        emptyText={`${year}년에 넣은 연차가 없어요. 아래에서 넣어주세요.`}
        toolbar={
          <Select
            label="연도"
            value={String(year)}
            onChange={(value) => setYear(Number(value))}
            options={yearOptions.map((value) => ({ value: String(value), label: `${value}년` }))}
          />
        }
      />

      <LeaveGrantForm employeeId={employeeId} year={year} yearOptions={yearOptions} />

      <Dialog
        open={removing !== null}
        title="이 발생을 지울까요?"
        description={
          removing
            ? `${grantTypeLabel(removing.grantType)} ${formatLeaveDays(removing.grantedDays)}을 지워요. 이미 쓴 연차가 있으면 잔여가 음수가 돼서 서버가 막아요.`
            : ''
        }
        confirmLabel="지우기"
        danger
        loading={remove.isPending}
        onClose={() => {
          setRemoving(null);
          remove.reset();
        }}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
        }}
      >
        {remove.error && <p className="danger">{remove.error.message}</p>}
      </Dialog>
    </section>
  );
}
