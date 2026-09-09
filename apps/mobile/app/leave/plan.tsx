import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@hr/tokens';
import {
  Button,
  MutationError,
  Section,
  SectionDivider,
  SectionTitle,
  SignaturePad,
  TextField,
} from '@/components';
import { useMyPlans, useSubmitLeavePlan } from '@/features/leave/api';
import { LeaveCalendarSection } from '@/features/leave/LeaveCalendarSection';
import { LeavePlanBalanceSection } from '@/features/leave/LeavePlanBalanceSection';
import { LeavePlanPickedSection } from '@/features/leave/LeavePlanPickedSection';
import { LeavePlanResult } from '@/features/leave/LeavePlanResult';
import { QueryState } from '@/components';
import { cycleDay, sortedDates, toPlannedDays, type PickedDays } from '@/features/leave/planDays';

/**
 * S-302 연차사용계획서
 *
 * 이 화면이 전달할 단 하나의 메시지 — **남은 연차를 언제 쓸지 달력에서 고른다.**
 *
 * 회사 서식(「연차사용계획서 [1차]」)을 그대로 옮긴 화면이다 — 총 연차·사용·잔여를
 * 보여주고, 달력에서 날짜를 고르고, 사용계획일수를 센다.
 * **서식에 「날짜 선택할 수 있는 달력 필요!」라는 메모가 붙어 있었다** (2026-09-02).
 * 종이의 ②(음영은 휴무일)는 달력이 대신하므로 옮기지 않았다.
 *
 * **제출은 `POST /leave/promotions/{promotionId}/plan`이다** (2026-09-02에 열렸다).
 * 서명이 필수다 — 결재 서명과 달리 대리 등록 경로가 없고, 계획서는 직원 본인의
 * 의사표시라는 것이 증빙의 핵심이기 때문이다.
 *
 * **`promotionId`는 라우트 파라미터로 받는다.** 2026-09-09에 `GET /leave/promotions/me`가
 * 열리면서(26번) S-301 맨 위의 `LeavePromotionSection`이 이 화면으로 보낸다. 그전에는
 * 그 값이 관리팀 발송 응답에만 담겨서 화면을 만들어 두고도 연결할 데가 없었다.
 *
 * 값이 없거나 숫자가 아니면 지어내지 않고 그대로 알린다 — 알림·링크로 바로 들어오는
 * 길도 있어서 라우트가 늘 옳다고 보지 않는다.
 *
 * 달력은 S-301과 같은 `LeaveCalendarSection`이다. 고르는 것을 막지 않는 것도 같다 —
 * 주말·공휴일·중복·기한은 전부 서버가 422로 판정한다.
 */
