import type { CalculateResult } from './api';
import './SkippedNotice.css';

/**
 * 계산 결과. 미확정 근태가 남은 직원은 계산되지 않는다.
 *
 * **성공 개수만 보여주지 않는다.** 조용히 넘기면 급여가 빠진 채로 이체된다.
 * 명단은 표 위 도구줄에 건수와 함께 따로 보여준다 (DESIGN_ADMIN.md 3장).
 */
export function SkippedNotice({ result }: { result: CalculateResult }) {
  const skippedCount = result.skipped.length;

  return (
    <div className="calc-result">
      <p className="calc-summary">
        대상 {result.targets}명 중 {result.calculated}명을 계산했어요.
      </p>

      {skippedCount > 0 && (
        <>
          <p className="calc-skipped-title">{skippedCount}명은 계산하지 못했어요.</p>
          <ul className="calc-skipped">
            {result.skipped.map((employee) => (
              <li key={employee.employeeId}>
                {employee.employeeName ?? `직원 ${employee.employeeId}`} —{' '}
                {employee.reason ?? '사유를 받지 못했어요'}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
