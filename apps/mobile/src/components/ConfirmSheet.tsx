import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@hr/tokens';
import { Button } from './Button';
import { MutationError } from './MutationError';
import { Sheet } from './Sheet';

interface Props {
  open: boolean;
  title: string;
  /**
   * **무엇이 일어나는지 구체적으로 적는다.** `정말 하시겠어요?` (X)
   * → `취소하면 상대방에게 간 부탁도 같이 사라져요.` (O)
   *
   * 되돌릴 수 없으면 그 사실을 여기에 적는다 (`DESIGN_ADMIN.md` 6장과 같은 기준).
   */
  description: string;
  /** 동작을 적는다. `확인` (X) → `취소하기` (O) */
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  /** 진행 중인 뮤테이션. 실패하면 오류가 버튼 위에 붙는다 */
  mutation?: { isPending: boolean; error: Error | null };
}

/**
 * 되돌릴 수 없는 동작을 한 번 더 묻는다.
 *
 * **모바일에는 `danger` 버튼이 없다.** 실행 버튼은 `primary`다 — 색으로 겁주는 대신
 * 문구로 무엇이 사라지는지 알린다 (`DESIGN_SYSTEM.md` 5장에 `danger` 변형이 없다).
 * 관리팀 화면은 표 안에서 위험한 줄을 골라내야 해서 `danger`를 두지만, 여기는 시트가
 * 이미 그 동작 하나만 놓고 묻는 자리라 색을 더 쓸 이유가 없다.
 *
 * **그린 예산은 시트를 따로 센다.** 시트가 떠 있는 동안 뒤 화면은 누를 수 없어서
 * 한 번에 보이는 `primary`는 여전히 하나다.
 *
 * 왼쪽은 `닫기`다. `취소`가 아니다 — 취소가 동작 이름인 화면이 있어서 겹친다
 * (`DESIGN_SYSTEM.md` 7장).
 */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  mutation,
}: Props) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <Text style={styles.description}>{description}</Text>

      {mutation && <MutationError mutation={mutation} />}

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label="닫기" variant="secondary" onPress={onClose} />
        </View>
        <View style={styles.action}>
          <Button label={confirmLabel} loading={mutation?.isPending} onPress={onConfirm} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  description: {
    ...typography.body,
    color: colors.textBody,
    marginBottom: spacing.sectionTitleGap,
  },
  actions: { flexDirection: 'row', gap: spacing.rowGap },
  action: { flex: 1 },
});
