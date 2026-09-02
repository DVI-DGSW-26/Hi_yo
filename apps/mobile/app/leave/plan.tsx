import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatLeaveDays } from '@hr/format';
import { colors, spacing, typography } from '@hr/tokens';
import {
  Button,
  Calendar,
  ListRow,
  QueryState,
  Section,
  SectionDivider,
  SectionTitle,
  SignaturePad,
} from '@/components';
import { useLeaveBalance, useLeaveCalendar } from '@/features/leave/api';

/**
 * S-302 연차사용계획서
 *
 * 이 화면이 전달할 단 하나의 메시지 — **남은 연차를 언제 쓸지 달력에서 고른다.**
 *
 * 회사 서식(「연차사용계획서 [1차]」)을 그대로 옮긴 화면이다 — 총 연차·사용·잔여를
 * 보여주고, 달력에서 날짜를 고르고, 사용계획일수를 센다.
 * **서식에 「날짜 선택할 수 있는 달력 필요!」라는 메모가 붙어 있었다** (2026-09-02).
 * 종이의 ②(음영은 휴무일)는 달력이 대신하므로 옮기지 않았다.
 *
 * **제출 버튼이 없다. 낼 곳이 아직 없기 때문이다.**
 * `GET /v3/api-docs`의 63개 경로에 촉진·계획서가 하나도 없다 — 계획서를 낼 경로도,
 * 서명을 붙일 자리도 없다 (`docs/API_연차.md` 10장, 물어볼 것 11·12번).
 * **없는 엔드포인트를 부르는 코드를 쓰지 않는다** (`CLAUDE.md` 4장).
 * 경로가 열리면 붙일 것은 셋이다 — 제출 뮤테이션, 서명, 그리고 S-301에서 이 화면으로
 * 들어오는 줄. **그때까지 어디에서도 이 화면으로 보내지 않는다** — 낼 수 없는 화면을
 * 직원에게 보여주지 않는다.
 *
 * **공휴일을 달력에 깔지 않았다.** `Calendar`가 날짜당 점 하나를 그리는데 그 자리는
 * 이미 낸 연차가 쓴다. 고르는 것을 막지도 않는다 — 판정은 서버가 한다 (S-301과 같은 원칙).
 */

/** 서식의 표기. 연차는 1, 반차는 0.5다 (`docs/API_연차.md` 10장) */
type PlanKind = 'FULL' | 'HALF';

const HALF_DAY = 0.5;

export default function LeavePlanScreen() {
  const [month, setMonth] = useState(() => new Date());
  const [picked, setPicked] = useState<Record<string, PlanKind>>({});
  const [signature, setSignature] = useState('');

  const balance = useLeaveBalance();
  const calendar = useLeaveCalendar(
    format(startOfMonth(month), 'yyyy-MM-dd'),
    format(endOfMonth(month), 'yyyy-MM-dd'),
  );

  const dates = Object.keys(picked).sort();
  const planned = dates.reduce((sum, iso) => sum + (picked[iso] === 'HALF' ? HALF_DAY : 1), 0);

  /** 한 번 누르면 연차, 두 번이면 반차, 세 번이면 뺀다 */
  function cycle(iso: string) {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[iso] === undefined) next[iso] = 'FULL';
      else if (next[iso] === 'FULL') next[iso] = 'HALF';
      else delete next[iso];
      return next;
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: '연차사용계획서' }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section>
          {/* 서식 머리말을 그대로 옮겼다. 앱이 문구를 만들지 않는다 */}
          <Text style={styles.lead}>
            쓰지 않은 연차는 다음 해로 넘어가지도, 수당으로 나오지도 않고 그해 12월 31일에
            사라져요. 아래에서 쉬려는 날을 고르고 계획서를 내주세요.
          </Text>
        </Section>

        <SectionDivider />

        <Section>
          <SectionTitle title="내 연차" />
          <QueryState query={balance}>
            {(data) => (
              <>
                <ListRow label="총 연차" value={formatLeaveDays(data.granted)} />
                <ListRow label="사용" value={formatLeaveDays(data.used)} />
                <ListRow label="잔여" value={formatLeaveDays(data.remaining)} />
              </>
            )}
          </QueryState>
        </Section>

        <SectionDivider />

        <Section>
          <SectionTitle title={format(month, 'yyyy년 M월')} />
          <Text style={styles.hint}>
            누르면 연차, 한 번 더 누르면 반차, 또 누르면 빠져요.
          </Text>

          {/* 이미 낸 연차를 점으로 깐다. 서버가 준 것을 그대로 찍는다 */}
          <QueryState query={calendar}>
            {(data) => (
              <Calendar
                month={month}
                markers={Object.fromEntries(
                  data.map((entry) => [entry.date, entry.days === HALF_DAY ? 'half' : 'full']),
                )}
                selected={dates.filter((iso) => isSameMonth(parseISO(iso), month))}
                onPressDate={cycle}
              />
            )}
          </QueryState>

          <View style={styles.monthNav}>
            <View style={styles.navButton}>
              <Button
                label="이전 달 보기"
                variant="secondary"
                size="inline"
                onPress={() => setMonth(subMonths(month, 1))}
              />
            </View>
            <View style={styles.navButton}>
              <Button
                label="다음 달 보기"
                variant="secondary"
                size="inline"
                onPress={() => setMonth(addMonths(month, 1))}
              />
            </View>
          </View>
        </Section>

        <SectionDivider />

        <Section>
          <SectionTitle title="고른 날" />

          {dates.length === 0 ? (
            <Text style={styles.hint}>아직 고른 날이 없어요.</Text>
          ) : (
            dates.map((iso) => (
              <ListRow
                key={iso}
                label={dayLabel(iso)}
                value={picked[iso] === 'HALF' ? '반차' : '연차'}
              />
            ))
          )}

          <ListRow label="사용계획일수" value={formatLeaveDays(planned)} />

          {/* 서식의 ③·④를 옮겼다 */}
          <Text style={styles.note}>
            고른 날을 바꾸려면 3일 전까지 담당자에게 말해주세요. 적어 낸 날은 그 달 안에
            모두 써야 해요.
          </Text>
        </Section>

        <SectionDivider />

        <Section>
          <SectionTitle title="서명" />
          {/*
            서식의 「제출자 : ______ (서명 또는 인)」 자리다.
            **보낼 곳이 아직 없다** — 계획서를 낼 경로도 서명을 붙일 자리도 없다.
            경로가 열리면 이 값을 그대로 실어 보낸다 (물어볼 것 11·12번).
          */}
          <SignaturePad label="제출자 서명" value={signature} onChange={setSignature} />
        </Section>
      </ScrollView>
    </>
  );
}

/** `9월 3일 (목)`. `date-fns` 로케일을 더하지 않고 요일만 우리 배열에서 꺼낸다 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dayLabel(iso: string): string {
  const date = parseISO(iso);
  return `${format(date, 'M월 d일')} (${WEEKDAYS[getDay(date)]})`;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.sectionY },
  lead: { ...typography.bodySmall, color: colors.textBody },
  hint: { ...typography.label, color: colors.textWeak, marginBottom: spacing.tight },
  note: { ...typography.label, color: colors.textWeak, marginTop: spacing.tight },
  monthNav: { flexDirection: 'row', gap: spacing.tight, marginTop: spacing.rowGap },
  navButton: { flex: 1 },
});
