import type { ReactNode } from 'react';
import './DetailList.css';

interface Item {
  label: string;
  /** 서버가 준 값을 그대로 넣는다. 없으면 무엇이 없는지 적는다 — `—` 만 두지 않는다 */
  value: ReactNode;
  /** 값이 길어 한 칸을 다 쓰는 것. 주소·사유처럼 문장인 값에 쓴다 */
  wide?: boolean;
}

/**
 * 상세 화면의 라벨-값 목록 (`DESIGN_ADMIN.md` 11장).
 *
 * **라벨을 왼쪽에 세우지 않는다.** 라벨 열과 값 열을 가로로 두면 항목이 열 개를 넘는 순간
 * 세로로 길어지고, 라벨 길이에 따라 값의 시작점이 흔들린다. 라벨을 값 위에 얹고 여러 칸으로
 * 흘리면 한눈에 훑을 수 있다.
 *
 * `Summary`와 다르다 — `Summary`는 표를 읽기 전에 알아야 하는 **숫자 두어 개**를 크게 두는
 * 것이고, 이건 한 사람·한 건의 **사실 여러 개**를 늘어놓는 것이다.
 */
export function DetailList({ items }: { items: Item[] }) {
  return (
    <dl className="detail-list">
      {items.map((item) => (
        <div key={item.label} className={item.wide ? 'detail-cell is-wide' : 'detail-cell'}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
