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
}

/**
 * 관리팀 화면의 표.
 *
 * 로딩·빈·에러를 **표 안에** 그린다. 표를 지우고 다른 것을 그리면 열 머리가 사라져
 * 무엇을 보던 화면인지 잃는다 (DESIGN_ADMIN.md 3장).
 */
export function Table<T>({
  columns,
  rows,
  keyOf,
  isPending,
  error,
  emptyText,
  onRowClick,
}: Props<T>) {
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cellClass(column)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isPending ? (
            <Message columns={columns.length}>불러오는 중이에요.</Message>
          ) : error ? (
            <Message columns={columns.length} tone="danger">
              {error.message}
            </Message>
          ) : !rows || rows.length === 0 ? (
            <Message columns={columns.length}>{emptyText}</Message>
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
              </tr>
            ))
          )}
        </tbody>
      </table>
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
      <td colSpan={columns} className={tone === 'danger' ? 'table-message danger' : 'table-message'}>
        {children}
      </td>
    </tr>
  );
}

function cellClass<T>(column: Column<T>): string {
  return [column.align === 'right' ? 'align-right' : '', column.sticky ? 'is-sticky' : '']
    .filter(Boolean)
    .join(' ');
}
