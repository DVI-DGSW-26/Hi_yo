import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';
import { ListRow, Section, SectionDivider, SectionTitle } from '@/components';
import { formatLeaveDays, formatServerDate } from '@/lib/format';
import { useMyPromotions, type LeavePromotion } from './api';

/**
 * 내가 받은 연차촉진 통보. S-301 맨 위에 붙는다.
 *
 * **S-302(연차사용계획서)로 들어가는 유일한 길이다.** `GET /leave/promotions/me`가
 * 2026-09-09에 열리면서 `promotionId`를 손에 쥘 수 있게 됐다 — 그전에는 계획서 화면을
 * 만들어 두고도 어디에서도 연결하지 못했다.
 *
 * **통보가 없으면 아무것도 그리지 않는다.** 대부분의 직원에게는 통보가 없고, 없는 사람에게
 * 「받은 통보가 없어요」를 매번 보여줄 이유가 없다. 연차 화면의 주인공은 잔여다.
 *
 * **로딩 중에도 그리지 않는다.** 잔여가 먼저 그려지는 화면에서 이 자리가 나타났다
 * 사라지면 아래가 통째로 밀린다. 대신 **오류는 감추지 않는다** — 마감이 걸린 통보가
 * 있는지 없는지 모르는 채로 두면 직원이 기한을 넘긴다.
 *
 * 낸 건은 들어가는 줄을 놓지 않는다. 한 통보당 계획서는 하나고 두 번째 제출은 409다.
 * 낸 계획서를 **다시 볼 경로는 아직 없다** (`docs/01_물어볼_것.md`).
 */
export function LeavePromotionSection() {
  const promotions = useMyPromotions();

  if (promotions.isPending) return null;

  if (promotions.error) {
    return (
      <>
        <Section>
          <Text style={styles.error}>{promotions.error.message}</Text>
        </Section>
        <SectionDivider />
      </>
    );
  }

  const list = promotions.data ?? [];
  if (list.length === 0) return null;

  return (
    <>
      <Section>
        <SectionTitle title="연차사용계획서를 내야 해요" />
        <Text style={styles.lead}>
          쓰지 않은 연차는 그해 12월 31일에 사라져요. 언제 쉴지 미리 알리는 서류예요.
        </Text>
        {list.map((promotion) => (
          <PromotionRows key={promotion.id} promotion={promotion} />
        ))}
      </Section>
      <SectionDivider />
    </>
  );
}

function PromotionRows({ promotion }: { promotion: LeavePromotion }) {
  const title = `${promotion.fiscalYear}년 ${promotion.round === 'FIRST' ? '1차' : '2차'}`;

  return (
    <View style={styles.rows}>
      <ListRow label="통보" value={title} />
      <ListRow label="제출 기한" value={formatServerDate(promotion.planDueOn, 'M월 d일')} />
      {/* 통보 시점의 값이다. 위 잔여와 다를 수 있어 그렇게 적는다. */}
      <ListRow
        label="통보 당시 잔여"
        value={formatLeaveDays(promotion.remainingDays)}
      />
      {promotion.planSubmitted ? (
        <ListRow label="계획서" value="냈어요" />
      ) : (
        <ListRow
          label="계획서 내기"
          variant="nav"
          onPress={() => router.push(`/leave/plan?promotionId=${promotion.id}`)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { ...typography.label, color: colors.textWeak },
  rows: { marginTop: spacing.sectionTitleGap },
  error: { ...typography.body, color: colors.danger },
});
