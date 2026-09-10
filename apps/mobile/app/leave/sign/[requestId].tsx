import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatLeaveDays } from '@hr/format';
import { colors, spacing, typography } from '@hr/tokens';
import {
  Button,
  ListRow,
  MutationError,
  QueryState,
  Section,
  SectionDivider,
  SectionTitle,
  SignaturePad,
} from '@/components';
import { formatInKst } from '@/lib/format';
import { useRequest, useSignRequest, type LeaveRequest } from '@/features/leave/api';

/**
 * 빠진 신청인 서명 채우기 (단체연차 · 관리팀 대리 등록)
 *
 * 이 화면이 전달할 단 하나의 메시지 — **이미 처리된 신청서에 내 서명만 남았다.**
 *
 * **「신청하기」가 아니다.** 단체연차는 관리팀이 적용을 누르는 순간 서버가 직원마다
 * 신청서를 대신 만들고 차감까지 끝난다 — 전원의 서명을 기다리면 급여 마감이 막히기
 * 때문이다. 그래서 이 화면은 신청을 내는 자리가 아니라 **종이로 치면 나중에 도장을
 * 찍는 자리**다. 문구가 그 사실을 숨기면 직원이 아직 안 쉬어도 되는 줄 안다.
 *
 * **이미 서명한 건도 열린다.** 서버가 다시 서명하면 옛 서명을 지운다고 적고 있어
 * 막지 않는다 — 잘못 그렸을 때 고칠 방법이 그것뿐이다. 대신 이미 서명했다는 것을
 * 화면에 적는다.
 *
 * 결재가 끝난 뒤에는 서버가 막는다(**단체연차는 예외**). 화면에서 미리 판정하지 않는다 —
 * 막힌 이유는 서버 문구로 온다.
 */
export default function SignRequestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Number(params.requestId);

  const [signature, setSignature] = useState('');
  // 서명하는 동안 스크롤을 끈다 (2026-09-09 실기기 — 안 끄면 그려지지 않는다).
  const [signing, setSigning] = useState(false);

  const request = useRequest(requestId);
  const sign = useSignRequest(requestId);

  if (sign.isSuccess) {
    return (
      <>
        <Stack.Screen options={{ title: '서명' }} />
        <Section>
          <SectionTitle title="서명했어요" />
          <Text style={styles.body}>
            신청서에 서명이 들어갔어요. 휴가는 이미 처리돼 있으니 따로 할 일은 없어요.
          </Text>
          <View style={styles.action}>
            <Button label="돌아가기" variant="secondary" onPress={() => router.back()} />
          </View>
        </Section>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '서명' }} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.sectionY }]}
        scrollEnabled={!signing}
      >
        <QueryState query={request}>
          {(data) => (
            <>
              <Section>
                <Text style={styles.lead}>{lead(data)}</Text>
              </Section>

              <SectionDivider />

              <Section>
                <SectionTitle title="무엇에 대한 서명인가요" />
                <ListRow label="종류" value={data.typeName ?? data.typeCode} />
                <ListRow label="기간" value={period(data)} />
                <ListRow label="깎인 연차" value={formatLeaveDays(data.leaveDays)} />
              </Section>
            </>
          )}
        </QueryState>

        <SectionDivider />

        <Section>
          <SectionTitle title="서명" />
          {/* 종이 서식의 「작성」 칸이다. 신청서와 같은 값을 그대로 실어 보낸다 */}
          <SignaturePad
            label="신청인 서명"
            value={signature}
            onChange={setSignature}
            onDrawingChange={setSigning}
          />
        </Section>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
        <MutationError mutation={sign} />
        {!sign.error && signature === '' && (
          <Text style={styles.hint}>손가락으로 서명을 적어주세요.</Text>
        )}
        <Button
          label="서명 남기기"
          loading={sign.isPending}
          onPress={() => {
            if (!signature) return;
            sign.mutate(signature);
          }}
        />
      </View>
    </>
  );
}

/**
 * 머리말. **왜 서명이 비어 있는지를 먼저 말한다** — 직원이 낸 적 없는 신청서를 보고
 * 「이게 뭐지」부터 하게 두지 않는다.
 */
function lead(request: LeaveRequest): string {
  if (request.applicantSigned) {
    return '이미 서명한 신청서예요. 다시 그리면 앞의 서명은 지워져요.';
  }
  if (request.companyLeave) {
    return '회사가 정한 단체 휴무라 신청서가 자동으로 만들어졌어요. 연차는 이미 깎였고, 서명만 남았어요.';
  }
  return '내 대신 접수된 신청서예요. 처리는 끝났고 서명만 남았어요.';
}

/**
 * 서버의 날짜(`2026-08-24`)에는 시각이 없다. KST 자정으로 못 박아 넘긴다 —
 * 시각을 붙이지 않으면 기기 타임존에 따라 하루 밀린다.
 */
function period(request: LeaveRequest): string {
  const start = formatInKst(`${request.startDate}T00:00:00+09:00`, 'yyyy년 M월 d일');
  if (request.startDate === request.endDate) return start;
  return `${start} ~ ${formatInKst(`${request.endDate}T00:00:00+09:00`, 'M월 d일')}`;
}

const styles = StyleSheet.create({
  /*
   * `insets.bottom` 을 쓰는 쪽에서 덮어쓴다. 안드로이드는 내비게이션 바 뒤까지
   * 화면을 그려서(edge-to-edge) 이 값만으로는 마지막 줄이 가린다 (2026-09-09 실기기).
   */
  scroll: { paddingBottom: spacing.sectionY },
  lead: { ...typography.bodySmall, color: colors.textBody },
  body: { ...typography.bodySmall, color: colors.textBody },
  hint: { ...typography.label, color: colors.textWeak, marginBottom: spacing.tight },
  action: { marginTop: spacing.rowGap },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
