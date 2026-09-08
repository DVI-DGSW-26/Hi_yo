import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { maskAccountNo } from '@hr/format';
import { Button, DetailList, StatusText } from '@/components';
import { AssignmentDialog } from '@/features/employees/AssignmentDialog';
import { EmployeeNoDialog } from '@/features/employees/EmployeeNoDialog';
import { ResidentNoDialog } from '@/features/employees/ResidentNoDialog';
import { StatusDialog } from '@/features/employees/StatusDialog';
import { StatusHistoryTable } from '@/features/employees/StatusHistoryTable';
import { useEmployee } from '@/features/employees/api';
import { STATUS_LABEL } from '@/features/employees/labels';

/**
 * A-102 직원 상세
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 사람은 지금 어떤 상태인가.**
 *
 * **바꿀 수 있는 것이 넷이 됐다** (2026-09-07). 재직상태 · 사번에 더해
 * **부서·직무**와 **주민등록번호**가 `PATCH` 로 열렸다 (2026-09-02 회신 1·2번).
 *
 * **이름·연락처·주소는 아직 못 바꾼다.** 그 항목들은 전체 교체 `PUT /employees/{id}` 로만
 * 갈 수 있는데, `PUT` 이 아직도 보내지 않은 `residentNo` 를 지우는지 확인되지 않았다
 * (`docs/01_물어볼_것.md` 25번). 지워지면 그 직원은 재직증명서를 발급받지 못한다 —
 * **확인 전에는 `PUT` 을 부르지 않는다.**
 *
 * **계좌번호는 서버가 가려주지 않는다** (2026-09-02 회신 10번). 원문이 내려오므로
 * 화면이 `maskAccountNo`로 가린다 — 모바일 마이페이지와 같은 함수다.
 * 관리팀 화면도 가리기로 정했다 (2026-09-07). 급여 이체에 원문이 필요해지면 그때
 * 그 화면에서 따로 연다 — **직원 상세는 사람을 확인하는 자리지 이체하는 자리가 아니다.**
 */
export function EmployeeDetail() {
  const { employeeId: raw } = useParams<{ employeeId: string }>();
  const employeeId = raw ? Number(raw) : undefined;

  const employee = useEmployee(employeeId);
  const [statusDialog, setStatusDialog] = useState(false);
  const [noDialog, setNoDialog] = useState(false);
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [residentNoDialog, setResidentNoDialog] = useState(false);

  if (employee.isPending) return <p className="muted">불러오는 중이에요.</p>;
  if (employee.error) return <p className="danger">{employee.error.message}</p>;

  const { summary, ...detail } = employee.data;

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <Link to="/employees" className="back-link">
            직원 목록으로
          </Link>
          <h1 className="page-title">{summary.name}</h1>
          <p className="page-lead">계좌번호는 뒤 네 자리만 보여줘요.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <DetailList
            items={[
              { label: '사번', value: summary.employeeNo ?? '아직 없어요' },
              { label: '법인', value: summary.corporation ?? '아직이에요' },
              { label: '부서', value: summary.departmentName ?? '아직이에요' },
              {
                label: '직무',
                value: `${summary.jobName ?? '아직이에요'}${
                  summary.payrollTarget ? ' · 급여계산 대상' : ''
                }`,
              },
              { label: '입사일', value: summary.hireDate ?? '아직이에요' },
              { label: '실입사일', value: summary.originalHireDate ?? '아직이에요' },
              {
                label: '재직상태',
                value: (
                  <>
                    <StatusText
                      label={summary.employmentStatusLabel ?? STATUS_LABEL[summary.employmentStatus]}
                    />
                    {summary.resignDate ? ` · ${summary.resignDate}` : ''}
                  </>
                ),
              },
              {
                label: '주민등록번호',
                value: summary.residentNoRegistered ? (
                  '등록됨'
                ) : (
                  // 이제 등록할 수 있다. 그래도 빨갛게 두지 않는다 — 아직 안 한 일이지
                  // 잘못된 값이 아니다 (2장).
                  <StatusText label="등록되지 않았어요" />
                ),
              },
              { label: '연락처', value: detail.phone ?? '아직이에요' },
              {
                label: '계좌',
                // 서버가 원문을 준다. 그리기 직전에 가린다 (2026-09-02 회신 10번).
                value: detail.bankAccount?.bankAccount
                  ? `${detail.bankAccount.bankName ?? ''} ${maskAccountNo(
                      detail.bankAccount.bankAccount,
                    )}`.trim()
                  : '아직이에요',
              },
              /*
               * 이메일만 `wide` 다. 200px 칸에서는 회사 도메인이 붙은 주소가 네 줄로
               * 접혀 상자 높이를 혼자 키웠다 (2026-09-02 확인). 한 줄을 쓰되
               * `readWidth` 를 넘지 않는다.
               *
               * 마지막에 둔 이유 — `wide` 는 한 행을 통째로 쓰므로 가운데 두면 그 행의
               * 나머지 칸이 빈다.
               */
              { label: '이메일', value: detail.email ?? '아직이에요', wide: true },
            ]}
          />
        </div>

        <div className="panel-actions">
          <p className="panel-note">
            이름·연락처·주소는 아직 못 바꿔요. 그 항목은 전체 교체로만 갈 수 있는데 그때
            주민등록번호가 지워지는지 확인이 안 됐어요.
          </p>
          <div className="panel-buttons">
            <Button label="재직상태 바꾸기" onClick={() => setStatusDialog(true)} />
            <Button label="부서·직무 바꾸기" onClick={() => setAssignmentDialog(true)} />
            <Button
              label={
                summary.residentNoRegistered
                  ? '주민등록번호 다시 등록하기'
                  : '주민등록번호 등록하기'
              }
              onClick={() => setResidentNoDialog(true)}
            />
            <Button
              label={summary.employeeNo ? '사번 다시 부여하기' : '사번 부여하기'}
              onClick={() => setNoDialog(true)}
            />
          </div>
        </div>
      </div>

      <h2 className="section-title">재직상태 이력</h2>
      <StatusHistoryTable employeeId={summary.id} />

      <StatusDialog
        open={statusDialog}
        employeeId={summary.id}
        current={summary.employmentStatus}
        onClose={() => setStatusDialog(false)}
      />
      <EmployeeNoDialog
        open={noDialog}
        employeeId={summary.id}
        current={summary.employeeNo}
        onClose={() => setNoDialog(false)}
      />
      {/*
        `key` 로 다시 만든다. 대화상자가 지금 값으로 시작하는데, 바꾸고 나서 다시 열면
        `useState` 초기값이 옛 값에 머문다.
      */}
      <AssignmentDialog
        key={`${summary.departmentId}-${summary.jobId}`}
        open={assignmentDialog}
        employee={summary}
        onClose={() => setAssignmentDialog(false)}
      />
      <ResidentNoDialog
        open={residentNoDialog}
        employeeId={summary.id}
        registered={summary.residentNoRegistered}
        onClose={() => setResidentNoDialog(false)}
      />
    </section>
  );
}
