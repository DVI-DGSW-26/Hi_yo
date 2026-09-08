import { useState } from 'react';
import { Button, Field, FieldGrid, Select } from '@/components';
import { GRANT_TYPES, useCreateLeaveGrant, type GrantType } from './api';

/**
 * A-306 발생 등록 폼.
 *
 * **화면이 일수를 계산하지 않는다.** 종류를 고를 때 나오는 「1년차부터 15일」 같은 문구는
 * 관리팀이 무엇을 넣는 자리인지 알아보라고 적은 것이지, 앱이 그 값을 채우지 않는다
 * (`CLAUDE.md` 3장). 발생 규칙은 인사팀이 정하고 계산은 서버 몫이다.
 *
 * **`사라지는 날`을 비우면 서버가 그해 12월 31일로 잡는다.** 이월이 없어서다 —
 * 화면에서 날짜를 만들어 채우지 않는다.
 */
export function LeaveGrantForm({
  employeeId,
  year,
  yearOptions,
}: {
  employeeId: number;
  year: number;
  yearOptions: number[];
}) {
  const [form, setForm] = useState<GrantForm>(() => emptyForm(year));
  const create = useCreateLeaveGrant();

  const daysError = daysProblem(form);

  function submit() {
    if (form.grantType === '' || form.grantedDays.trim() === '' || daysError) return;

    create.mutate(
      {
        employeeId,
        fiscalYear: Number(form.fiscalYear),
        grantType: form.grantType,
        grantedDays: Number(form.grantedDays),
        grantedOn: form.grantedOn || undefined,
        expiresOn: form.expiresOn || undefined,
        note: form.note.trim() || undefined,
      },
      { onSuccess: () => setForm(emptyForm(Number(form.fiscalYear))) },
    );
  }

  return (
    <div className="panel is-form">
      <div className="panel-body">
        <p className="section-title">연차 넣기</p>
        <FieldGrid>
          <Select
            label="연도"
            value={form.fiscalYear}
            onChange={(value) => setForm({ ...form, fiscalYear: value })}
            options={yearOptions.map((value) => ({ value: String(value), label: `${value}년` }))}
          />
          <Select
            label="종류"
            value={form.grantType}
            onChange={(value) => setForm({ ...form, grantType: value as GrantType })}
            placeholder="고르세요"
            options={GRANT_TYPES.map((each) => ({
              value: each.value,
              label: `${each.label} — ${each.hint}`,
            }))}
          />
          <Field
            label="일수"
            required
            type="number"
            value={form.grantedDays}
            onChange={(value) => setForm({ ...form, grantedDays: value })}
            error={daysError}
            placeholder="15"
          />
          <Field
            label="생긴 날"
            type="date"
            value={form.grantedOn}
            onChange={(value) => setForm({ ...form, grantedOn: value })}
          />
          <Field
            label="사라지는 날"
            type="date"
            value={form.expiresOn}
            onChange={(value) => setForm({ ...form, expiresOn: value })}
          />
          {/* 255는 서버가 받는 한계다 (`LeaveGrantCreateRequest`) */}
          <Field
            label="메모"
            value={form.note}
            onChange={(value) => setForm({ ...form, note: value })}
            maxLength={255}
          />
        </FieldGrid>
      </div>

      <div className="panel-actions">
        {create.error ? (
          <p className="panel-note is-error">{create.error.message}</p>
        ) : (
          <p className="panel-note">
            「사라지는 날」을 비우면 그해 12월 31일이 돼요. 연차는 다음 해로 넘어가지 않아요.
          </p>
        )}
        <div className="panel-buttons">
          <Button label="연차 넣기" variant="primary" loading={create.isPending} onClick={submit} />
        </div>
      </div>
    </div>
  );
}

interface GrantForm {
  fiscalYear: string;
  grantType: GrantType | '';
  grantedDays: string;
  grantedOn: string;
  expiresOn: string;
  note: string;
}

function emptyForm(year: number): GrantForm {
  return {
    fiscalYear: String(year),
    grantType: '',
    grantedDays: '',
    grantedOn: '',
    expiresOn: '',
    note: '',
  };
}

/**
 * 일수 칸에 적을 오류. **음수는 `CARRY_DEDUCT`에만 열어 둔다** (2026-09-02 서버 회신) —
 * 엑셀에서 넘어온 과거 초과사용분 전용이고, 다른 종류에 음수가 들어가면 그 사람 연차가
 * 조용히 깎인다.
 *
 * 이것 말고는 화면이 판정하지 않는다. 상한도, 그 사람이 그 종류를 받을 자격이 있는지도
 * 서버와 인사팀 몫이다.
 */
function daysProblem(form: GrantForm): string | undefined {
  if (form.grantedDays.trim() === '') return undefined;

  const days = Number(form.grantedDays);
  if (Number.isNaN(days)) return '숫자로 적어주세요.';
  if (days === 0) return '0일은 넣을 수 없어요.';
  if (days < 0 && form.grantType !== 'CARRY_DEDUCT') {
    return '음수는 「과거 초과사용분」에만 넣을 수 있어요.';
  }
  return undefined;
}
