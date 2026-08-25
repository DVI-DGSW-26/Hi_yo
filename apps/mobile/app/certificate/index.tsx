import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { colors, spacing, typography } from '@hr/tokens';
import { Button, Section, SectionDivider, TextField } from '@/components';
import { CertificateHistory } from '@/features/certificates/CertificateHistory';
import { useIssueCertificate } from '@/features/certificates/api';
import { useMe } from '@/features/employees/api';

/**
 * S-401 재직증명서 신청·발급
 *
 * 이 화면이 전달할 단 하나의 메시지 — **기다릴 필요 없이 지금 받을 수 있다.**
 * 그래서 승인·결재 이야기를 화면에 두지 않고, 입력 두 칸과 버튼 하나로 끝낸다.
 *
 * 용도·제출처는 둘 다 자유 입력이고 필수가 아니다 (명세서 S-401).
 * 재직기간·주민번호 마스킹은 서버가 만든다. 앱에서 계산하거나 가공하지 않는다.
 */

const MAX_LENGTH = 100;

const schema = z.object({
  purpose: z.string().max(MAX_LENGTH, `${MAX_LENGTH}자까지 쓸 수 있어요.`),
  submitTo: z.string().max(MAX_LENGTH, `${MAX_LENGTH}자까지 쓸 수 있어요.`),
});

type FormValues = z.infer<typeof schema>;

export default function CertificateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const issue = useIssueCertificate();

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { purpose: '', submitTo: '' },
  });

  const submit = handleSubmit((values) => {
    issue.mutate(
      {
        purpose: values.purpose.trim() || undefined,
        submitTo: values.submitTo.trim() || undefined,
      },
      { onSuccess: (certificate) => router.push(`/certificate/${certificate.id}`) },
    );
  });

  return (
    <>
      <Stack.Screen options={{ title: '재직증명서' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
          {me.isPending ? (
            <Section>
              <ActivityIndicator color={colors.textDisabled} />
            </Section>
          ) : me.error ? (
            <Section>
              <Text style={styles.error}>{me.error.message}</Text>
            </Section>
          ) : me.data.summary.employmentStatus !== 'ACTIVE' ? (
            // 명세서 S-401: 재직중이 아니면 발급 경로 자체를 열지 않는다.
            <Section>
              <Text style={styles.headline}>재직 중일 때만 발급할 수 있어요</Text>
              <Text style={styles.note}>인사팀에 문의해주세요.</Text>
            </Section>
          ) : (
            <>
              <Section>
                <Text style={styles.headline}>기다릴 필요 없이{'\n'}지금 받을 수 있어요</Text>
                <Text style={styles.note}>누르면 그 자리에서 발급돼요.</Text>
              </Section>
              <SectionDivider />
              <Section>
                <Text style={styles.note}>용도와 제출처는 안 적어도 발급돼요.</Text>
                <View style={styles.fields}>
                  <Controller
                    control={control}
                    name="purpose"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="용도"
                        value={field.value}
                        onChangeText={field.onChange}
                        maxLength={MAX_LENGTH}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="submitTo"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="제출처"
                        value={field.value}
                        onChangeText={field.onChange}
                        maxLength={MAX_LENGTH}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </View>
              </Section>
              <SectionDivider />
              <Section>
                <CertificateHistory onSelect={(id) => router.push(`/certificate/${id}`)} />
              </Section>
            </>
          )}
        </ScrollView>

        {me.data?.summary.employmentStatus === 'ACTIVE' && (
          <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
            {issue.error && <Text style={styles.error}>{issue.error.message}</Text>}
            <Button label="발급받기" loading={issue.isPending} onPress={submit} />
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  headline: { ...typography.headline, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak, marginTop: 8 },
  fields: { marginTop: spacing.sectionTitleGap },
  error: { ...typography.bodySmall, color: colors.danger, marginBottom: 8 },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
