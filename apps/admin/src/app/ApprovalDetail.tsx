import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatLeaveDays } from '@hr/format';
import {
  Button,
  DetailList,
  Dialog,
  Field,
  SignaturePad,
  StatusText,
  Table,
  type Column,
} from '@/components';
import { formatKstDateTime } from '@/lib/datetime';
import { periodText, statusText, statusTone, timeText } from '@/features/approvals/labels';
import {
  useDecideRequest,
  useLeaveRequest,
  type ExcludedDate,
  type LeaveRequest,
} from '@/features/approvals/api';

/**
 * A-302 연차 신청 검토 · 승인 — 신청서
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 신청을 승인해도 되는가.**
 *
 * **이 화면을 여는 것이 곧 검토다.** `GET /requests/{id}`에는 상태를 바꾸는 효과가 없고,
 * 요구사항의 "검토"에 해당하는 별도 API도 없다 (`docs/API_신청결재.md` 2장).
 *
 * **`excludedDates`를 반드시 보여준다.** "왜 3일 신청인데 2일만 깎였나"에 답하는 값이고,
 * 결재하는 사람이 그걸 모르면 차감 일수를 의심하게 된다. 주말·공휴일 판정을 앱에서 하지 않고
 * 서버가 준 사유를 그대로 쓴다.
 */
export function ApprovalDetail() {
  const { requestId: raw } = useParams<{ requestId: string }>();
  const requestId = raw ? Number(raw) : undefined;

  const request = useLeaveRequest(requestId);

  if (request.isPending) return <p className="muted">불러오는 중이에요.</p>;
  if (request.error) return <p className="danger">{request.error.message}</p>;

  return <Loaded request={request.data} />;
}

function Loaded({ request }: { request: LeaveRequest }) {
  const decide = useDecideRequest(request.id);
  const [deciding, setDeciding] = useState<'approve' | 'reject'>();
  const [comment, setComment] = useState('');
  const [signature, setSignature] = useState('');

  const decided = request.status !== 'PENDING';
  const time = timeText(request);
  const excluded = request.excludedDates ?? [];

  const excludedColumns: Column<ExcludedDate>[] = [
    { key: 'date', header: '날짜', sticky: true, render: (row) => row.date },
    // 사유는 서버가 준 문구 그대로다. 앱에서 만들지 않는다.
    { key: 'reason', header: '빠진 이유', render: (row) => row.reason ?? '사유를 받지 못했어요' },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <Link to="/approvals" className="back-link">
            결재 대기 목록으로
          </Link>
          <h1 className="page-title">
            {request.employeeName ?? `직원 ${request.employeeId}`} ·{' '}
            {request.typeName ?? request.typeCode}
          </h1>
          <p className="page-lead">
            {decided
              ? '이미 결재가 끝난 신청이에요.'
              : '내용을 확인하고 승인하거나 반려해주세요. 결재하면 신청자에게 바로 알려져요.'}
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <DetailList
            items={[
              { label: '부서', value: request.departmentName ?? '아직이에요' },
              { label: '기간', value: periodText(request) },
              ...(time ? [{ label: '시각', value: time }] : []),
              // 서버가 계산한 값이다. 여기서 다시 세지 않는다.
              { label: '차감 일수', value: formatLeaveDays(request.leaveDays) },
              {
                label: '상태',
                value: (
                  <StatusText label={statusText(request.status)} tone={statusTone(request.status)} />
                ),
              },
              { label: '비상연락처', value: request.emergencyContact ?? '안 적었어요' },
              { label: '사유', value: request.reason ?? '안 적었어요', wide: true },
              ...(decided
                ? [
                    {
                      label: '결재',
                      wide: true,
                      value: `${request.approverName ?? '누구인지 안 왔어요'}${
                        request.decidedAt ? ` · ${formatKstDateTime(request.decidedAt)}` : ''
                      }${request.decisionComment ? ` · ${request.decisionComment}` : ''}`,
                    },
                  ]
                : []),
            ]}
          />
        </div>

        {/* 이미 결재된 건에는 버튼을 두지 않는다. 서버도 두 번은 받지 않는다 */}
        {!decided && (
          <div className="panel-actions">
            {decide.error && <p className="panel-note is-error">{decide.error.message}</p>}
            <div className="panel-buttons">
              <Button label="반려하기" variant="danger" onClick={() => setDeciding('reject')} />
              <Button label="승인하기" variant="primary" onClick={() => setDeciding('approve')} />
            </div>
          </div>
        )}
      </div>

      {/*
        차감에서 빠진 날. 신청 기간과 차감 일수가 다른 이유가 여기 있다.
        빠진 날이 없으면 표를 만들지 않는다 — 볼 것이 없는 표가 화면에 남지 않는다.
      */}
      {excluded.length > 0 && (
        <>
          <h2 className="section-title">차감에서 빠진 날</h2>
          <Table
            columns={excludedColumns}
            rows={excluded}
            keyOf={(row) => row.date}
            emptyText="빠진 날이 없어요."
          />
        </>
      )}

      <Dialog
        open={deciding !== undefined}
        title={deciding === 'reject' ? '반려하기' : '승인하기'}
        description={
          deciding === 'reject'
            ? '반려하면 신청자에게 바로 알려지고 되돌릴 수 없어요. 다시 내려면 신청자가 새로 신청해야 해요.'
            : '승인하면 신청자에게 바로 알려지고 연차에서 차감돼요. 시작일이 지나면 취소할 수 없어요.'
        }
        confirmLabel={deciding === 'reject' ? '반려하기' : '승인하기'}
        danger={deciding === 'reject'}
        loading={decide.isPending}
        onClose={() => setDeciding(undefined)}
        onConfirm={() => {
          if (deciding === undefined) return;
          decide.mutate(
            {
              approved: deciding === 'approve',
              ...(comment.trim() ? { comment: comment.trim() } : {}),
              ...(signature ? { signatureImage: signature } : {}),
            },
            {
              onSuccess: () => {
                setComment('');
                setSignature('');
                setDeciding(undefined);
              },
            },
          );
        }}
      >
        <Field label="의견" value={comment} onChange={setComment} maxLength={255} />
        {/*
          결재에는 전자서명이 필수다 (`docs/API_신청결재.md` 8장). 손으로 그리면 그
          서명으로, 비워두면 누른 것으로 서명한다 — 서버가 `CLICK` 일 때는 이미지를
          받지 않아도 된다고 답했다 (2026-08-31).
        */}
        <SignaturePad label="서명" value={signature} onChange={setSignature} />
        {decide.error && <p className="danger">{decide.error.message}</p>}
      </Dialog>
    </section>
  );
}
