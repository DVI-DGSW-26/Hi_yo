import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@hr/tokens';
import { ListRow } from './ListRow';
import { Sheet } from './Sheet';
import { StatusText } from './StatusText';

export interface SelectOption<T> {
  value: T;
  label: string;
  /** 이름만으로 구분이 안 될 때. 부서·시간처럼 곁들이는 값 */
  hint?: string;
}

interface Props<T> {
  open: boolean;
  title: string;
  options: SelectOption<T>[];
  /** 지금 고른 값. 없으면 아무것도 안 고른 상태다 */
  selected?: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  /** 고를 것이 없을 때. **무엇이 없는지 적는다** */
  empty?: string;
}

/**
 * 목록에서 하나를 고른다. 하단 시트 위에 `ListRow`를 쌓는다.
 *
 * **네이티브 피커를 쓰지 않는다.** iOS 휠과 안드로이드 메뉴는 모양이 서로 다르고
 * 디자인 시스템(글꼴·색·행 높이)이 닿지 않는다. 여기서는 이미 화면 전체가 쓰는
 * `ListRow`를 그대로 쌓아서 목록이 다른 화면과 같게 읽힌다.
 *
 * **고르면 바로 닫힌다.** 확인 버튼을 두지 않는다 — 고르는 것 말고 할 일이 없는 자리에서
 * 한 번 더 누르게 하면 손만 늘어난다. 잘못 골랐으면 다시 열어 다시 고른다.
 *
 * 고른 줄은 그린 `고름`으로 표시한다. 이 시트의 그린 1곳이다.
 */
export function SelectSheet<T extends string | number>({
  open,
  title,
  options,
  selected,
  onSelect,
  onClose,
  empty,
}: Props<T>) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {options.length === 0 ? (
        <Text style={styles.empty}>{empty ?? '고를 수 있는 게 없어요.'}</Text>
      ) : (
        options.map((option) => (
          <ListRow
            key={String(option.value)}
            label={option.label}
            variant="nav"
            onPress={() => {
              onSelect(option.value);
              onClose();
            }}
            // 곁들이는 값과 고름 표시가 같이 설 수 있어야 한다. 골랐다고 부서가 사라지면
            // 어느 사람을 골랐는지 다시 확인할 수가 없다.
            right={
              option.hint === undefined && option.value !== selected ? undefined : (
                <View style={styles.right}>
                  {option.hint !== undefined && <Text style={styles.hint}>{option.hint}</Text>}
                  {option.value === selected && <StatusText label="고름" tone="done" />}
                </View>
              )
            }
          />
        ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  empty: { ...typography.bodySmall, color: colors.textWeak },
  right: { alignItems: 'flex-end', flexShrink: 1 },
  hint: { ...typography.bodySmall, color: colors.textWeak },
});
