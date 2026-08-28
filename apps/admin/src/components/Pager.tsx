import type { PageResponse } from '@/lib/api';
import { Button } from './Button';
import './Pager.css';

interface Props {
  /** 서버가 준 목록 봉투를 그대로 넘긴다. 쪽 계산을 화면에서 하지 않는다 */
  page: PageResponse<unknown> | undefined;
  onChange: (page: number) => void;
  /** 전체 개수의 단위. `명` · `건` 처럼 무엇을 세는지 적는다 */
  unit: string;
}

/**
 * 표 아래 쪽 넘김.
 *
 * **쪽 수와 전체 개수는 서버가 준 값을 그대로 쓴다.** `totalElements / size` 같은 계산을
 * 화면에서 하지 않는다 — 필터가 걸린 목록에서 어긋난다.
 *
 * 첫 쪽·마지막 쪽에서는 버튼이 눌리지 않고 **왜 안 눌리는지가 옆에 나온다.** 쪽 상태는
 * 사용자가 값을 고쳐서 풀 수 있는 것이 아니라 지금 목록의 상태다 — `DESIGN_ADMIN.md` 1장이
 * `disabled`를 허용하는 경우다.
 *
 * 쪽 번호 목록(1 2 3 …)을 만들지 않는다. 관리팀은 필터로 좁혀서 찾지, 쪽을 짚어 가지 않는다.
 * 필요해지면 그때 만든다.
 */
export function Pager({ page, onChange, unit }: Props) {
  // 아직 못 받았거나 한 쪽에 다 들어가면 넘길 것이 없다.
  if (!page || page.totalElements === 0) return null;

  return (
    <div className="pager">
      <Button
        label="이전"
        disabledReason={page.first ? '첫 쪽이에요.' : undefined}
        onClick={() => onChange(Math.max(0, page.page - 1))}
      />
      <span className="pager-text">
        {page.page + 1} / {page.totalPages} · 전체 {page.totalElements}
        {unit}
      </span>
      <Button
        label="다음"
        disabledReason={page.last ? '마지막 쪽이에요.' : undefined}
        onClick={() => onChange(page.page + 1)}
      />
    </div>
  );
}
