import { useState } from 'react';
import { Dialog, Field, Select } from '@/components';
import { useEmployees } from '@/features/employees/api';
import { MAX_PAGE_SIZE } from '@/lib/api';
import { useAddMember, type DutyMember } from './api';

interface Props {
  open: boolean;
  rosterId: number;
  /**
   * 이미 명단에 있는 사람. 고를 목록에서 빼고, 순번 기본값을 여기서 뽑는다.
   *
   * 호출하는 쪽이 `key`에 열림 여부를 넣는다. 열 때마다 다시 만들어져야 순번 기본값이
   * **그때의 명단**을 보고 정해진다 — 부모가 마운트될 때는 아직 목록이 오지 않아
   * 언제나 1이 된다.
   */
  members: DutyMember[];
  onClose: () => void;
}

/**
 * 고를 목록은 한 번에 받는다. 대상자를 고르는 자리라 쪽을 넘기게 하지 않는다.
 *
 * **서버가 100에서 자른다.** 더 큰 값을 보내도 오류 없이 조용히 깎여서 온다
 * (`MAX_PAGE_SIZE` 주석). 그래서 재직 직원이 100명을 넘으면 뒤가 안 보인다 —
 * 그 경우를 아래에서 문구로 알린다. 지금은 재직 직원이 100명 아래다 (2026-08-28 기준 47명).
 */
const PAGE_SIZE = MAX_PAGE_SIZE;

/**
 * 명단에 대상자를 넣는다.
 *
 * **순번은 관리팀이 정한다.** 가나다순 자동 정렬이 아니고 자동 편성이 이 순서대로 돈다.
 * 그래서 비워둘 수 없는 값이고, 화면이 다음 번호를 지어내지도 않는다 —
 * 마지막 순번 다음을 기본값으로 채워주되 고칠 수 있게 둔다.
 *
 * 재직 중인 직원만 고른다. 퇴사자를 당직에 넣을 일이 없다.
 * 이미 명단에 있는 사람은 목록에서 뺀다 — 서버가 막지만 고를 수 있게 두면 헷갈린다.
 */
export function AddMemberDialog({ open, rosterId, members, onClose }: Props) {
  const employees = useEmployees({ page: 0, size: PAGE_SIZE, status: 'ACTIVE' });
  const add = useAddMember(rosterId);

  const [employeeId, setEmployeeId] = useState('');
  const [rotationSeq, setRotationSeq] = useState(String(nextSeq(members)));

  const alreadyIn = new Set(members.map((member) => member.employeeId));
  const options = (employees.data?.content ?? [])
    .filter((employee) => !alreadyIn.has(employee.id))
    .map((employee) => ({
      value: String(employee.id),
      label: employee.departmentName
        ? `${employee.name} · ${employee.departmentName}`
        : employee.name,
    }));

  return (
    <Dialog
      open={open}
      title="대상자 추가"
      description="넣은 순번대로 자동 편성이 돌아요. 한 사람이 여러 명단에 같이 속할 수 있어요."
      confirmLabel="추가하기"
      loading={add.isPending}
      onClose={onClose}
      onConfirm={() => {
        if (!employeeId || !rotationSeq) return;
        add.mutate(
          { employeeId: Number(employeeId), rotationSeq: Number(rotationSeq) },
          {
            onSuccess: () => {
              setEmployeeId('');
              onClose();
            },
          },
        );
      }}
    >
      <Select
        label="직원"
        value={employeeId}
        onChange={setEmployeeId}
        options={options}
        placeholder={placeholder(employees.isPending, employees.error, options.length)}
      />
      <Field label="순번" value={rotationSeq} onChange={setRotationSeq} type="number" required />
      {/* 서버가 100에서 자른다. 잘렸으면 조용히 넘어가지 않고 알린다 —
          목록에 없는 사람을 "명단에 못 넣는다" 고 오해하게 두면 안 된다. */}
      {employees.data && employees.data.totalElements > PAGE_SIZE && (
        <p className="danger">
          재직 직원이 {employees.data.totalElements}명이라 {PAGE_SIZE}명까지만 보여요. 찾는
          사람이 없으면 알려주세요 — 목록을 나눠 받도록 고쳐야 해요.
        </p>
      )}
      {employees.error && <p className="danger">{employees.error.message}</p>}
      {add.error && <p className="danger">{add.error.message}</p>}
    </Dialog>
  );
}

/** 마지막 순번 다음. 명단이 비어 있으면 1부터 */
function nextSeq(members: DutyMember[]): number {
  return members.reduce((max, member) => Math.max(max, member.rotationSeq), 0) + 1;
}

function placeholder(
  isPending: boolean,
  error: Error | null,
  count: number,
): string | undefined {
  if (isPending) return '불러오는 중이에요';
  if (error) return '직원을 불러오지 못했어요';
  if (count === 0) return '넣을 수 있는 직원이 없어요';
  return '고르지 않았어요';
}
