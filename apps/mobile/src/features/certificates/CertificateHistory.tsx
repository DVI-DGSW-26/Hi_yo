import { View } from 'react-native';
import { ListRow, QueryState, SectionTitle } from '@/components';
import { formatInKst } from '@/lib/format';
import { useCertificates } from './api';

/**
 * 발급 이력. 로딩·에러·빈 상태는 `QueryState`가 갖는다.
 *
 * 여기에 주민등록번호·주소를 그리지 않는다. 응답에 들어 있지만 그건 PDF 출력용이다.
 * 목록에 필요한 것은 언제 무엇 때문에 받았는지뿐이다.
 */
export function CertificateHistory({ onSelect }: { onSelect: (id: number) => void }) {
  const certificates = useCertificates();

  return (
    <View>
      <SectionTitle title="발급 이력" />
      <QueryState query={certificates} empty="아직 발급한 증명서가 없어요.">
        {(data) =>
          data.content.map((certificate) => (
            <ListRow
              key={certificate.id}
              label={formatInKst(certificate.issuedAt, 'yyyy.MM.dd')}
              value={certificate.purpose ?? undefined}
              placeholder="용도 없이 발급했어요"
              onPress={() => onSelect(certificate.id)}
            />
          ))
        }
      </QueryState>
    </View>
  );
}
