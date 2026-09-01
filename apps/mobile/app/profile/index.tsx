import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { ListRow, QueryState, Section, SectionDivider, SectionTitle } from '@/components';
import { useMe } from '@/features/employees/api';
import { formatServerDate } from '@/lib/format';

/**
 * S-101 마이페이지 — 인사정보 조회
 *
 * 이 화면이 전달할 단 하나의 메시지 — **내 인사정보가 이렇게 등록돼 있다.**
 *
 * **무엇을 보여줄지는 기획이 골랐다** (2026-09-01). `GET /employees/me`가 주는 26개 중
 * 인사 기본 · 소속·입사 · 계좌 · 외국인 항목 · 내부 판정값을 둔다.
 * **개인 항목(생년월일·성별·연락처·이메일·주소·비상연락처)은 뺐다** — 어깨너머로 보이는
 * 자리에 둘 이유가 없다는 판단이다.
 *
 * 그 결정으로 마스킹 확인이 걸린 값이 **계좌번호 하나로 줄었다.** 서버가 마스킹해서
 * 준다는 전제로 받은 값을 그대로 그린다 — 앱에서 가리거나 풀지 않는다 (`CLAUDE.md` 2장).
 * 인증이 풀리면 실제로 마스킹돼 오는지부터 확인한다.
 *
 * **통장정보 수정은 만들지 않았다.** `PUT /employees/{id}/bank-account`가 은행명·계좌번호·
 * 예금주 셋을 다 받는데, 그중 무엇이 마스킹돼 오는지와 일부만 보내면 나머지가 지워지는지가
 * 확인되지 않았다. 마스킹된 값을 되돌려 보내면 **급여가 엉뚱한 계좌로 간다**
 * (`docs/01_물어볼_것.md` 서버 10번).
 */
export default function ProfileScreen() {
  const me = useMe();

  return (
    <>
      <Stack.Screen options={{ title: '내 정보' }} />
      <ScrollView style={styles.flex}>
        <QueryState query={me} wrapState={(state) => <Section>{state}</Section>}>
          {(data) => {
            const { summary } = data;

            return (
              <>
                <Section>
                  <SectionTitle title="기본" />
                  <ListRow label="이름" value={summary.name} />
                  {/* 내국인에게는 빈 칸으로 보이는 값이라 있을 때만 그린다. */}
                  {summary.legalName !== null && (
                    <ListRow label="정식 성명" value={summary.legalName} />
                  )}
                  {summary.nationality !== null && (
                    <ListRow label="국적" value={summary.nationality} />
                  )}
                  <ListRow
                    label="사번"
                    value={summary.employeeNo ?? undefined}
                    placeholder="아직이에요"
                  />
                  <ListRow
                    label="부서"
                    value={summary.departmentName ?? undefined}
                    placeholder="아직이에요"
                  />
                  <ListRow
                    label="직무"
                    value={summary.jobName ?? undefined}
                    placeholder="아직이에요"
                  />
                  <ListRow
                    label="직급"
                    value={summary.jobGrade ?? undefined}
                    placeholder="아직이에요"
                  />
                </Section>

                <SectionDivider />

                <Section>
                  <SectionTitle title="소속·입사" />
                  <ListRow
                    label="법인"
                    value={summary.corporation ?? undefined}
                    placeholder="아직이에요"
                  />
                  <ListRow
                    label="사업장"
                    value={summary.workSite ?? undefined}
                    placeholder="아직이에요"
                  />
                  <ListRow label="입사일" value={dateText(summary.hireDate)} />
                  {/* 재입사한 사람만 두 날짜가 다르다. 같으면 한 줄로 충분하다. */}
                  {summary.originalHireDate !== null &&
                    summary.originalHireDate !== summary.hireDate && (
                      <ListRow label="최초 입사일" value={dateText(summary.originalHireDate)} />
                    )}
                  <ListRow
                    label="재직상태"
                    value={summary.employmentStatusLabel ?? undefined}
                    placeholder="아직이에요"
                  />
                  {summary.resignDate !== null && (
                    <ListRow label="퇴사일" value={dateText(summary.resignDate)} />
                  )}
                </Section>

                <SectionDivider />

                <Section>
                  <SectionTitle title="계좌" />
                  <ListRow
                    label="은행"
                    value={data.bankAccount?.bankName ?? undefined}
                    placeholder="아직이에요"
                  />
                  {/* 서버가 마스킹한 값을 그대로 그린다. 앱에서 가리거나 풀지 않는다. */}
                  <ListRow
                    label="계좌번호"
                    value={data.bankAccount?.bankAccount ?? undefined}
                    placeholder="아직이에요"
                  />
                  <ListRow
                    label="예금주"
                    value={data.bankAccount?.accountHolder ?? undefined}
                    placeholder="아직이에요"
                  />
                  <Text style={styles.note}>
                    지금은 앱에서 바꿀 수 없어요. 계좌를 바꾸려면 관리팀에 알려주세요.
                  </Text>
                </Section>

                <SectionDivider />

                <Section>
                  <SectionTitle title="그 밖에" />
                  {/* 직원 목록·등록 화면이 쓰는 문구와 같게 둔다. */}
                  <ListRow label="급여계산 대상" value={summary.payrollTarget ? '대상' : '아님'} />
                  <ListRow
                    label="주민등록번호"
                    value={summary.residentNoRegistered ? '등록됐어요' : '아직이에요'}
                  />
                  {!summary.residentNoRegistered && (
                    <Text style={styles.note}>
                      재직증명서에 주민등록번호가 들어가야 하면 관리팀에 알려주세요.
                    </Text>
                  )}
                </Section>
              </>
            );
          }}
        </QueryState>
      </ScrollView>
    </>
  );
}

/** 서버 날짜를 `2026년 8월 24일`로. 없으면 빈 칸이 아니라 무엇이 없는지 적는다 */
function dateText(value: string | null): string {
  return value === null ? '아직이에요' : formatServerDate(value, 'yyyy년 M월 d일');
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  note: { ...typography.label, color: colors.textWeak },
});
