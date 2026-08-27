import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { ListRow, QueryState, Section, SectionTitle } from '@/components';
import { useMe } from '@/features/employees/api';

/**
 * 임시 진입점이다. 홈 화면(S-101 마이페이지 포함) 상세 스펙이 확정되면 이 파일을 대체한다.
 * 지금은 만들어진 화면으로 들어가는 통로 역할만 한다.
 */
export default function Index() {
  const router = useRouter();
  const me = useMe();

  return (
    <>
      <Stack.Screen options={{ title: 'HR' }} />
      <ScrollView style={styles.flex}>
        <Section>
          <SectionTitle title="바로가기" />
          <QueryState query={me}>
            {(data) =>
              // 명세서 S-401: 재직중이 아니면 재직증명서 메뉴를 노출하지 않는다.
              data.summary.employmentStatus === 'ACTIVE' ? (
                <>
                  <ListRow
                    label="연차"
                    value="현황·신청"
                    variant="nav"
                    onPress={() => router.push('/leave')}
                  />
                  <ListRow
                    label="재직증명서"
                    value="바로 발급"
                    variant="nav"
                    onPress={() => router.push('/certificate')}
                  />
                </>
              ) : (
                <Text style={styles.empty}>지금 들어갈 수 있는 화면이 없어요.</Text>
              )
            }
          </QueryState>
        </Section>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  empty: { ...typography.bodySmall, color: colors.textWeak },
});