export default function LeavePlanScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ promotionId?: string }>();
  const promotionId = Number(params.promotionId);

  const [month, setMonth] = useState(() => new Date());
  const [picked, setPicked] = useState<PickedDays>({});
  const [signature, setSignature] = useState('');
  // 서명하는 동안 스크롤을 끈다 (2026-09-09 실기기 — 안 끄면 그려지지 않는다).
  const [signing, setSigning] = useState(false);
  const [note, setNote] = useState('');

  const submit = useSubmitLeavePlan(promotionId);

  // 이 통보에 대한 계획서를 이미 냈는지. 없으면 undefined 다 — 오류가 아니다.
  const plans = useMyPlans();
  const submitted = plans.data?.find((plan) => plan.promotionId === promotionId);

  const dates = sortedDates(picked);

  function send() {
    // 서명은 서버에서도 필수다. 날짜 판정은 서버가 하므로 여기서 거르지 않는다.
    if (dates.length === 0 || !signature) return;

    submit.mutate({
      days: toPlannedDays(picked),
      signatureImage: signature,
      note: note.trim() || undefined,
    });
  }

  // 낸 뒤에는 결과만 보여준다. 한 통보당 계획서는 하나라 다시 낼 수 없다(409).
  if (submit.data) {
    return (
      <>
        <Stack.Screen options={{ title: '연차사용계획서' }} />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.sectionY }]}>
          <LeavePlanResult plan={submit.data} />
        </ScrollView>
      </>
    );
  }

  /*
   * **이미 낸 건이면 그것을 보여준다** (2026-09-09에 조회가 열렸다).
   *
   * 그전에는 낸 사람이 이 화면에 다시 들어오면 빈 폼이 나왔고, 내면 409였다.
   * 지금은 낸 날짜를 그대로 다시 본다.
   *
   * 목록이 아직 안 왔으면 폼을 그리지 않는다 — 낸 사람에게 빈 달력을 잠깐 보여주고
   * 나서 결과로 바꾸면, 그 사이에 날짜를 고르기 시작한 사람의 입력이 사라진다.
   */
  if (submitted !== undefined) {
    return (
      <>
        <Stack.Screen options={{ title: '연차사용계획서' }} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <LeavePlanResult plan={submitted} />
        </ScrollView>
      </>
    );
  }

  if (plans.isPending || plans.error) {
    return (
      <>
        <Stack.Screen options={{ title: '연차사용계획서' }} />
        <QueryState query={plans} wrapState={(state) => <Section>{state}</Section>}>
          {() => null}
        </QueryState>
      </>
    );
  }

  // 어느 통보에 대한 계획서인지 모르면 낼 수 없다. 지어내지 않고 그대로 알린다.
  if (!Number.isFinite(promotionId)) {
    return (
      <>
        <Stack.Screen options={{ title: '연차사용계획서' }} />
        <Section>
          <Text style={styles.lead}>
            어떤 촉진 통보에 대한 계획서인지 알 수 없어요. 알림에서 다시 들어와 주세요.
          </Text>
        </Section>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '연차사용계획서' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" scrollEnabled={!signing}>
          <Section>
            {/*
              서식 머리말을 옮기되 **「계획서를 내면 쉬는 것」으로 읽히지 않게 적는다.**
              서버 문서가 그렇게 안내하면 직원이 신청을 빠뜨려 무단결근이 된다고 못 박았다.
            */}
            <Text style={styles.lead}>
              쓰지 않은 연차는 다음 해로 넘어가지도, 수당으로 나오지도 않고 그해 12월 31일에
              사라져요. 아래에서 쉬려는 날을 골라 계획서를 내주세요. 계획서는 미리 알리는
              것이고, 실제로 쉬려면 그날 휴가를 따로 신청해야 해요.
            </Text>
          </Section>

          <SectionDivider />

          <Section>
            <LeavePlanBalanceSection />
          </Section>

          <SectionDivider />

          <Section>
            <Text style={styles.hint}>누르면 연차, 한 번 더 누르면 반차, 또 누르면 빠져요.</Text>
            <LeaveCalendarSection
              month={month}
              onChangeMonth={setMonth}
              selected={dates}
              onPressDate={(iso) => setPicked((prev) => cycleDay(prev, iso))}
            />
          </Section>

          <SectionDivider />

          <Section>
            <LeavePlanPickedSection picked={picked} />
          </Section>

          <SectionDivider />

          <Section>
            {/* 255는 서버가 받는 한계다 (`LeavePlanSubmitRequest`) */}
            <TextField label="남길 말" value={note} onChangeText={setNote} maxLength={255} />
            <Text style={styles.note}>안 적어도 낼 수 있어요.</Text>
          </Section>

          <SectionDivider />

          <Section>
            <SectionTitle title="서명" />
            {/*
              서식의 「제출자」 자리다. **서버에서도 필수다** — 대리 등록 경로가 없어
              본인 의사표시가 증빙의 핵심이다.
            */}
            <SignaturePad
              label="제출자 서명"
              value={signature}
              onChange={setSignature}
              onDrawingChange={setSigning}
            />
          </Section>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
          <MutationError mutation={submit} />
          {!submit.error && blockedReason(dates.length, signature) !== undefined && (
            <Text style={styles.hint}>{blockedReason(dates.length, signature)}</Text>
          )}
          <Button label="계획서 내기" loading={submit.isPending} onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/**
 * 아직 낼 수 없는 이유. 버튼은 항상 눌리므로(확정 결정) 막힌 이유를 이 자리에 적는다.
 *
 * **서버가 판단하는 것은 여기서 말하지 않는다** — 주말·공휴일·중복·기한은 422로 온다.
 * 화면이 아는 것, 곧 아직 안 채운 칸만 짚는다.
 */
function blockedReason(dayCount: number, signature: string): string | undefined {
  if (dayCount === 0) return '달력에서 쉬려는 날을 골라주세요.';
  if (!signature) return '서명을 남겨주세요.';
  return undefined;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  /*
   * `insets.bottom` 을 쓰는 쪽에서 덮어쓴다. 안드로이드는 내비게이션 바 뒤까지
   * 화면을 그려서(edge-to-edge) 이 값만으로는 마지막 줄이 가린다 (2026-09-09 실기기).
   */
  scroll: { paddingBottom: spacing.sectionY },
  lead: { ...typography.bodySmall, color: colors.textBody },
  hint: { ...typography.label, color: colors.textWeak, marginBottom: spacing.tight },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
