import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Dialog, Field, Pager, Select, StatusText, Table, type Column } from '@/components';
import { orDash } from '@/lib/cell';
import { SyncSecomNotice } from '@/features/employees/SyncSecomNotice';
import {
  useDepartments,
  useEmployees,
  useSyncSecom,
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
  const [syncing, setSyncing] = useState(false);
  const sync = useSyncSecom();

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
    { key: 'employeeNo', header: '사번', render: (row) => orDash(row.employeeNo) },
    { key: 'corporation', header: '법인', render: (row) => orDash(row.corporation) },
    { key: 'department', header: '부서', render: (row) => orDash(row.departmentName) },
    { key: 'job', header: '직무', render: (row) => orDash(row.jobName) },
    { key: 'hireDate', header: '입사일', render: (row) => orDash(row.hireDate) },
    {
      key: 'payrollTarget',
      header: '급여대상',
      render: (row) => (row.payrollTarget ? '대상' : '아님'),
    },
    {
      key: 'residentNo',
      header: '주민번호',
      /*
       * **빨갛게 두지 않는다** (`DESIGN_RULES.md` 2장). 빨강의 기준은 「여기서 고칠 수
       * 있는가」인데 **이 화면에 주민번호를 등록할 경로가 없다.** 46명이 통째로 빨개지면
       * 그 색을 무시하는 법만 배운다 — 그 규칙이 바로 이 화면을 보고 만들어졌다 (2026-09-01).
       */
      render: (row) => (row.residentNoRegistered ? '등록됨' : <StatusText label="없음" />),
    },
    {
      key: 'status',
      header: '재직상태',
      render: (row) => (
        // 퇴사는 **오류가 아니라 끝난 사실이다.** 빨갛게 두지 않는다 (2장).
        <StatusText label={row.employmentStatusLabel ?? row.employmentStatus} />
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
          {/*
            **여기 primary 는 하나뿐이다** (`DESIGN_RULES.md` 1장 6번). 세콤에서 가져오기는
            가끔 쓰는 동작이라 secondary 다 — 이 화면의 주 동작은 직원을 등록하는 것이다.
          */}
          <Button label="세콤에서 가져오기" onClick={() => setSyncing(true)} />
          <Button
            label="직원 등록하기"
            variant="primary"
            onClick={() => navigate('/employees/new')}
          />
        </div>
      </div>

      {sync.data && <SyncSecomNotice result={sync.data} />}

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

      {/*
        직원을 만드는 동작이라 한 번 더 묻는다. **지우는 경로가 없다** —
        스펙에 `DELETE /employees` 가 없어서 잘못 들어온 사람을 되돌릴 수 없다.
      */}
      <Dialog
        open={syncing}
        title="세콤에서 직원 가져오기"
        description="세콤 인사정보에 있는 사람을 직원으로 만들어요. 이미 있는 값은 덮어쓰지 않고, 세콤에서 빠진 사람도 지우지 않아요. 다만 잘못 들어온 직원을 지우는 경로가 없어요."
        confirmLabel="가져오기"
        loading={sync.isPending}
        onClose={() => setSyncing(false)}
        onConfirm={() => sync.mutate(undefined, { onSuccess: () => setSyncing(false) })}
      >
        <p className="muted">
          세콤이 아는 것은 이름·카드번호·입사일뿐이에요. 사번과 부서는 비어 있어요.
        </p>
        {sync.error && <p className="danger">{sync.error.message}</p>}
      </Dialog>
    </section>
  );
}
