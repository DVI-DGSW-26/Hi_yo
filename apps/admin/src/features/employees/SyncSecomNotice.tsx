import type { PersonSyncResult } from './api';
import './SyncSecomNotice.css';

/**
 * 세콤에서 직원을 가져온 결과.
 *
 * **넣지 못한 사람을 반드시 보여준다.** 서버 스펙이 "조용히 빠지면 그 사람 근태가 통째로
 * 사라진다"고 적고 있다 — 세콤에 있는데 직원으로 안 들어온 사람은 태그를 찍어도 근태가
 * 어디에도 쌓이지 않는다. 건수만 보여주면 그 사실이 화면에서 사라진다
 * (`DESIGN_ADMIN.md` 3장. 단체연차 차감의 `ApplyResultNotice`와 같은 기준).
 *
 * **빠진 사람은 `danger`로 둔다.** 빨강의 기준은 「여기서 고칠 수 있는가」인데
 * (`DESIGN_RULES.md` 2장), 이 화면에서 직원을 손으로 등록할 수 있다.
 *
 * 결과가 `0명`이어도 그리는 것이 맞다. **아무것도 안 바뀐 것과 안 눌린 것은 다르다.**
 */
export function SyncSecomNotice({ result }: { result: PersonSyncResult }) {
  const changed = result.created + result.updated;

  return (
    <div className="sync-result">
      <p className="sync-summary">
        세콤에서 {result.read}명을 읽었어요.{' '}
        {changed === 0
          ? '새로 만들거나 채운 사람은 없어요.'
          : `${result.created}명을 새로 만들고 ${result.updated}명의 빈 항목을 채웠어요.`}
      </p>

      {/* 덮어쓰지 않는다는 것을 적어 둔다. 값이 안 바뀐 것을 실패로 읽지 않게 한다. */}
      <p className="sync-notice">
        이미 있는 값은 덮어쓰지 않아요. 세콤이 아는 것은 이름·카드번호·입사일뿐이라 사번과
        부서는 비어 있어요.
      </p>

      {result.skipped.length > 0 && (
        <>
          <p className="sync-skipped-title danger-text">
            {result.skipped.length}명은 넣지 못했어요. 이 사람들은 태그를 찍어도 근태가 쌓이지
            않으니 직접 등록해주세요.
          </p>
          <ul className="sync-skipped">
            {result.skipped.map((person, index) => (
              <li key={person.employeeId ?? `${person.employeeName ?? ''}-${index}`}>
                {person.employeeName ?? '이름을 받지 못했어요'} —{' '}
                {/* 사유는 서버가 준 것을 그대로 쓴다. 앱에서 문구를 만들지 않는다. */}
                {person.reason ?? '사유를 받지 못했어요'}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
