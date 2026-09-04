import { Link, useParams } from 'react-router';
import { formatLeaveDays } from '@hr/format';
import { DetailList, StatusText, Table, type Column } from '@/components';
import { formatKstDateTime } from '@/lib/datetime';
import { periodText, statusText, statusTone, timeText } from '@/features/approvals/labels';
import { ApprovalActions } from '@/features/approvals/ApprovalActions';
import { useLeaveRequest, type ExcludedDate, type LeaveRequest } from '@/features/approvals/api';

/**
 * A-302 연차 신청 검토 · 승인 — 신청서
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 신청을 통과시켜도 되는가.**
 *
 * **결재는 2단계다** (2026-09-02 서버 변경). 회사 「휴가(근태)신청서」 결재란이
 * 「작성 · 검토 · 승인」 세 칸이라 검토와 승인이 갈렸다. 지금 단계에 따라 버튼이 바뀌므로
 * 동작은 `ApprovalActions`가 맡는다.
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

/** 지금 무엇을 해야 하는지 한 줄로 알려준다. 단계마다 할 일이 다르다 */
function leadText(status: LeaveRequest['status']): string {
  if (status === 'PENDING') return '내용을 확인하고 검토해주세요. 검토를 마치면 승인 단계로 넘어가요.';
  if (status === 'REVIEWED') return '검토가 끝났어요. 내용을 확인하고 승인하거나 반려해주세요.';
  return '이미 결재가 끝난 신청이에요.';
}

/** 누가 · 언제 · 무슨 의견으로. 검토 칸과 승인 칸이 같은 모양이라 한 곳에서 만든다 */
function stampText(name: string | null, at: string | null, comment: string | null): string {
  const who = name ?? '누구인지 안 왔어요';
  return `${who}${at ? ` · ${formatKstDateTime(at)}` : ''}${comment ? ` · ${comment}` : ''}`;
}

function Loaded({ request }: { request: LeaveRequest }) {
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
          <p className="page-lead">{leadText(request.status)}</p>
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
              // 결재자 서명(`signed`)과 다른 값이다. 종이 서식의 「작성」 칸에 해당한다.
              { label: '신청인 서명', value: request.applicantSigned ? '받았어요' : '없어요' },
              { label: '비상연락처', value: request.emergencyContact ?? '안 적었어요' },
              { label: '사유', value: request.reason ?? '안 적었어요', wide: true },
              // 검토·승인 칸은 그 단계를 지난 뒤에만 나온다. 빈 칸을 미리 그리지 않는다.
              ...(request.reviewedAt !== null || request.reviewerId !== null
                ? [
                    {
                      label: '검토',
                      wide: true,
                      value: stampText(
                        request.reviewerName,
                        request.reviewedAt,
                        request.reviewComment,
                      ),
                    },
                  ]
                : []),
              ...(request.decidedAt !== null || request.approverId !== null
                ? [
                    {
                      label: '승인',
                      wide: true,
                      value: stampText(
                        request.approverName,
                        request.decidedAt,
                        request.decisionComment,
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        {/* 단계가 끝난 건에는 아무 버튼도 그리지 않는다. 서버도 두 번은 받지 않는다 */}
        <ApprovalActions request={request} />
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
    </section>
  );
}
