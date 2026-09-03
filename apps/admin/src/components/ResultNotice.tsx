import type { ReactNode } from 'react';
import './ResultNotice.css';

interface NoticeProps {
  /** 무엇이 얼마나 됐는가. 한 문장으로 적는다 */
  summary: string;
  /**
   * 곁들이는 한 줄. 서버가 준 안내나, 결과를 잘못 읽지 않게 하는 설명에 쓴다 —
   * 「이미 있는 값은 덮어쓰지 않아요」 같은 것.
   */
  note?: string;
  /** `ResultList` 를 필요한 만큼 넣는다. 없으면 요약만 그린다 */
  children?: ReactNode;
}

/**
 * 되돌릴 수 없는 일괄 동작의 결과 상자.
 *
 * **건수만 보여주지 않기 위해 있는 것이다.** 이 상자가 붙는 동작들은 전부
 * **일부가 조용히 빠질 수 있고, 빠진 것이 화면에서 사라지면 사고가 된다.**
 *
 * | 어디 | 빠지면 |
 * |---|---|
 * | 단체연차 차감 | 잔여가 모자란 사람이 무단결근으로 처리된다 |
 * | 급여 계산 | 그 사람 급여가 빠진 채로 이체된다 |
 * | 당직 자동 편성 | 연차 쓴 사람에게 당직이 배정된 채로 남는다 |
 * | 세콤 직원 가져오기 | 그 사람 근태가 통째로 쌓이지 않는다 |
 *
 * 그래서 넷 다 **표 위에 건수와 명단을 같이** 그린다 (`DESIGN_ADMIN.md` 3장).
 *
 * **네 곳이 각자 갖고 있던 것을 올렸다** (2026-09-03). 클래스 이름만 다르고
 * (`apply-`·`calc-`·`gen-`·`sync-`) 구조와 CSS가 같았다.
 *
 * **줄의 내용은 올리지 않았다.** 무엇을 적을지가 기능마다 다르다 — 잔여 일수, 당직 날짜,
 * 부서. 여기가 갖는 것은 **상자·요약·명단의 모양**뿐이고 `<li>` 는 부르는 쪽이 채운다.
 */
export function ResultNotice({ summary, note, children }: NoticeProps) {
  return (
    <div className="result-notice">
      <p className="result-summary">{summary}</p>
      {note !== undefined && <p className="result-note">{note}</p>}
      {children}
    </div>
  );
}

interface ListProps {
  /** 몇 명(건)이 왜 빠졌는지. **숫자와 함께 적는다** */
  title: string;
  /**
   * `danger` 는 **여기서 고칠 수 있는 것**에만 쓴다 (`DESIGN_RULES.md` 2장).
   * 정상 동작으로 건너뛴 것(이미 쉬는 사람 등)은 무채색이다.
   */
  tone?: 'danger';
  /** `<li>` 들. 키는 부르는 쪽이 정한다 — 무엇이 그 줄을 가리는지 기능마다 다르다 */
  children: ReactNode;
}

/** 빠진 것들의 명단. 비어 있으면 부르는 쪽에서 아예 그리지 않는다 */
export function ResultList({ title, tone, children }: ListProps) {
  return (
    <>
      <p className={tone === 'danger' ? 'result-list-title danger-text' : 'result-list-title'}>
        {title}
      </p>
      <ul className="result-list">{children}</ul>
    </>
  );
}
