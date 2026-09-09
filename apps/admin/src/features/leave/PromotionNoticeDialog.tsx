import { useState } from 'react';
import { Dialog, Field, Select } from '@/components';
import { formatLeaveDays } from '@hr/format';
import { kstInputToIso, shortDate } from '@/lib/datetime';
import {
  PROMOTION_CHANNELS,
  SENT_TO_MAX,
  promotionRoundLabel,
  useRecordPromotionNotice,
  type PromotionChannel,
  type PromotionTarget,
} from './api';

interface Props {
  /** 없으면 닫힌 상태다. 사람이 바뀌면 화면이 `key` 로 이 대화상자를 새로 만든다 */
  target: PromotionTarget | undefined;
  /** 목록을 보고 있는 회계연도. 서버 기본값(올해)에 기대지 않고 명시해 보낸다 */
  year: number;
  onClose: () => void;
}

/**
 * 촉진 통보를 **보냈다는 기록**을 남긴다.
 *
 * **여기서 메일이 나가지 않는다.** 서버 스펙이 직접 그렇게 적고 있다 — 알림 발송 경로는
 * 아직 없다. 그래서 문구를 전부 「보낸 것을 기록한다」로 적는다. 「보내기」라고 적으면
 * 관리팀이 누르고 나서 보낸 줄 알고, 직원은 아무것도 못 받은 채 연차가 소멸한다.
 *
 * **본문 원문을 요약하지 않고 그대로 받는다.** 미사용 연차 소멸의 법적 근거라 이것이
 * 없으면 나중에 연차수당을 지급해야 할 수 있다(스펙 설명). 여러 줄 칸인 이유가 그것이다.
 *
 * **잔여 일수는 보내지 않는다.** 통보서에 찍히는 숫자는 서버가 발송 시점에 다시 계산해
 * 박는다 — 화면 값을 실어 보내면 증빙의 숫자를 클라이언트가 정하게 된다.
 */
export function PromotionNoticeDialog({ target, year, onClose }: Props) {
  const record = useRecordPromotionNotice();

  // 메일 주소가 있으면 이메일로, 없으면 서면이 기본이다. 없는 주소를 채워 넣지 않는다.
  const [channel, setChannel] = useState<PromotionChannel>(target?.email ? 'EMAIL' : 'WRITTEN');
  const [sentTo, setSentTo] = useState(target?.email ?? '');
  const [sentAt, setSentAt] = useState('');
  const [bodySnapshot, setBodySnapshot] = useState('');
  // 누르기 전에는 빈 칸을 오류로 칠하지 않는다. 열자마자 빨간 화면이 되면 읽지 않는다.
  const [tried, setTried] = useState(false);

  const needsSentTo = channel === 'EMAIL';
  const sentToError =
    tried && needsSentTo && !sentTo.trim() ? '보낸 메일 주소를 적어주세요.' : undefined;
  const bodyError = tried && !bodySnapshot.trim() ? '보낸 본문을 그대로 붙여넣어 주세요.' : undefined;

  function submit() {
    if (!target) return;
    setTried(true);
    if (!bodySnapshot.trim()) return;
    if (needsSentTo && !sentTo.trim()) return;

    record.mutate(
      {
        employeeId: target.employeeId,
        fiscalYear: year,
        round: target.round,
        channel,
        sentTo: sentTo.trim() || undefined,
        sentAt: sentAt ? kstInputToIso(sentAt) : undefined,
        bodySnapshot,
      },
      {
        // 기록하면 남긴 목록이 다시 그려진다 (`promotionKeys.all` 무효화).
        onSuccess: onClose,
      },
    );
  }

  return (
    <Dialog
      open={target !== undefined}
      title={target ? `${target.employeeName ?? '이 직원'} · 통보 기록` : '통보 기록'}
      description="여기서 메일이 나가지 않아요. 이미 보낸 것을 남기는 자리예요. 기록하면 이 사람은 대상 목록에서 사라지고, 지우는 경로가 없어요."
      confirmLabel="기록하기"
      loading={record.isPending}
      onClose={onClose}
      onConfirm={submit}
    >
      {target && (
        <p className="muted">
          {promotionRoundLabel(target.round)} · {target.departmentName ?? '부서 없어요'} · 잔여{' '}
          {formatLeaveDays(target.remainingDays)}
          {target.planDueOnIfSentToday
            ? ` · 오늘 보내면 계획서 마감은 ${shortDate(target.planDueOnIfSentToday)}`
            : ''}
        </p>
      )}

      <Select
        label="보낸 방법"
        value={channel}
        onChange={(value) => setChannel(value as PromotionChannel)}
        options={PROMOTION_CHANNELS.map((each) => ({ value: each.value, label: each.label }))}
      />

      {/*
        서면이면 어디로 보냈는지가 필수가 아니다 — 손으로 건넨 것에는 주소가 없다.
        메일인데 주소가 비어 있으면 서버가 막는다. 「고칠 수 있는 값」이라 버튼을 잠그지
        않고 눌렀을 때 인라인으로 알린다 (`DESIGN_ADMIN.md` 1장).
      */}
      <Field
        label={needsSentTo ? '보낸 곳' : '교부한 곳'}
        value={sentTo}
        onChange={setSentTo}
        required={needsSentTo}
        maxLength={SENT_TO_MAX}
        placeholder={needsSentTo ? 'name@company.com' : '본인에게 직접 교부'}
        error={sentToError}
      />

      <Field
        label="보낸 시각"
        type="datetime-local"
        value={sentAt}
        onChange={setSentAt}
      />

      <Field
        label="보낸 본문"
        multiline
        rows={8}
        required
        value={bodySnapshot}
        onChange={setBodySnapshot}
        error={bodyError}
      />

      <p className="muted">
        보낸 시각을 비우면 지금으로 기록해요. 계획서 마감은 보낸 날부터 10일이라, 며칠 전에
        보낸 것을 남길 때는 그날을 적어주세요. 본문은 소멸의 근거로 남는 원문이에요 —
        요약하지 말고 보낸 그대로 붙여넣어요.
      </p>

      {/* 미래 시각·중복 기록도 서버가 막는다. 그 문구를 그대로 보여준다 */}
      {record.error && <p className="danger">{record.error.message}</p>}
    </Dialog>
  );
}
