import { useState } from 'react';
import { Button, Dialog, Field, SignaturePad } from '@/components';
import { useAuthMe } from '@/features/auth/api';
import { useDecideRequest, useReviewRequest, type LeaveRequest } from './api';

/**
 * 결재 동작 — **검토와 승인 두 단계** (2026-09-02 서버 변경).
 *
 * 회사 「휴가(근태)신청서」 결재란이 「작성 · 검토 · 승인」 세 칸이라 결재가 둘로 나뉘었다.
 * 신청서 화면에서 이 부분만 떼어냈다 — 단계마다 버튼도 문구도 갈려서 상세 화면 안에 두면
 * 무엇을 보여주는 화면인지가 흐려진다.
 *
 * **한 단계에 보이는 버튼은 둘이고 primary는 하나다** (`DESIGN_ADMIN.md` 5장).
 */

/** 통과시키느냐 반려하느냐. 두 단계가 같은 몸통을 쓰므로 `approved` 하나로 갈린다 */
type Action = 'pass' | 'reject';

/** 지금 이 신청서에 할 수 있는 것. 끝난 건에는 버튼을 두지 않는다 */
function stageOf(status: LeaveRequest['status']): 'review' | 'decide' | null {
  if (status === 'PENDING') return 'review';
  if (status === 'REVIEWED') return 'decide';
  return null;
}

export function ApprovalActions({ request }: { request: LeaveRequest }) {
  const me = useAuthMe();
  const review = useReviewRequest(request.id);
  const decide = useDecideRequest(request.id);

  const [acting, setActing] = useState<Action>();
  const [comment, setComment] = useState('');
  const [signature, setSignature] = useState('');

  const stage = stageOf(request.status);
  if (stage === null) return null;

  const mutation = stage === 'review' ? review : decide;

  /**
   * **검토한 사람은 승인할 수 없다.** 서버가 422로 막지만 화면에서 미리 막는다 —
   * 누르고 나서 거부당하게 두는 것은 화면의 잘못이다. 사용자가 고칠 수 없는 이유라
   * 비활성이 맞다 (`DESIGN_ADMIN.md` 1장의 예외).
   */
  const isReviewer =
    stage === 'decide' && me.data !== undefined && me.data.employeeId === request.reviewerId;

  const passLabel = stage === 'review' ? '검토하기' : '승인하기';
  const passDescription =
    stage === 'review'
      ? '검토를 마치면 승인 단계로 넘어가요. 승인은 검토한 사람이 아닌 다른 사람이 해요.'
      : '승인하면 신청자에게 바로 알려지고 연차에서 차감돼요. 시작일이 지나면 취소할 수 없어요.';

  const isReject = acting === 'reject';

  return (
    <>
      <div className="panel-actions">
        {mutation.error && <p className="panel-note is-error">{mutation.error.message}</p>}
        <div className="panel-buttons">
          <Button label="반려하기" variant="danger" onClick={() => setActing('reject')} />
          <Button
            label={passLabel}
            variant="primary"
            onClick={() => setActing('pass')}
            disabledReason={isReviewer ? '검토한 사람은 승인할 수 없어요' : undefined}
          />
        </div>
      </div>

      <Dialog
        open={acting !== undefined}
        title={isReject ? '반려하기' : passLabel}
        description={
          isReject
            ? '반려하면 신청자에게 바로 알려지고 되돌릴 수 없어요. 다시 내려면 신청자가 새로 신청해야 해요.'
            : passDescription
        }
        confirmLabel={isReject ? '반려하기' : passLabel}
        danger={isReject}
        loading={mutation.isPending}
        onClose={() => setActing(undefined)}
        onConfirm={() => {
          if (acting === undefined) return;
          mutation.mutate(
            {
              approved: acting === 'pass',
              ...(comment.trim() ? { comment: comment.trim() } : {}),
              ...(signature ? { signatureImage: signature } : {}),
            },
            {
              onSuccess: () => {
                setComment('');
                setSignature('');
                setActing(undefined);
              },
            },
          );
        }}
      >
        <Field label="의견" value={comment} onChange={setComment} maxLength={255} />
        {/*
          검토에도 승인에도 전자서명이 필수다 — 종이 서식의 두 칸이 그대로 옮겨온 것이다.
          손으로 그리면 그 서명으로, 비워두면 누른 것으로 서명한다. `CLICK` 일 때는
          이미지를 받지 않아도 된다는 답을 받았다 (2026-08-31).
        */}
        <SignaturePad label="서명" value={signature} onChange={setSignature} />
        {mutation.error && <p className="danger">{mutation.error.message}</p>}
      </Dialog>
    </>
  );
}
