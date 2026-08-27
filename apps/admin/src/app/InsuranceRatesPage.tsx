import { useState } from 'react';
import { formatAmount, formatRatePercent } from '@hr/format';
import { Select, StatusText, Table, type Column } from '@/components';
import {
  useInsuranceRates,
  useInsuranceYears,
  type InsuranceRate,
} from '@/features/insurance/api';
import './InsuranceRatesPage.css';

/**
 * 보험 요율 — 조회
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 해의 급여가 어떤 요율로 계산되는가.**
 *
 * 조회만 한다. 등록·수정은 만들지 않았다 (`features/insurance/api.ts` 주석).
 * 값을 여기서 계산하지 않는다 — 요율을 곱해 금액을 만들어보는 코드를 넣지 않는다.
 */
export function InsuranceRatesPage() {
  const years = useInsuranceYears();
  const [picked, setPicked] = useState<number>();

  // 고르기 전에는 가장 최근 해를 본다. 목록이 최근 해부터 온다.
  const year = picked ?? years.data?.[0];
  const rates = useInsuranceRates(year);

  const columns: Column<InsuranceRate>[] = [
    {
      key: 'item',
      header: '항목',
      sticky: true,
      // 표시명은 서버가 준다. 코드로 이름을 만들지 않는다.
      render: (row) => row.itemName ?? row.itemCode,
    },
    {
      key: 'rate',
      header: '요율',
      align: 'right',
      render: (row) => formatRatePercent(row.ratePercent),
    },
    {
      key: 'base',
      header: '곱하는 기준',
      // 비어 있으면 지급총액에 곱한다 (docs/API_급여.md 6장).
      render: (row) => row.baseItemName ?? row.baseItemCode ?? '지급총액',
    },
    {
      key: 'autoCalculate',
      header: '자동 계산',
      render: (row) => <StatusText label={row.autoCalculate ? '예' : '아니오'} />,
    },
    {
      key: 'roundUnit',
      header: '금액 단위',
      align: 'right',
      render: (row) => (row.roundUnit === null ? '—' : `${formatAmount(row.roundUnit)}원`),
    },
  ];

  return (
    <section>
      <h1 className="page-title">보험 요율</h1>

      <p className="muted rates-meta">
        급여를 계산할 때 이 요율을 그대로 써요. 지난해에서 복사해 온 요율이면 고시된 값과 맞는지
        확인해주세요.
      </p>

      {years.error ? (
        <p className="danger">{years.error.message}</p>
      ) : (
        <div className="rates-toolbar">
          <Select
            label="적용 연도"
            value={year === undefined ? '' : String(year)}
            onChange={(value) => setPicked(Number(value))}
            placeholder={yearPlaceholder(years.isPending, years.data)}
            options={(years.data ?? []).map((value) => ({
              value: String(value),
              label: `${value}년`,
            }))}
          />
        </div>
      )}

      {years.error ? null : years.isPending ? (
        <p className="muted">불러오는 중이에요.</p>
      ) : year === undefined ? (
        <p className="muted">요율이 등록된 해가 아직 없어요.</p>
      ) : (
        <Table
          columns={columns}
          rows={rates.data}
          keyOf={(row) => row.id}
          isPending={rates.isPending}
          error={rates.error}
          emptyText={`${year}년에 등록된 요율이 없어요.`}
        />
      )}
    </section>
  );
}

/** 고를 것이 없을 때만 문구를 둔다. 해가 있으면 첫 항목(최근 해)이 선택된다. */
function yearPlaceholder(isPending: boolean, years: number[] | undefined): string | undefined {
  if (isPending) return '불러오는 중이에요';
  if (!years || years.length === 0) return '등록된 해가 없어요';
  return undefined;
}
