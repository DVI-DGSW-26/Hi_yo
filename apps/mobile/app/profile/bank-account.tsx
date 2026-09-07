import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@hr/tokens';
import {
  Button,
  ConfirmSheet,
  MutationError,
  Section,
  SectionDivider,
  SectionTitle,
  TextField,
} from '@/components';
import { CurrentBankAccount } from '@/features/employees/CurrentBankAccount';
import { useMe, useUpdateBankAccount } from '@/features/employees/api';

/**
 * S-101 통장정보 수정
 *
 * 이 화면이 전달할 단 하나의 메시지 — **여기 적은 계좌로 급여가 들어간다.**
 *
 * **직원이 스스로 바꿀 수 있는 유일한 항목이다** (요구사항정의서 2.1 — 즉시 반영,
 * 관리팀에 알림). 그래서 조회 화면(마이페이지)에서 이 화면만 갈라져 나온다.
 *
 * **셋을 새로 적는다.** `PUT /employees/{id}/bank-account`가 은행명·계좌번호·예금주를
 * 전부 덮어쓰기 때문에 일부만 보내면 나머지가 `null`로 지워진다. 그렇다고 지금 값을
 * 칸에 미리 채워 두지 않는다 — **채우려면 계좌번호 원문을 화면에 띄워야 한다.**
 * 지금 등록된 계좌는 위쪽에 가려서만 보여주고, 바꾸는 사람은 새 값을 처음부터 적는다.
 * 계좌를 바꾸는 자리에서 셋을 다시 적는 것은 손이 더 가는 일이 아니라 확인 절차다.
 *
 * **틀려도 서버가 잡아주지 못한다.** 형식이 맞는 남의 계좌번호는 서버에게 정상이다.
 * 그래서 이 화면만 `ConfirmSheet`로 한 번 더 묻는다 — 급여가 한 번 잘못 나가면
 * 되돌리는 것이 앱 밖의 일이 된다.
 */
export default function BankAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [confirming, setConfirming] = useState(false);

  const me = useMe();
  const update = useUpdateBankAccount();

  const employeeId = me.data?.summary.id;
  const filled = [bankName, bankAccount, accountHolder].map((value) => value.trim());
  const ready = employeeId !== undefined && filled.every((value) => value.length > 0);

  function submit() {
    if (!ready) return;

    const [nextBankName, nextBankAccount, nextAccountHolder] = filled;

    update.mutate(
      {
        employeeId,
        bankName: nextBankName,
        bankAccount: nextBankAccount,
        accountHolder: nextAccountHolder,
      },
      {
        onSuccess: () => {
          setConfirming(false);
          router.back();
        },
      },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '계좌 바꾸기' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
          <Section>
            <Text style={styles.headline}>바꾸면 다음 급여부터 새 계좌로 들어가요</Text>
            <Text style={styles.note}>
              계좌번호를 잘못 적으면 급여가 다른 곳으로 가요. 통장을 보고 적어주세요.
            </Text>
          </Section>

          <SectionDivider />

          <Section>
            <CurrentBankAccount />
          </Section>

          <SectionDivider />

          <Section>
            <SectionTitle title="새 계좌" />
            {/* 셋 다 서버가 필수로 받는다. 하나라도 비우면 나머지가 지워진다 */}
            <TextField
              label="은행"
              value={bankName}
              onChangeText={setBankName}
              placeholder="국민"
            />
            {/*
              숫자 키보드를 쓰지 않는다. 통장에 적힌 대로 하이픈까지 적을 수 있어야 하고,
              iOS 숫자 키패드에는 하이픈이 없다.
            */}
            <TextField
              label="계좌번호"
              value={bankAccount}
              onChangeText={setBankAccount}
              placeholder="1002-345-678901"
            />
            <TextField
              label="예금주"
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="통장에 적힌 이름"
            />
          </Section>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
          <MutationError mutation={update} />
          {!update.error && hint(filled, employeeId) !== undefined && (
            <Text style={styles.hint}>{hint(filled, employeeId)}</Text>
          )}
          <Button label="바꾸기" onPress={() => setConfirming(true)} />
        </View>
      </KeyboardAvoidingView>

      <ConfirmSheet
        open={confirming}
        title="이 계좌로 바꿀까요"
        description={confirmText(filled)}
        confirmLabel="바꾸기"
        mutation={update}
        onConfirm={submit}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}

/**
 * 아직 바꿀 수 없는 이유. 버튼은 항상 눌리므로 막힌 이유를 이 자리에 적는다.
 *
 * 계좌번호가 실재하는지는 여기서 말하지 않는다 — 화면이 아는 것이 아니다.
 */
function hint(filled: string[], employeeId: number | undefined): string | undefined {
  const [bankName, bankAccount, accountHolder] = filled;

  if (employeeId === undefined) return '내 정보를 아직 못 받았어요.';
  if (bankName.length === 0) return '은행 이름을 적어주세요.';
  if (bankAccount.length === 0) return '계좌번호를 적어주세요.';
  if (accountHolder.length === 0) return '예금주를 적어주세요.';
  return undefined;
}

/**
 * 확인 시트에 무엇이 바뀌는지 적는다.
 *
 * **여기서는 가리지 않는다.** 방금 본인이 적은 값을 되읽어 확인하는 자리라, 가리면
 * 오타를 잡을 수가 없다 — 확인 절차 자체가 없어진다.
 */
function confirmText(filled: string[]): string {
  const [bankName, bankAccount, accountHolder] = filled;

  if (bankAccount.length === 0) return '계좌번호를 적어주세요.';
  return `${bankName} ${bankAccount} (${accountHolder})\n다음 급여부터 이 계좌로 들어가요.`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  headline: { ...typography.headline, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
  hint: { ...typography.label, color: colors.textWeak, marginBottom: spacing.tight },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
