import { formatAmount, formatMinutes } from '@hr/format';
import { StatusText, Table, type Column } from '@/components';
import { useDepartments, useJobs, type Department, type Job } from '@/features/employees/api';

/**
 * A-103 직무·부서 마스터
 *
 * 이 화면이 전달할 단 하나의 메시지 — **근태 판정과 급여가 어떤 기준으로 도는가.**
 *
 * 직무에 붙은 기준시간·시급이 근태 판정과 급여 계산의 근거다. 서버 스펙이 그렇게 적고
 * 있다 — "기준시간·휴게 규칙이 직무에 붙어 있어, **직원에게 직무가 없으면 근태가 판정되지
 * 않는다.**" 근태 현황(A-501)에서 누가 `판정 전`으로 남아 있을 때 여기를 보게 된다.
 *
 * **조회만 만들었다** (2026-09-01 기획 확정). 화면 이름은 "마스터 관리"지만 등록·수정 API가
 * 없다 — `GET /departments`·`GET /jobs` 둘뿐이다. 값을 고치려면 서버 시드를 고쳐야 한다.
 * 그래서 primary 버튼도 그린도 없다.
 *
 * 두 표를 한 화면에 둔다. 둘 다 짧고(부서 몇 개, 직무 몇 개) 같이 봐야 하는 값이라
 * 화면을 나누면 오가는 품만 는다.
 */
export function MastersPage() {
  const jobs = useJobs();
  const departments = useDepartments();

  const jobColumns: Column<Job>[] = [
    { key: 'name', header: '직무', sticky: true, render: (row) => row.name },
    {
      key: 'payrollTarget',
      header: '급여계산 대상',
      // 직원 목록·등록 화면이 쓰는 문구와 같게 둔다. 같은 값이 화면마다 다르게 읽히면 안 된다.
      render: (row) => (row.payrollTarget ? '대상' : '아님'),
    },
    {
      key: 'work',
      header: '근무',
      // 서버가 `09:00:00` 으로 준다. 초는 화면에 쓰지 않는다.
      render: (row) => workText(row),
    },
    {
      key: 'standard',
      header: '기준시간',
      align: 'right',
      render: (row) =>
        row.standardMinutes === null ? '—' : formatMinutes(row.standardMinutes),
    },
    {
      key: 'hourlyWage',
      header: '시급',
      align: 'right',
      render: (row) => (row.hourlyWage === null ? '—' : formatAmount(row.hourlyWage)),
    },
    { key: 'active', header: '상태', render: (row) => activeText(row.active) },
  ];

  const departmentColumns: Column<Department>[] = [
    { key: 'name', header: '부서', sticky: true, render: (row) => row.name },
    { key: 'sortOrder', header: '순서', align: 'right', render: (row) => String(row.sortOrder) },
    { key: 'active', header: '상태', render: (row) => activeText(row.active) },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">직무·부서</h1>
          <p className="page-lead">
            직무에 붙은 기준시간이 근태 판정과 급여 계산의 근거예요. 직무가 없는 직원은 근태가
            판정되지 않아요.
          </p>
        </div>
      </div>

      <h2 className="section-title">직무</h2>
      <Table
        columns={jobColumns}
        rows={jobs.data}
        keyOf={(row) => row.id}
        isPending={jobs.isPending}
        error={jobs.error}
        emptyText="등록된 직무가 없어요. 직무가 없으면 직원을 등록할 수 없어요."
      />

      <h2 className="section-title">부서</h2>
      <Table
        columns={departmentColumns}
        rows={departments.data}
        keyOf={(row) => row.id}
        isPending={departments.isPending}
        error={departments.error}
        emptyText="등록된 부서가 없어요."
      />
    </section>
  );
}

/** `09:00 ~ 18:00`. 한쪽이라도 없으면 시간을 지어내지 않는다 */
function workText(job: Job): string {
  if (job.workStart === null || job.workEnd === null) return '—';
  return `${job.workStart.slice(0, 5)} ~ ${job.workEnd.slice(0, 5)}`;
}

/**
 * 쓰이는 것과 내린 것. **색으로 가르지 않는다.**
 *
 * 그린을 안 쓰는 이유는 대부분이 `active`라 초록이 깔리면 내려둔 줄이 묻히기 때문이고,
 * 빨강을 안 쓰는 이유는 **내려둔 직무가 오류가 아니기 때문**이다. 이 화면은 조회만 하는
 * 자리라 여기서 손댈 것도 없다 (`DESIGN_ADMIN.md` 7장).
 */
function activeText(active: boolean) {
  return <StatusText label={active ? '쓰는 중' : '내려둠'} />;
}
