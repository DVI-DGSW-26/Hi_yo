/**
 * 아직 만들지 않은 화면 자리. 빈 라우트로 두면 눌렀을 때 아무 일도 안 일어나서
 * 고장난 것처럼 보인다. 무엇이 없는지 적어둔다.
 */
interface Props {
  screenId: string;
  title: string;
  /** 만들기 전에 필요한 것. 없으면 비운다 */
  blockedBy?: string;
}

export function NotBuilt({ screenId, title, blockedBy }: Props) {
  return (
    <section>
      <h1 className="page-title">
        {screenId} {title}
      </h1>
      <p className="muted">아직 만들지 않았어요.</p>
      {blockedBy && <p className="muted">{blockedBy}</p>}
    </section>
  );
}
