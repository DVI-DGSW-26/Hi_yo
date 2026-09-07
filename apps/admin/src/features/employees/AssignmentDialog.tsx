import { useState } from 'react';
import { Dialog, Select } from '@/components';
import { useChangeAssignment, useDepartments, useJobs, type Employee } from './api';

/**
 * A-102 — 부서와 직무를 바꾼다.
 *
 * **2026-09-02에 열린 `PATCH /employees/{id}/assignment` 를 쓴다.** 그전에는 조회가
 * 이름만 줘서 id 를 되돌려 보낼 수 없었고(이름이 겹치면 엉뚱한 부서로 옮겨진다),
 * 전체 교체 `PUT` 밖에 없어 고칠 때마다 주민번호가 지워졌다.
 *
 * **둘을 함께 보낸다.** 이 경로의 `null` 은 「비운다」이지 「그대로 둔다」가 아니라서,
 * 한쪽만 바꿔도 나머지는 지금 값을 실어야 한다. 그래서 폼이 둘 다 지금 값으로 시작한다.
 *
 * **비우는 것도 되는 동작이다.** 막지 않되, 직무를 비우면 근태가 판정되지 않는다는 것을
 * 적어 둔다 (`GET /jobs` 스펙 — "직원에게 직무가 없으면 근태가 판정되지 않는다").
 *
 * 목록이 아직 안 왔으면 고를 것이 없다. 그때는 서버 오류든 로딩이든 **바꾸지 못하게
 * 두는 편이 낫다** — 빈 선택지에서 고른 `null` 이 「비운다」로 나가면 안 된다.
 */
export function AssignmentDialog({
  open,
  employee,
  onClose,
}: {
  open: boolean;
  employee: Employee;
  onClose: () => void;
}) {
  const departments = useDepartments();
  const jobs = useJobs();
  const change = useChangeAssignment(employee.id);

  const [departmentId, setDepartmentId] = useState(idText(employee.departmentId));
  const [jobId, setJobId] = useState(idText(employee.jobId));

  const loaded = departments.data !== undefined && jobs.data !== undefined;
  const masterError = departments.error ?? jobs.error;

  return (
    <Dialog
      open={open}
      title="부서 · 직무 바꾸기"
      description="둘 다 함께 저장돼요. 비워 두면 소속이 없는 상태가 돼요."
      confirmLabel="바꾸기"
      loading={change.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!loaded) return;
        change.mutate(
          { departmentId: idValue(departmentId), jobId: idValue(jobId) },
          { onSuccess: onClose },
        );
      }}
    >
      <Select
        label="부서"
        value={departmentId}
        onChange={setDepartmentId}
        placeholder="소속 없음"
        options={(departments.data ?? []).map((each) => ({
          value: String(each.id),
          label: each.name,
        }))}
      />
      <Select
        label="직무"
        value={jobId}
        onChange={setJobId}
        placeholder="직무 없음"
        options={(jobs.data ?? []).map((each) => ({
          value: String(each.id),
          label: each.name,
        }))}
      />

      {jobId === '' && (
        <p className="muted">직무를 비우면 이 사람의 근태가 판정되지 않아요.</p>
      )}

      {!loaded && !masterError && <p className="muted">부서·직무 목록을 불러오는 중이에요.</p>}
      {masterError && <p className="danger">{masterError.message}</p>}
      {change.error && <p className="danger">{change.error.message}</p>}
    </Dialog>
  );
}

/** `Select` 는 문자열만 다룬다. 없는 값은 빈 문자열이고 그것이 「비움」이다 */
function idText(id: number | null): string {
  return id === null ? '' : String(id);
}

function idValue(text: string): number | null {
  return text === '' ? null : Number(text);
}
