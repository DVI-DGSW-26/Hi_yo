import type { ReactNode } from 'react';
import './Table.css';

export interface Column<T> {
  key: string;
  header: string;
  /** 숫자는 오른쪽. 금액·일수·시간 전부 (DESIGN_ADMIN.md 3장) */
  align?: 'left' | 'right';
  /** 첫 열 하나만. 가로 스크롤에 고정된다 */
  sticky?: boolean;
  render: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  keyOf: (row: T) => string | number;
  isPending?: boolean;
  error?: Error | null;
  /** 무엇이 없는지 적는다. `데이터 없음` 이 아니라 `아직 계산한 급여가 없어요` */
  emptyText: string;
  onRowClick?: (row: T) => void;
  /**
   * 이 표를 거르는 것들 — 연도·기간·검색어.
   *
   * 표와 한 상자에 들어간다. 무엇을 거른 표인지가 표에 붙어 있어야 읽힌다
   * (`DESIGN_ADMIN.md` 11장). 화면의 주 동작(등록·계산 실행)은 여기가 아니라
   * 제목 줄 오른쪽에 둔다.
   */
  toolbar?: ReactNode;
}

/**
 * 관리팀 화면의 표.
 *
 * 로딩·빈·에러를 **표 안에** 그린다. 표를 지우고 다른 것을 그리면 열 머리가 사라져
 * 무엇을 보던 화면인지 잃는다 (DESIGN_ADMIN.md 3장).
 *
 * **맨 뒤에 빈 칸을 하나 둔다.** 표는 상자 폭을 채워야 하는데(`width: 100%`), 열이 적으면
 * 남는 폭을 열들이 나눠 가져서 **이름과 숫자가 화면 양끝으로 흩어진다.** 넓은 화면에서
 * 특히 그렇다 — 2400px에서 여덟 열짜리 대장을 열면 `부서`와 `발생` 사이가 텅 빈다.
 * 남는 폭을 이 빈 칸이 전부 먹으면 열은 내용만큼만 차지하고 왼쪽부터 붙는다.
 * 열이 스무 개여서 넘칠 때는 빈 칸이 0이 되므로 그때 동작은 그대로다.
 */
export function Table<T>({
  columns,
  rows,
  keyOf,
  isPending,
  error,
  emptyText,
  onRowClick,
  toolbar,
}: Props<T>) {
  return (
    <div className="table-box">
      {toolbar && <div className="table-toolbar">{toolbar}</div>}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cellClass(column)}>
                  {column.header}
                </th>
              ))}
              {/* 남는 폭을 이 칸이 먹는다. 아래 주석 참고 */}
              <th className="is-spacer" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              // 빈 칸까지 세어야 메시지가 표 전체 폭에 걸린다.
              <Message columns={columns.length + 1}>불러오는 중이에요.</Message>
            ) : error ? (
              <Message columns={columns.length + 1} tone="danger">
                {error.message}
              </Message>
            ) : !rows || rows.length === 0 ? (
              <Message columns={columns.length + 1}>{emptyText}</Message>
            ) : (
              rows.map((row) => (
                <tr
                  key={keyOf(row)}
                  className={onRowClick ? 'is-clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cellClass(column)}>
                      {column.render(row)}
                    </td>
                  ))}
                  <td className="is-spacer" />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Message({
  columns,
  tone,
  children,
}: {
  columns: number;
  tone?: 'danger';
  children: ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={columns}
        className={tone === 'danger' ? 'table-message danger' : 'table-message'}
      >
        {children}
      </td>
    </tr>
  );
}

function cellClass<T>(column: Column<T>): string {
  return [
    column.align === 'right' ? 'align-right' : '',
    column.sticky ? 'is-sticky' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
