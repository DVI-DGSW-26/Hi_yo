import { View } from 'react-native';
import { ListRow, MoreButton, QueryState, SectionTitle } from '@/components';
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

  // 받은 쪽들을 한 줄로 편다. QueryState 는 배열을 그대로 받아 빈 상태를 판정한다.
  const items = certificates.data?.pages.flatMap((page) => page.content);

  return (
    <View>
      <SectionTitle title="발급 이력" />
      <QueryState
        query={{
          isPending: certificates.isPending,
          // 첫 쪽부터 실패한 경우만 여기서 그린다. 뒤쪽이 실패한 것은 MoreButton 이 맡는다 —
          // 이미 받은 줄까지 지울 이유가 없다.
          error: items === undefined ? certificates.error : null,
          data: items,
        }}
        empty="아직 발급한 증명서가 없어요."
      >
        {(data) => (
          <>
            {data.map((certificate) => (
              <ListRow
                key={certificate.id}
                // 발급 이력은 해를 넘긴다. 값 하나만 서는 자리라 긴 형식을 쓴다 (`DESIGN_RULES.md` 8장).
                label={formatInKst(certificate.issuedAt, 'yyyy년 M월 d일')}
                value={certificate.purpose ?? undefined}
                placeholder="용도 없이 발급했어요"
                onPress={() => onSelect(certificate.id)}
              />
            ))}
            <MoreButton query={certificates} hasItems={data.length > 0} />
          </>
        )}
      </QueryState>
    </View>
  );
}
