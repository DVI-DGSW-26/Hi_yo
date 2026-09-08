import { useState } from 'react';
import { Field, RowLink, Select, Summary, Table, type Column } from '@/components';
import { daysCell, dim, orDash } from '@/lib/cell';
import { shortDate } from '@/lib/datetime';
import { departmentOptions, matchesKeyword } from '@/lib/listFilter';
import { PromotionNoticeDialog } from '@/features/leave/PromotionNoticeDialog';
import { RecordedNotices } from '@/features/leave/RecordedNotices';
import {
  PROMOTION_ROUNDS,
  promotionRoundLabel,
  selectableLedgerYears,
  usePromotionTargets,
  type PromotionNotice,
  type PromotionRound,
  type PromotionTarget,
} from '@/features/leave/api';

/**
 * A-305 연차촉진
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이 차수 통보를 아직 안 남긴 사람이 누구인가.**
 *
 * 연차는 그해 12월 31일에 소멸하고 이월이 없다. 회사가 「쓰라고 알렸다」는 기록이 있어야
 * 소멸이 성립하고, 없으면 나중에 연차수당을 지급해야 할 수 있다 (`docs/API_연차.md` 10장).
 * 그래서 이 표는 잔여를 보는 표가 아니라 **아직 안 알린 사람을 찾는 명단**이다 —
 * 서버가 기록이 있는 사람을 목록에서 빼 주는 이유가 그것이다.
 *
 * **여기서 메일이 나가지 않는다.** 서버 스펙이 직접 그렇게 적고 있고 알림 발송 경로는
 * 아직 없다. 관리팀이 서면이나 메일로 보낸 뒤 **보냈다는 사실을 남기는** 화면이다.
 * 문구를 전부 「기록」으로 적는 이유다 — 「보내기」라고 적으면 누르고 나서 보낸 줄 안다.
 *
 * **잔여를 화면이 세지 않는다.** 두 잔여도 계획서 마감일도 서버가 계산해 준다
 * (`CLAUDE.md` 3장). 통보서에 찍히는 숫자는 서버가 발송 시점에 다시 계산해 박는
 * 스냅샷이라, 이 표의 숫자와 다를 수 있다는 것까지 스펙에 적혀 있다.
 *
 * **주 동작 버튼이 없다.** 보낼 사람을 고르는 것이 이 화면의 일이고 기록은 사람마다
 * 다른 본문을 받아야 해서 줄에서 연다 — 연차관리대장과 같은 모양이다
 * (`DESIGN_ADMIN.md` 5장, 표 안의 행별 동작은 글자 링크).
 */
