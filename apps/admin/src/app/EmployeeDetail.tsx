import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Button,
  DetailList,
  Dialog,
  Field,
  Select,
  StatusText,
  Table,
  type Column,
} from '@/components';
import {
  useAssignEmployeeNo,
  useChangeStatus,
  useEmployee,
  useStatusHistory,
  type EmploymentStatus,
  type StatusHistory,
} from '@/features/employees/api';

/**
 * A-102 직원 상세
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 사람은 지금 어떤 상태인가.**
 *
 * **수정 폼이 없다.** `PUT /employees/{id}` 가 전체 교체라 보내지 않은 필드가 지워지는데,
 * 주민등록번호는 어떤 조회 응답으로도 읽을 수 없어 다시 채워 보낼 수가 없다. 수정할 때마다
 * 주민번호가 지워지면 재직증명서 발급이 막힌다. 서버가 부분 수정을 지원해야 붙일 수 있다.
 *
 * 계좌정보는 서버가 마스킹한 값을 그대로 보여준다. 여기서 가리거나 풀지 않는다.
 */
const STATUS_LABEL: Record<EmploymentStatus, string> = {
  ACTIVE: '재직',
  ON_LEAVE: '휴직',
  RESIGNED: '퇴사',
};

export function EmployeeDetail() {
  const { employeeId: raw } = useParams<{ employeeId: string }>();
  const employeeId = raw ? Number(raw) : undefined;

  const employee = useEmployee(employeeId);
  const history = useStatusHistory(employeeId);
  const [statusDialog, setStatusDialog] = useState(false);
  const [noDialog, setNoDialog] = useState(false);

  if (employee.isPending) return <p className="muted">불러오는 중이에요.</p>;
  if (employee.error) return <p className="danger">{employee.error.message}</p>;

  const { summary, ...detail } = employee.data;

  const historyColumns: Column<StatusHistory>[] = [
    {
      key: 'status',
      header: '상태',
      sticky: true,
      render: (row) => (
        <StatusText
          // 퇴사는 오류가 아니라 끝난 사실이다 (DESIGN_ADMIN.md 7장).
          label={row.statusLabel ?? STATUS_LABEL[row.status]}
        />
      ),
    },
    { key: 'start', header: '시작일', render: (row) => row.startDate },
    { key: 'end', header: '종료일', render: (row) => row.endDate ?? '진행 중' },
    { key: 'reason', header: '사유', render: (row) => row.reason ?? '—' },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <Link to="/employees" className="back-link">
            직원 목록으로
          </Link>
          <h1 className="page-title">{summary.name}</h1>
          <p className="page-lead">
            계좌는 서버가 마스킹한 값을 그대로 보여줘요. 여기서 가리거나 풀지 않아요.
          </p>
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
                  <StatusText label="등록되지 않았어요" />
                ),
              },
              { label: '연락처', value: detail.phone ?? '아직이에요' },
              { label: '이메일', value: detail.email ?? '아직이에요' },
              {
                label: '계좌',
                value: detail.bankAccount?.bankAccount
                  ? `${detail.bankAccount.bankName ?? ''} ${detail.bankAccount.bankAccount}`.trim()
                  : '아직이에요',
              },
            ]}
          />
        </div>

        <div className="panel-actions">
          <p className="panel-note">
            인적사항 수정은 아직 못 만들어요. 서버가 부분 수정을 지원해야 주민등록번호가
            지워지지 않아요.
          </p>
          <div className="panel-buttons">
            <Button label="재직상태 바꾸기" onClick={() => setStatusDialog(true)} />
            <Button
              label={summary.employeeNo ? '사번 다시 부여하기' : '사번 부여하기'}
              onClick={() => setNoDialog(true)}
            />
          </div>
        </div>
      </div>

      <h2 className="section-title">재직상태 이력</h2>
      <Table
        columns={historyColumns}
        rows={history.data}
        keyOf={(row) => row.id}
        isPending={history.isPending}
        error={history.error}
        emptyText="이력이 없어요."
      />

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
    </section>
  );
}

/** 퇴사는 되돌리기 어렵다. 확인 대화상자를 거치고 danger 로 그린다 (DESIGN_ADMIN.md 5·6장). */
function StatusDialog({
  open,
  employeeId,
  current,
  onClose,
}: {
  open: boolean;
  employeeId: number;
  current: EmploymentStatus;
  onClose: () => void;
}) {
  const change = useChangeStatus(employeeId);
  const [status, setStatus] = useState<EmploymentStatus>(current);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');

  const resigning = status === 'RESIGNED';

  return (
    <Dialog
      open={open}
      title="재직상태 바꾸기"
      description={
        resigning
          ? '퇴사 처리하면 이 계정으로 로그인할 수 없어요. 기록은 지우지 않고 이력에 남아요.'
          : '바뀐 상태는 이력에 남아요. 기록을 지우지 않아요.'
      }
      confirmLabel={resigning ? '퇴사 처리하기' : '바꾸기'}
      danger={resigning}
      loading={change.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!effectiveDate) return;
        change.mutate(
          { status, effectiveDate, ...(reason.trim() ? { reason: reason.trim() } : {}) },
          {
            onSuccess: () => {
              setReason('');
              setEffectiveDate('');
              onClose();
            },
          },
        );
      }}
    >
      <Select
        label="바꿀 상태"
        value={status}
        onChange={(value) => setStatus(value as EmploymentStatus)}
        options={[
          { value: 'ACTIVE', label: '재직' },
          { value: 'ON_LEAVE', label: '휴직' },
          { value: 'RESIGNED', label: '퇴사' },
        ]}
      />
      <Field
        label="적용일"
        value={effectiveDate}
        onChange={setEffectiveDate}
        type="date"
        required
      />
      <Field label="사유" value={reason} onChange={setReason} maxLength={255} />
      {change.error && <p className="danger">{change.error.message}</p>}
    </Dialog>
  );
}

function EmployeeNoDialog({
  open,
  employeeId,
  current,
  onClose,
}: {
  open: boolean;
  employeeId: number;
  current: string | null;
  onClose: () => void;
}) {
  const assign = useAssignEmployeeNo(employeeId);
  const [employeeNo, setEmployeeNo] = useState(current ?? '');

  return (
    <Dialog
      open={open}
      title="사번 부여"
      description="사번은 중복될 수 없어요. 이미 쓰는 사번이면 서버가 알려줘요."
      confirmLabel="부여하기"
      loading={assign.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!employeeNo.trim()) return;
        assign.mutate(employeeNo.trim(), { onSuccess: onClose });
      }}
    >
      <Field label="사번" value={employeeNo} onChange={setEmployeeNo} required maxLength={20} />
      {assign.error && <p className="danger">{assign.error.message}</p>}
    </Dialog>
  );
}
