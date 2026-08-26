import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { ListRow, SectionTitle } from '@/components';
import { formatInKst } from '@/lib/format';
import { useCertificates } from './api';

/**
 * 발급 이력. 로딩·에러·빈 상태를 전부 갖는다.
 *
 * 여기에 주민등록번호·주소를 그리지 않는다. 응답에 들어 있지만 그건 PDF 출력용이다.
 * 목록에 필요한 것은 언제 무엇 때문에 받았는지뿐이다.
 */
export function CertificateHistory({ onSelect }: { onSelect: (id: number) => void }) {
  const { data, isPending, error } = useCertificates();

  return (
    <View>
      <SectionTitle title="발급 이력" />
      {isPending ? (
        <ActivityIndicator color={colors.textDisabled} />
      ) : error ? (
        <Text style={styles.error}>{error.message}</Text>
      ) : data.content.length === 0 ? (
        <Text style={styles.empty}>아직 발급한 증명서가 없어요.</Text>
      ) : (
        data.content.map((certificate) => (
          <ListRow
            key={certificate.id}
            label={formatInKst(certificate.issuedAt, 'yyyy.MM.dd')}
            value={certificate.purpose ?? undefined}
            placeholder="용도 없이 발급했어요"
            onPress={() => onSelect(certificate.id)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { ...typography.bodySmall, color: colors.danger },
  empty: { ...typography.bodySmall, color: colors.textWeak },
});
