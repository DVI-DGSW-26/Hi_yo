import { useState } from 'react';
import { View } from 'react-native';
import { ConfirmSheet, ListRow, QueryState, SectionTitle, StatusText } from '@/components';
import { useCancelSwap, type DutySwap } from './api';
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
 * **답을 기다리는 것만 취소할 수 있다.** 이미 답이 온 요청은 취소할 대상이 없다 —
 * 서버도 막지만 누를 수 있게 두면 매번 같은 오류만 본다.
 */
export function DutySentSwapList({ swaps }: Props) {
  const cancel = useCancelSwap();
  const [canceling, setCanceling] = useState<DutySwap>();

  return (
    <View>
      <SectionTitle title="내가 부탁한 것" />
      <QueryState query={swaps} empty="아직 부탁한 게 없어요.">
        {(data) =>
          data.map((swap) => (
            <ListRow
              key={swap.id}
              label={`${swapTitle(swap)} · ${swap.targetName ?? '동료'}님`}
              // 대기중인 것만 눌린다. 누르면 취소를 묻는다.
              onPress={swap.status === 'PENDING' ? () => setCanceling(swap) : undefined}
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

      <ConfirmSheet
        open={canceling !== undefined}
        title="부탁을 취소할까요"
        description={cancelDescription(canceling)}
        confirmLabel="취소하기"
        mutation={cancel}
        onClose={() => setCanceling(undefined)}
        onConfirm={() => {
          if (!canceling) return;
          cancel.mutate(canceling.id, { onSuccess: () => setCanceling(undefined) });
        }}
      />
    </View>
  );
}

/** 무엇이 사라지는지 적는다. `정말 취소할까요` 로 두지 않는다 */
function cancelDescription(swap: DutySwap | undefined): string {
  const who = swap?.targetName ?? '상대방';
  return `${who}님에게 간 부탁이 사라져요. 그 날 당직은 그대로 내가 서요. 다시 부탁하려면 새로 보내야 해요.`;
}
