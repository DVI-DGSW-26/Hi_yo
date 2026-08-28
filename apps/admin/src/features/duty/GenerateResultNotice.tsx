import type { DutyGenerateResult } from './api';
import { weekdayText } from './labels';
import './GenerateResultNotice.css';

/**
 * 자동 편성 결과.
 *
 * **만든 건수만 보여주지 않는다.** 연차와 겹친 배정을 서버가 조용히 건너뛰지 않고
 * 그대로 배정한 뒤 `conflicts`로 알려준다. 관리팀이 보고 판단해야 하는 값이라
 * 표 위 도구줄에 건수와 함께 따로 보여준다 (`DESIGN_ADMIN.md` 3장).
 *
 * 다음 순번으로 넘길지 사람을 바꿀지는 확정되지 않았다 (서버 스펙 `OPEN-QUESTIONS E-8`).
 * 그래서 화면도 대신 고쳐주지 않는다 — 어느 건이 겹쳤는지만 알린다.
 */
export function GenerateResultNotice({ result }: { result: DutyGenerateResult }) {
  const conflictCount = result.conflicts.length;

  return (
    <div className="gen-result">
      <p className="gen-summary">
        {result.from} ~ {result.to} 사이에 {result.created}건을 만들었어요.
        {result.skipped > 0 && ` ${result.skipped}건은 이미 배정돼 있어 그대로 뒀어요.`}
      </p>

      {conflictCount > 0 && (
        <>
          <p className="gen-conflict-title">
            {conflictCount}건은 그날 연차를 쓴 사람에게 배정됐어요. 확인해주세요.
          </p>
          <ul className="gen-conflicts">
            {result.conflicts.map((conflict) => (
              <li key={`${conflict.dutyDate}-${conflict.employeeId}`}>
                {conflict.dutyDate} ({weekdayText(conflict.dutyDate)}) ·{' '}
                {conflict.employeeName ?? `직원 ${conflict.employeeId}`} —{' '}
                {conflict.reason ?? '사유를 받지 못했어요'}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
