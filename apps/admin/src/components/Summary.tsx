import type { ReactNode } from 'react';
import './Summary.css';

interface Item {
  label: string;
  /** 서버가 준 값을 그대로 넣는다. 여기서 세거나 계산하지 않는다 */
  value: ReactNode;
}

interface Props {
  items: Item[];
  /** 이 화면에서 무엇을 해야 하는지. 없으면 비운다 */
  note?: ReactNode;
}

/**
 * 표 위에서 이 화면의 상태를 먼저 말하는 줄 (`DESIGN_ADMIN.md` 11장).
 *
 * **표를 읽기 전에 알아야 하는 것만 넣는다.** 열다섯 날쯤 되는 해에 아홉 날만 등록돼
 * 있다는 것은 표를 세어야 알 수 있는데, 그것이 이 화면의 목적이라면 표 위에 있어야 한다.
 *
 * **채울 값이 없으면 쓰지 않는다.** 보험 요율처럼 조회만 하는 화면에 숫자를 만들어
 * 넣지 않는다 — 쓸 데 없는 수치는 표를 읽는 데 방해만 된다.
 *
 * 상자 모양은 급여 계산 결과·자동 편성 결과가 쓰던 것과 같다. 새 스타일이 아니다.
 */
export function Summary({ items, note }: Props) {
  return (
    /*
     * **이 줄은 늘 내용만큼만 차지한다** (2026-09-03. `Summary.css`).
     *
     * 폭을 채우면 숫자 두어 개와 안내문 뒤가 그대로 빈다 — 연차 결재에서 재보니
     * 932px 중 93px만 차 있었다. 숫자 한둘을 크게 두는 줄이라 늘려서 얻을 것이 없다.
     */
    <div className={note ? 'summary' : 'summary is-hug'}>
      {items.map((item) => (
        <div key={item.label} className="summary-cell">
          <span className="summary-label">{item.label}</span>
          <span className="summary-value">{item.value}</span>
        </div>
      ))}
      {note && <p className="summary-note">{note}</p>}
    </div>
  );
}
