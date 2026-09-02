import { useState } from 'react';
import { useNavigate } from 'react-router';
import { formatAmount } from '@hr/format';
import { Button, Field, FieldGrid, Select } from '@/components';
import { useCreateEmployee, useDepartments, useJobs } from '@/features/employees/api';

/**
 * A-102 직원 등록
 *
 * 필드와 검증 규칙은 명세서 A-102 표를 따른다.
 *
 * **주민등록번호는 이 폼에서 받지 않는다.** 명세서의 필드 목록에 없고, 등록하면 어떤 조회
 * 응답으로도 다시 읽을 수 없어 화면이 상태를 확인할 방법이 없다. 입력 경로가 정해지면 붙인다.
 *
 * 재직상태도 여기 없다. 등록은 재직으로 시작하고, 휴직·퇴사는 상세 화면에서 별도 API 로 바꾼다.
 */
export function EmployeeNew() {
  const navigate = useNavigate();
  const departments = useDepartments();
  const jobs = useJobs();
  const create = useCreateEmployee();

  const [name, setName] = useState('');
  const [corporation, setCorporation] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [originalHireDate, setOriginalHireDate] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [jobId, setJobId] = useState('');
  const [touched, setTouched] = useState(false);

  const job = jobs.data?.find((item) => String(item.id) === jobId);

  // 명세서 A-102: 실입사일은 입사일보다 늦을 수 없다.
  const orderError =
    originalHireDate && hireDate && originalHireDate > hireDate
      ? '실입사일은 입사일보다 늦을 수 없어요.'
      : undefined;

  const errors = {
    name: touched && !name.trim() ? '성명을 적어주세요.' : undefined,
    corporation: touched && !corporation.trim() ? '법인을 적어주세요.' : undefined,
    hireDate: touched && !hireDate ? '입사일을 골라주세요.' : undefined,
    originalHireDate: orderError,
  };

  function submit() {
    setTouched(true);
    if (!name.trim() || !corporation.trim() || !hireDate || orderError) return;

    create.mutate(
      {
        name: name.trim(),
        corporation: corporation.trim(),
        hireDate,
        ...(employeeNo.trim() ? { employeeNo: employeeNo.trim() } : {}),
        ...(departmentId ? { departmentId: Number(departmentId) } : {}),
        ...(jobId ? { jobId: Number(jobId) } : {}),
        ...(originalHireDate ? { originalHireDate } : {}),
      },
      { onSuccess: (employee) => navigate(`/employees/${employee.id}`) },
    );
  }

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">직원 등록</h1>
          <p className="page-lead">
            등록하면 재직 상태로 시작해요. 휴직·퇴사는 상세 화면에서 바꿔요.
          </p>
        </div>
      </div>

      <div className="panel is-form">
        <div className="panel-body">
          <FieldGrid>
            <Field label="성명" value={name} onChange={setName} required error={errors.name} maxLength={50} />
            <Field
              label="법인"
              value={corporation}
              onChange={setCorporation}
              required
              error={errors.corporation}
              maxLength={30}
            />
            <Field
              label="사번"
              value={employeeNo}
              onChange={setEmployeeNo}
              maxLength={20}
              placeholder="나중에 부여해도 돼요"
            />
            <Select
              label="부서"
              value={departmentId}
              onChange={setDepartmentId}
              placeholder="고르지 않음"
              options={(departments.data ?? []).map((department) => ({
                value: String(department.id),
                label: department.name,
              }))}
            />
            <Select
              label="직무"
              value={jobId}
              onChange={setJobId}
              placeholder="고르지 않음"
              options={(jobs.data ?? []).map((item) => ({
                value: String(item.id),
                label: item.name,
              }))}
            />
            <Field
              label="입사일"
              value={hireDate}
              onChange={setHireDate}
              type="date"
              required
              error={errors.hireDate}
            />
            <Field
              label="실입사일"
              value={originalHireDate}
              onChange={setOriginalHireDate}
              type="date"
              error={errors.originalHireDate}
            />
          </FieldGrid>
        </div>

        {/* 직무를 고르면 급여 기준값이 따라온다. 읽기전용이라 입력칸과 칸을 나눈다. */}
        {job && (
          <div className="panel-body">
            <p className="muted">직무를 고르면 따라오는 값이에요. 여기서 고칠 수 없어요.</p>
            <FieldGrid>
              <Field label="급여계산 대상" value={job.payrollTarget ? '대상' : '아님'} readOnly />
              <Field
                label="시급"
                value={job.hourlyWage == null ? '' : formatAmount(job.hourlyWage)}
                readOnly
              />
            </FieldGrid>
          </div>
        )}

        <div className="panel-actions">
          {create.error ? (
            <p className="panel-note is-error">{create.error.message}</p>
          ) : (
            <p className="panel-note">주민등록번호는 여기서 받지 않아요.</p>
          )}
          <div className="panel-buttons">
            <Button label="목록으로" onClick={() => navigate('/employees')} />
            <Button
              label="저장하기"
              variant="primary"
              loading={create.isPending}
              onClick={submit}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