export function LeavePromotionsPage() {
  // 지나간 해에 새로 보낼 일은 없지만 무엇을 남겼는지 들춰볼 수는 있어야 한다.
  // 대장과 같은 범위를 쓴다 — 화면마다 연도 범위를 다시 정하지 않는다.
  const yearOptions = selectableLedgerYears();
  const [year, setYear] = useState(() => yearOptions[0]!);
  const [round, setRound] = useState<PromotionRound>('FIRST');
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [recording, setRecording] = useState<PromotionTarget>();
  const [recorded, setRecorded] = useState<PromotionNotice[]>([]);

  const targets = usePromotionTargets(year, round);

  /*
   * 거르는 것은 화면에서 한다. 대상 목록은 쪽으로 잘리지 않고 통째로 오므로 걸러도
   * 다음 쪽에 숨는 사람이 없다 (`lib/listFilter.ts`).
   */
  const rows = targets.data?.filter(
    (row) =>
      (department === '' || row.departmentName === department) &&
      matchesKeyword(keyword, row.employeeName, row.employeeNo),
  );
  const filtering = keyword.trim() !== '' || department !== '';

  /*
   * 두 잔여가 다른 사람 = **결재 대기중인 신청이 있는 사람**이다. 대기중 신청이 반려되면
   * 잔여가 되돌아오므로 통보서 숫자가 흔들린다 — 스펙이 「관리팀이 눈으로 확인해야 한다」고
   * 적어 둔 자리다. 목록의 길이일 뿐 업무 계산이 아니다 (`DESIGN_ADMIN.md` 11장).
   */
  const pendingCount = targets.data?.filter(
    (row) => row.remainingDays !== row.confirmedRemainingDays,
  ).length;

  const roundLabel = promotionRoundLabel(round);

  const columns: Column<PromotionTarget>[] = [
    {
      key: 'employee',
      header: '이름',
      sticky: true,
      render: (row) => row.employeeName ?? `직원 ${row.employeeId}`,
    },
    { key: 'employeeNo', header: '사번', render: (row) => orDash(row.employeeNo) },
    { key: 'department', header: '부서', render: (row) => orDash(row.departmentName) },
    {
      key: 'remaining',
      header: '잔여 연차',
      align: 'right',
      render: (row) => daysCell(row.remainingDays),
    },
    {
      key: 'confirmedRemaining',
      header: '승인분만 뺀 잔여',
      align: 'right',
      render: (row) => daysCell(row.confirmedRemainingDays),
    },
    {
      key: 'email',
      header: '통보처',
      /*
       * 메일 주소가 없으면 이메일로 기록할 수 없다 — 서면으로 교부하고 남겨야 한다.
       * **빨강으로 두지 않는다.** 이 화면에서 주소를 넣을 경로가 없고, 서면도 제61조의
       * 통지 수단이라 잘못된 상태가 아니다 (`DESIGN_RULES.md` 2장).
       */
      render: (row) => row.email ?? dim('메일 없어요 · 서면'),
    },
    {
      key: 'planDue',
      header: '오늘 보내면 마감',
      render: (row) =>
        row.planDueOnIfSentToday == null ? orDash(null) : shortDate(row.planDueOnIfSentToday),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <span className="row-actions">
          <RowLink label="기록하기" onClick={() => setRecording(row)} />
        </span>
      ),
    },
  ];

  return (
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">연차촉진</h1>
          <p className="page-lead">
            연차를 쓰라고 알린 사실을 남기는 화면이에요. 여기서 메일이 나가지는 않아요 — 서면이나
            메일로 보낸 뒤에 그 사실을 기록해요.
          </p>
        </div>
      </div>

      {targets.data && (
        <Summary
          items={[
            { label: `${year}년 ${roundLabel} 대상`, value: `${targets.data.length}명` },
            { label: '결재 대기중인 신청 있음', value: `${pendingCount}명` },
          ]}
          note="이미 기록을 남긴 사람은 목록에서 빠져요. 두 잔여가 다르면 결재 대기중인 신청이 있다는 뜻이라, 통보서 숫자가 반려로 흔들릴 수 있어요."
        />
      )}

      {/* 기록하면 그 줄이 표에서 사라진다. 무엇을 남겼는지가 여기 말고는 드러날 곳이 없다. */}
      <RecordedNotices notices={recorded} />

      <Table
        columns={columns}
        rows={rows}
        keyOf={(row) => row.employeeId}
        isPending={targets.isPending}
        error={targets.error}
        emptyText={
          filtering
            ? '찾는 조건에 맞는 사람이 없어요.'
            : `${year}년 ${roundLabel} 대상이 없어요. 다 기록했거나, 아직 이 차수를 보낼 때가 아니에요.`
        }
        toolbar={
          <>
            <Select
              label="연도"
              value={String(year)}
              onChange={(value) => setYear(Number(value))}
              options={yearOptions.map((value) => ({ value: String(value), label: `${value}년` }))}
            />
            <Select
              label="차수"
              value={round}
              onChange={(value) => setRound(value as PromotionRound)}
              options={PROMOTION_ROUNDS.map((each) => ({
                value: each.value,
                label: `${each.label} — ${each.hint}`,
              }))}
            />
            <Field label="검색" value={keyword} onChange={setKeyword} placeholder="이름·사번" />
            <Select
              label="부서"
              value={department}
              onChange={setDepartment}
              options={departmentOptions(targets.data, (row) => row.departmentName)}
            />
          </>
        }
      />

      {/* 사람이 바뀌면 새로 만든다. 앞사람의 본문이 남아 있으면 그대로 기록된다. */}
      <PromotionNoticeDialog
        key={recording?.employeeId ?? 'closed'}
        target={recording}
        year={year}
        onClose={() => setRecording(undefined)}
        onRecorded={(notice) => setRecorded((before) => [...before, notice])}
      />
    </section>
  );
}
