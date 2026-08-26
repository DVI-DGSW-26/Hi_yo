import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@hr/tokens';
import { Button, ListRow, Section, SectionDivider, SectionTitle } from '@/components';
import { useCertificate } from '@/features/certificates/api';
import { useShareCertificatePdf } from '@/features/certificates/pdf';
import { formatInKst } from '@/lib/format';

/**
 * 발급된 증명서 한 건. 이 화면이 전달할 단 하나의 메시지 — **발급이 끝났고, 여기서 받아 간다.**
 *
 * 주민등록번호와 현주소는 응답에 들어 있지만 화면에 그리지 않는다. 증명서 출력에 필요한
 * 값이지 조회 화면에 필요한 값이 아니다. 어깨너머로 보이는 자리에 둘 이유가 없다.
 */
export default function CertificateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const certificate = useCertificate(Number(id));
  const share = useShareCertificatePdf();

  return (
    <>
      <Stack.Screen options={{ title: '재직증명서' }} />
      <ScrollView style={styles.flex}>
        {certificate.isPending ? (
          <Section>
            <ActivityIndicator color={colors.textDisabled} />
          </Section>
        ) : certificate.error ? (
          <Section>
            <Text style={styles.error}>{certificate.error.message}</Text>
          </Section>
        ) : (
          <>
            <Section>
              <Text style={styles.headline}>발급했어요</Text>
              <Text style={styles.note}>
                {formatInKst(certificate.data.issuedAt, 'yyyy년 M월 d일')} 기준으로 만들어졌어요.
              </Text>
            </Section>
            <SectionDivider />
            <Section>
              <SectionTitle title="증명서" />
              <ListRow label="문서번호" value={certificate.data.docNo ?? undefined} placeholder="아직이에요" />
              <ListRow label="재직기간" value={certificate.data.tenureText ?? undefined} placeholder="아직이에요" />
              <ListRow label="부서" value={certificate.data.departmentName ?? undefined} placeholder="아직이에요" />
              <ListRow label="직급" value={certificate.data.jobGrade ?? undefined} placeholder="아직이에요" />
              <ListRow label="용도" value={certificate.data.purpose ?? undefined} placeholder="안 적었어요" />
              <ListRow label="제출처" value={certificate.data.submitTo ?? undefined} placeholder="안 적었어요" />
            </Section>
          </>
        )}
      </ScrollView>

      {certificate.data && (
        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.ctaX }]}>
          {share.error && <Text style={styles.error}>{share.error.message}</Text>}
          <Button
            label="PDF로 받기"
            variant="secondary"
            loading={share.isPending}
            onPress={() =>
              share.mutate({ id: certificate.data.id, docNo: certificate.data.docNo })
            }
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  headline: { ...typography.headline, color: colors.textStrong },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
  error: { ...typography.bodySmall, color: colors.danger, marginBottom: spacing.tight },
  cta: {
    paddingHorizontal: spacing.ctaX,
    paddingTop: spacing.ctaX,
    backgroundColor: colors.white,
  },
});
