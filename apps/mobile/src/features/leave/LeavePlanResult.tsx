import { format, parseISO } from 'date-fns';
import { StyleSheet, Text } from 'react-native';
import { formatLeaveDays } from '@hr/format';
import { colors, spacing, typography } from '@hr/tokens';
import { ListRow, Section, SectionDivider, SectionTitle } from '@/components';
import type { LeavePlan } from './api';
import { dayLabel } from './planDays';

/**
 * 계획서를 내고 난 뒤.
 *
 * 이 화면이 전달할 단 하나의 메시지 — **계획서는 냈고, 휴가 신청은 아직 안 했다.**
 *
 * **여기가 이 기능에서 제일 위험한 자리다.** 계획서 제출은 연차를 깎지 않는다.
 * 서버 문서가 「화면이 "계획서를 냈으니 쉬는 것"으로 안내하면 직원이 신청을 통째로
 * 빠뜨리고, 그날 무단결근으로 잡힙니다」를 두 곳에 적어 뒀다
 * (`LeavePlanSubmitRequest`·`POST .../plan` 설명). 그래서 「냈어요」를 크게 적지 않고
 * **아직 남은 일**을 제목 자리에 둔다.
 *
 * **경고 색도 박스도 쓰지 않는다** — 단계는 문구가 가른다 (`DESIGN_RULES.md` 3장).
 *
 * `remainingAfterPlan`을 「잔여」라고 부르지 않는다. 서버 스키마가 **참고용 계산값**이라고
 * 못 박고 있다 — 진짜 잔여는 `GET /leave/balance`다.
 *
 * **조회로 받은 건에는 그 값이 없다** (2026-09-09). 그때는 줄을 아예 그리지 않는다 —
 * 없는 값을 0으로 그리면 「연차를 다 썼다」로 읽힌다.
 */
export function LeavePlanResult({ plan }: { plan: LeavePlan }) {
  return (
    <>
      <Section>
        <SectionTitle title="아직 휴가 신청은 안 됐어요" />
        <Text style={styles.body}>
          계획서는 언제 쉴지 미리 알리는 종이예요. 연차는 아직 그대로 있어요. 적어 낸 날에
          실제로 쉬려면 그날 휴가를 따로 신청해야 하고, 신청하지 않으면 결근으로 잡혀요.
        </Text>

        {/* 늦게 낸 것은 막지 않고 표시만 한다. 서버가 준 문구를 그대로 쓴다 */}
        {plan.late && plan.notice !== null && <Text style={styles.notice}>{plan.notice}</Text>}
      </Section>

      <SectionDivider />

      <Section>
        <SectionTitle title="적어 낸 날" />
        {plan.days.map((day) => (
          <ListRow
            key={day.date}
            label={dayLabel(day.date)}
            value={day.days === 1 ? '연차' : '반차'}
          />
        ))}
        <ListRow label="사용계획일수" value={formatLeaveDays(plan.plannedDays)} />
        {/*
          「잔여」가 아니다. 계획서는 연차를 깎지 않는다 — 아직 신청하지 않은 일수가
          얼마나 남았는지 보려는 참고값이다 (`LeavePlanResponse` 스키마).

          조회로 받은 건에는 이 값이 없다. 0으로 그리면 「연차를 다 썼다」로 읽힌다.
        */}
        {plan.remainingAfterPlan !== null && (
          <>
            <ListRow
              label="계획을 뺀 나머지"
              value={formatLeaveDays(plan.remainingAfterPlan)}
            />
            <Text style={styles.note}>
              「계획을 뺀 나머지」는 참고용이에요. 연차가 줄어든 것은 아니에요.
            </Text>
          </>
        )}
      </Section>

      <SectionDivider />

      <Section>
        <ListRow label="낸 날짜" value={format(parseISO(plan.submittedAt), 'yyyy년 M월 d일')} />
        <ListRow label="제출 기한" value={format(parseISO(plan.planDueOn), 'yyyy년 M월 d일')} />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.bodySmall, color: colors.textBody },
  notice: { ...typography.bodySmall, color: colors.textBody, marginTop: spacing.tight },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
});
