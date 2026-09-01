import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Field, Pager, Select, StatusText, Table, type Column } from '@/components';
import {
  useDepartments,
  useEmployees,
  type Employee,
  type EmployeeListFilter,
  type EmploymentStatus,
} from '@/features/employees/api';

/**
 * A-102 직원 등록·수정 — 목록
 *
 * 이 화면이 전달할 단 하나의 메시지 — **찾는 직원이 어디 있는가.**
 *
 * 퇴사자도 지우지 않고 상태로만 관리한다. 목록에서 사라지지 않는다.
 */
const STATUS_OPTIONS: { value: EmploymentStatus | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'ACTIVE', label: '재직' },
  { value: 'ON_LEAVE', label: '휴직' },
  { value: 'RESIGNED', label: '퇴사' },
];

const PAGE_SIZE = 20;

export function EmployeesPage() {
  const navigate = useNavigate();
  const departments = useDepartments();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<EmploymentStatus | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(0);

  const filter: EmployeeListFilter = {
    page,
    size: PAGE_SIZE,
    ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
    ...(status ? { status } : {}),
    ...(departmentId ? { departmentId: Number(departmentId) } : {}),
  };
  const employees = useEmployees(filter);

  const columns: Column<Employee>[] = [
    { key: 'name', header: '성명', sticky: true, render: (row) => row.name },
    { key: 'employeeNo', header: '사번', render: (row) => row.employeeNo ?? '—' },
    { key: 'corporation', header: '법인', render: (row) => row.corporation ?? '—' },
    { key: 'department', header: '부서', render: (row) => row.departmentName ?? '—' },
    { key: 'job', header: '직무', render: (row) => row.jobName ?? '—' },
    { key: 'hireDate', header: '입사일', render: (row) => row.hireDate ?? '—' },
    {
      key: 'payrollTarget',
      header: '급여대상',
      render: (row) => (row.payrollTarget ? '대상' : '아님'),
    },
    {
      key: 'residentNo',
      header: '주민번호',
      // 빨강을 쓰지 않는다. 이 화면에서 등록할 방법이 없고(서버가 전용 경로를 아직
      // 열지 않았다) 지금은 전원이 미등록이라, 열 전체가 빨개져서 아무도 안 읽는다.
      render: (row) => (row.residentNoRegistered ? '등록됨' : <StatusText label="없음" />),
    },
    {
      key: 'status',
      header: '재직상태',
      render: (row) => (
        <StatusText
          // 퇴사는 오류가 아니라 끝난 사실이다. 개발 서버는 절반이 퇴사라 빨강으로
          // 두면 화면이 경고로 뒤덮인다 (DESIGN_ADMIN.md 7장).
          label={row.employmentStatusLabel ?? row.employmentStatus}
        />
      ),
    },
  ];

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">직원</h1>
          <p className="page-lead">
            퇴사자도 지우지 않고 재직 상태로만 관리해요. 목록에서 사라지지 않아요.
          </p>
        </div>
        <div className="page-head-action">
          <Button
            label="직원 등록하기"
            variant="primary"
            onClick={() => navigate('/employees/new')}
          />
        </div>
      </div>

      <Table
        columns={columns}
        rows={employees.data?.content}
        keyOf={(row) => row.id}
        isPending={employees.isPending}
        error={employees.error}
        emptyText="조건에 맞는 직원이 없어요."
        onRowClick={(row) => navigate(`/employees/${row.id}`)}
        toolbar={
          <>
            <Field
              label="검색"
              value={keyword}
              onChange={resetPage(setKeyword)}
              placeholder="성명·사번"
            />
            <Select
              label="재직상태"
              value={status}
              onChange={resetPage((value: string) => setStatus(value as EmploymentStatus | ''))}
              options={STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
            <Select
              label="부서"
              value={departmentId}
              onChange={resetPage(setDepartmentId)}
              placeholder="전체"
              options={(departments.data ?? []).map((department) => ({
                value: String(department.id),
                label: department.name,
              }))}
            />
          </>
        }
      />

      <Pager page={employees.data} onChange={setPage} unit="명" />
    </section>
  );
}
