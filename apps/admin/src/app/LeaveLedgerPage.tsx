import { useState } from 'react';
import { formatLeaveDays } from '@hr/format';
import { Select, Summary, Table, type Column } from '@/components';
import {
  selectableLedgerYears,
  useLeaveLedger,
  type LeaveLedgerRow,
} from '@/features/leave/api';

/**
 * A-303 연차관리대장
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 해에 연차를 아직 안 넣은 사람이 누구인가.**
 *
 * 서버가 자동 부여를 하지 않는다. 관리팀이 산정한 발생 일수를 직접 넣어야 하고,
 * 안 넣으면 그 사람은 연차가 0일인 채로 한 해를 보낸다. 그래서 이 표는 잔여를 확인하는
 * 표이기 전에 **누락을 찾는 명단**이다 — 서버가 발생 0인 직원까지 내려주는 이유가 그것이다
 * (`docs/API_연차.md` 3장).
 *
 * **`0일` 과 `아직 안 넣었어요` 를 구분해 적는다.** 둘을 다 `0일` 로 그리면 이 화면이
 * 할 일이 없어진다.
 *
 * **발생을 넣는 화면(A-306)은 아직 없다.** 발생 규칙과 `grantType` 다섯 개의 뜻이
 * 정해지지 않았다 (`docs/API_연차.md` 7장 1·4번). 그래서 조회만 하는 화면이고
 * primary 버튼도 그린도 없다 (`DESIGN_ADMIN.md` 7장).
 */
export function LeaveLedgerPage() {
  const yearOptions = selectableLedgerYears();
  const [year, setYear] = useState(() => yearOptions[0]!);
  const [onlyMissing, setOnlyMissing] = useState(false);

  const ledger = useLeaveLedger(year);

  /*
   * 거르는 것을 화면에서 한다. 52시간 현황과 다른 판단이다 — 그쪽은 서버가 `onlyAlerted`
   * 를 주고 단계도 서버가 매기므로 화면이 다시 거르면 기준이 어긋난다. 여기는 서버에
   * 거르는 파라미터가 없고, `noGrant` 는 서버가 준 참·거짓 그대로다. 다시 판정하지 않는다.
   */
  const rows = ledger.data && onlyMissing ? ledger.data.filter((row) => row.noGrant) : ledger.data;
  const missingCount = ledger.data?.filter((row) => row.noGrant).length;

  const columns: Column<LeaveLedgerRow>[] = [
    {
      key: 'employee',
      header: '이름',
      sticky: true,
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'employeeNo', header: '사번', render: (row) => row.employeeNo ?? '—' },
    { key: 'corporation', header: '법인', render: (row) => row.corporation ?? '—' },
    { key: 'department', header: '부서', render: (row) => row.departmentName ?? '—' },
    {
      key: 'granted',
      header: '발생',
      align: 'right',
      // 행 배경을 칠하지 않는다. 사유를 그 셀에 danger 글자로 적는다 (DESIGN_ADMIN.md 3장).
      render: (row) =>
        row.noGrant ? (
          <span className="danger">아직 안 넣었어요</span>
        ) : (
          formatLeaveDays(row.granted)
        ),
    },
    { key: 'used', header: '사용', align: 'right', render: (row) => formatLeaveDays(row.used) },
    {
      key: 'pending',
      header: '결재 대기',
      align: 'right',
      render: (row) => formatLeaveDays(row.pending),
    },
    {
      key: 'remaining',
      header: '잔여',
      align: 'right',
      render: (row) => formatLeaveDays(row.remaining),
    },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">연차관리대장</h1>
          <p className="page-lead">
            발생을 넣지 않은 사람도 같이 나와요. 서버가 연차를 자동으로 주지 않아서, 안 넣으면 그
            사람은 한 해를 0일로 보내요.
          </p>
        </div>
      </div>

      {/* 표를 세어야 알 수 있는데 그것이 이 화면의 목적인 값이다 (DESIGN_ADMIN.md 11장). */}
      {ledger.data && (
        <Summary
          items={[
            { label: `${year}년 대장`, value: `${ledger.data.length}명` },
            { label: '발생 미입력', value: `${missingCount}명` },
          ]}
          note="잔여는 결재 대기중인 신청까지 뺀 값이에요. 화면에서 다시 계산하지 않아요."
        />
      )}

      <Table
        columns={columns}
        rows={rows}
        keyOf={(row) => row.employeeId}
        isPending={ledger.isPending}
        error={ledger.error}
        emptyText={
          onlyMissing
            ? `${year}년은 전 직원에게 발생이 들어가 있어요.`
            : `${year}년 대장에 직원이 없어요.`
        }
        toolbar={
          <>
            <Select
              label="연도"
              value={String(year)}
              onChange={(value) => setYear(Number(value))}
              options={yearOptions.map((value) => ({ value: String(value), label: `${value}년` }))}
            />
            <Select
              label="보기"
              value={onlyMissing ? 'missing' : 'all'}
              onChange={(value) => setOnlyMissing(value === 'missing')}
              options={[
                { value: 'all', label: '전 직원' },
                { value: 'missing', label: '발생 미입력만' },
              ]}
            />
          </>
        }
      />
    </section>
  );
}
