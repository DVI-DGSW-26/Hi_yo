import { useState } from 'react';
import { Button, Field, FieldGrid, Select, StatusText, Table, type Column } from '@/components';
import { orDash } from '@/lib/cell';
import { formatKstDateTime } from '@/lib/datetime';
import {
  DELIVERY_METHODS,
  useDeliveries,
  useDownloadPayslip,
  useRecordDelivery,
  type DeliveryMethod,
  type PayslipDelivery,
} from './payslip';
import type { Payroll } from './api';

/**
 * A-602 급여명세서.
 *
 * 이 자리가 전달할 단 하나의 메시지 — **이 사람에게 명세서를 줬는가.**
 *
 * **내려받기와 교부 기록은 다른 일이다.** PDF를 몇 번 받아도 교부는 한 번이고, 관리팀이
 * 실제로 준 뒤에 남겨야 기록이 사실과 맞는다. 그래서 내려받기 버튼이 기록을 만들지
 * 않는다 — 서버 설명에 그렇게 못 박혀 있다.
 *
 * **이메일·문자 자동 발송은 없다** (2026-09-02 회신, 범위 밖). 「이메일」을 골라도 앱이
 * 메일을 보내지 않는다. 관리팀이 보낸 뒤 그 사실을 남기는 칸이라 문구도 그렇게 적었다.
 *
 * **확정 전이라도 버튼을 막지 않는다.** 확정은 관리팀이 지금 할 수 있는 일이라 눌리게
 * 두고 서버가 준 문구를 그대로 보여준다 (`DESIGN_ADMIN.md` 1장).
 */
export function PayslipSection({ payroll }: { payroll: Payroll }) {
  const [method, setMethod] = useState<DeliveryMethod>('DOWNLOAD');
  const [email, setEmail] = useState('');

  const deliveries = useDeliveries(payroll.id);
  const download = useDownloadPayslip(payroll.id);
  const record = useRecordDelivery(payroll.id);

  const emailError =
    method === 'EMAIL' && email.trim() === '' ? '보낸 주소를 적어주세요.' : undefined;

  function save() {
    if (emailError) return;
    record.mutate(
      { method, email: method === 'EMAIL' ? email.trim() : undefined },
      { onSuccess: () => setEmail('') },
    );
  }

  const columns: Column<PayslipDelivery>[] = [
    {
      key: 'sentAt',
      header: '준 때',
      sticky: true,
      render: (row) => formatKstDateTime(row.sentAt),
    },
    // 방법의 한국어는 서버가 준다. 화면이 다시 만들지 않는다.
    { key: 'method', header: '방법', render: (row) => orDash(row.methodName) },
    { key: 'email', header: '보낸 곳', render: (row) => orDash(row.email) },
    { key: 'deliveredByName', header: '남긴 사람', render: (row) => orDash(row.deliveredByName) },
    {
      key: 'success',
      header: '결과',
      render: (row) =>
        row.success ? (
          <StatusText tone="done" label="줬어요" />
        ) : (
          <StatusText tone="error" label={row.failReason ?? '실패했어요'} />
        ),
    },
  ];

  return (
    <>
      <div className="panel is-form">
        <div className="panel-body">
          <p className="section-title">명세서</p>
          <p className="muted">
            내려받아도 교부 기록은 안 생겨요. 실제로 준 다음에 아래에 남겨주세요. 임금명세서를
            줬다는 것은 회사가 나중에 댈 수 있어야 하는 사실이에요.
          </p>
          <FieldGrid>
            <Select
              label="어떻게 줬나요"
              value={method}
              onChange={(value) => setMethod(value as DeliveryMethod)}
              options={DELIVERY_METHODS.map((each) => ({ value: each.value, label: each.label }))}
            />
            {method === 'EMAIL' && (
              <Field
                label="보낸 주소"
                required
                value={email}
                onChange={setEmail}
                error={record.error ? undefined : emailError}
                maxLength={255}
                placeholder="보낸 뒤에 적어주세요"
              />
            )}
          </FieldGrid>
        </div>

        <div className="panel-actions">
          {download.error ? (
            <p className="panel-note is-error">{download.error.message}</p>
          ) : record.error ? (
            <p className="panel-note is-error">{record.error.message}</p>
          ) : (
            <p className="panel-note">
              확정된 급여만 명세서를 낼 수 있어요. 이메일·문자 자동 발송은 아직 없어요.
            </p>
          )}
          <div className="panel-buttons">
            <Button
              label="PDF 내려받기"
              loading={download.isPending}
              onClick={() =>
                download.mutate({
                  targetYm: payroll.targetYm,
                  employeeName: payroll.employeeName,
                })
              }
            />
            <Button label="줬다고 남기기" loading={record.isPending} onClick={save} />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        rows={deliveries.data}
        keyOf={(row) => row.id}
        isPending={deliveries.isPending}
        error={deliveries.error}
        emptyText="아직 명세서를 준 기록이 없어요."
      />
    </>
  );
}
