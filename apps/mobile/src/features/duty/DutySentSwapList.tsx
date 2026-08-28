import { View } from 'react-native';
import { ListRow, QueryState, SectionTitle, StatusText } from '@/components';
import type { DutySwap } from './api';
import { swapStatusLabel, swapStatusTone, swapTitle } from './labels';

interface Props {
  swaps: { isPending: boolean; error: Error | null; data: DutySwap[] | undefined };
}

/**
 * 내가 보낸 교체 요청.
 *
 * **`답이 없어 지났어요`(EXPIRED)와 `거절했어요`(REJECTED)를 구분해 보여준다.**
 * API가 요구하는 구분이다 — 못 본 것이면 다시 부탁하거나 다른 사람에게 부탁할 수 있고,
 * 거절당한 것이면 그 사람에게 다시 부탁할 일이 아니다. 명세서는 둘 다 '자동반려'로만 적고 있다.
 *
 * 취소(`DELETE /duty/swaps/{id}`)는 붙이지 않았다. 되돌릴 수 없는 동작이라 확인 단계가
 * 필요한데 모바일 `src/components`에 대화상자가 없다. 만들기 전에 사람에게 묻는다
 * (`DESIGN_RULES.md` 1장 3번). `useCancelSwap`은 `api.ts`에 준비돼 있다.
 */
export function DutySentSwapList({ swaps }: Props) {
  return (
    <View>
      <SectionTitle title="내가 부탁한 것" />
      <QueryState query={swaps} empty="아직 부탁한 게 없어요.">
        {(data) =>
          data.map((swap) => (
            <ListRow
              key={swap.id}
              label={`${swapTitle(swap)} · ${swap.targetName ?? '동료'}님`}
              right={
                <StatusText
                  label={swapStatusLabel(swap.status)}
                  tone={swapStatusTone(swap.status)}
                />
              }
            />
          ))
        }
      </QueryState>
    </View>
  );
}
