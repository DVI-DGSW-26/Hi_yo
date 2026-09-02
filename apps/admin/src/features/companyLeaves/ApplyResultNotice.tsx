import { weekdayText } from '@/lib/datetime';
import type { CompanyLeaveApplyResult, SkippedEmployee } from './api';
import './ApplyResultNotice.css';

/**
 * 일괄 차감 결과.
 *
 * **차감된 인원수만 보여주지 않는다.** 잔여가 모자란 사람은 차감되지 않은 채로 남는데,
 * 그 사실이 화면에서 사라지면 그 사람은 무단결근으로 처리된다.
 * 명단을 표 위에 건수와 함께 따로 보여준다 (`DESIGN_ADMIN.md` 3장).
 *
 * **부족분을 화면이 처리하지 않는다.** 무급으로 돌릴지 마이너스로 둘지는 서버 스펙이
 * "시스템이 정할 문제가 아니다"라고 못박고 있고, 명세서 5장(자동 무급 전환)과도 어긋나
 * 아직 확정되지 않았다 (`docs/API_연차.md` 8장). 누가 모자랐는지만 알린다.
 */
export function ApplyResultNotice({ result }: { result: CompanyLeaveApplyResult }) {
  return (
    <div className="apply-result">
      <p className="apply-summary">
        {result.targetDate} ({weekdayText(result.targetDate)}) · {result.reason} —{' '}
        {result.deductedCount}명 차감했어요.
      </p>

      {/* 서버가 안내를 주면 그대로 보여준다. 앱에서 문구를 만들지 않는다. */}
      {result.notice && <p className="apply-notice">{result.notice}</p>}

      <SkippedList
        title={`${result.insufficient.length}명은 잔여가 모자라 차감하지 못했어요. 사람별로 정해주세요.`}
        employees={result.insufficient}
        tone="danger"
      />

      <SkippedList
        title={`${result.alreadyOnLeave.length}명은 그날 이미 쉬는 것으로 돼 있어 건너뛰었어요.`}
        employees={result.alreadyOnLeave}
      />
    </div>
  );
}

/**
 * 빠진 사람 명단.
 *
 * 잔여 부족은 관리팀이 손대야 하는 줄이라 `danger` 글자로 두고, 이미 쉬는 사람은
 * 정상 동작이라 무채색이다. 배경색으로 칠하지 않는다 (`DESIGN_ADMIN.md` 3장).
 */
function SkippedList({
  title,
  employees,
  tone,
}: {
  title: string;
  employees: SkippedEmployee[];
  tone?: 'danger';
}) {
  if (employees.length === 0) return null;

  return (
    <>
      <p className={tone === 'danger' ? 'apply-skipped-title danger-text' : 'apply-skipped-title'}>
        {title}
      </p>
      <ul className="apply-skipped">
        {employees.map((employee) => (
          <li key={employee.employeeId}>
            {employee.employeeName ?? `직원 ${employee.employeeId}`}
            {employee.departmentName ? ` · ${employee.departmentName}` : ''} —{' '}
            {/* 잔여는 서버가 준 값을 그대로 쓴다. 여기서 더하거나 빼지 않는다. */}
            {employee.remaining == null ? '' : `잔여 ${employee.remaining}일 · `}
            {employee.reason ?? '사유를 받지 못했어요'}
          </li>
        ))}
      </ul>
    </>
  );
}
