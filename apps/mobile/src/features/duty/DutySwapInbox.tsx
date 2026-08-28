import { View } from 'react-native';
import { ListRow, QueryState, SectionTitle } from '@/components';
import { formatServerDateTime } from '@/lib/format';
import type { DutySwap } from './api';
import { swapTitle } from './labels';

interface Props {
  swaps: { isPending: boolean; error: Error | null; data: DutySwap[] | undefined };
  onPressSwap: (swap: DutySwap) => void;
}

/**
 * 나에게 온 교체 요청.
 *
 * **화면 인벤토리에 없던 자리다.** 명세서 흐름이 "상대방 동의"를 필수로 두고 알림도
 * 상대방에게 가는데 동의를 누를 데가 없었다 (`docs/00_문서_인덱스.md` — S-503 교체 동의 화면).
 *
 * 서버가 **마감 임박 순**으로 준다. 앱에서 다시 정렬하지 않는다.
 * 24시간 안에 답하지 않으면 자동으로 반려되고 원 담당자가 유지된다.
 */
export function DutySwapInbox({ swaps, onPressSwap }: Props) {
  return (
    <View>
      <SectionTitle title="나에게 온 부탁" />
      <QueryState query={swaps} empty="답할 부탁이 없어요.">
        {(data) =>
          data.map((swap) => (
            <ListRow
              key={swap.id}
              label={swapTitle(swap)}
              value={requesterText(swap)}
              variant="nav"
              onPress={() => onPressSwap(swap)}
            />
          ))
        }
      </QueryState>
    </View>
  );
}

/** `민수님 · 8.29 14:20까지` — 누가 부탁했고 언제까지 답해야 하는지 */
function requesterText(swap: DutySwap): string {
  const who = `${swap.requesterName ?? '동료'}님`;
  if (swap.expiresAt === null) return who;
  return `${who} · ${formatServerDateTime(swap.expiresAt, 'M.d HH:mm')}까지`;
}
