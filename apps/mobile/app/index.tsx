import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '@hr/tokens';
import { ListRow, QueryState, Section, SectionTitle } from '@/components';
import { useMe } from '@/features/employees/api';

/**
 * 임시 진입점이다. 홈 화면(S-101 마이페이지 포함) 상세 스펙이 확정되면 이 파일을 대체한다.
 * 지금은 만들어진 화면으로 들어가는 통로 역할만 한다.
 *
 * **하단 탭을 두지 않는다** (2026-08-28 확정). 본인용 8개 화면 중 3개만 만들어져 있어서
 * 지금 탭을 나누면 절반이 빈 탭이 되고, S-101 스펙이 나오면 어차피 다시 짠다.
 * 화면이 늘면 이 목록에 줄을 늘리다가, 스펙이 확정될 때 홈째로 바꾼다.
 *
 * **재직 상태로 막는 것은 재직증명서 하나뿐이다.** 명세서 S-401의 "재직중 상태가 아닌 경우
 * 메뉴 자체 비노출"은 그 화면에 대한 규칙이다. 연차·당직까지 같이 감추면 휴직 중인 사람이
 * 아무것도 못 보는데, 그렇게 하라는 근거가 문서에 없다.
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
            {(data) => (
              <>
                <ListRow
                  label="연차"
                  value="현황·신청"
                  variant="nav"
                  onPress={() => router.push('/leave')}
                />
                {/* 명세서 S-401 — 재직중이 아니면 이 줄만 그리지 않는다. */}
                {data.summary.employmentStatus === 'ACTIVE' && (
                  <ListRow
                    label="재직증명서"
                    value="바로 발급"
                    variant="nav"
                    onPress={() => router.push('/certificate')}
                  />
                )}
                <ListRow
                  label="당직"
                  value="일정·교체"
                  variant="nav"
                  onPress={() => router.push('/duty')}
                />
              </>
            )}
          </QueryState>
        </Section>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
});
