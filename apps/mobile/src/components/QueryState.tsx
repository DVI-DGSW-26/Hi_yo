import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors, typography } from '@hr/tokens';

/**
 * 쿼리 하나의 로딩 · 오류 · 빈 상태를 한자리에서 그린다.
 *
 * **세 가지를 반드시 구현한다** (`CLAUDE.md` 4장). 화면마다 손으로 분기하면 하나를 빠뜨리고,
 * 실제로 같은 스타일 정의가 파일마다 복사돼 있었다. 여기 한 곳만 고치면 전부 같이 바뀐다.
 *
 * 오류 문구는 **서버가 준 한국어를 그대로 쓴다.** 앱에서 문구를 새로 만들지 않는다 —
 * `ApiError`가 서버 `message`를 꺼내고, 없으면 `지금은 불러올 수 없어요.`로 떨어진다
 * (`packages/api`의 `FALLBACK_ERROR_MESSAGE`).
 */
interface Props<T> {
  /** TanStack Query 결과를 그대로 넘긴다 */
  query: { isPending: boolean; error: Error | null; data: T | undefined };
  /**
   * 목록이 비었을 때의 문구. **무엇이 없는지 적는다** —
   * `데이터 없음` (X) → `아직 낸 신청이 없어요` (O).
   *
   * 비우면 빈 상태를 판정하지 않는다. 단건 조회처럼 "비었다"가 없는 쿼리에 쓴다.
   */
  empty?: string;
  /**
   * 로딩 · 오류 · 빈 상태를 감쌀 것. 화면 여백이 필요한 자리에서 `<Section>`을 넘긴다.
   * 이미 `Section` 안에 있는 자리에서는 비운다 — 겹치면 여백이 두 배가 된다.
   */
  wrapState?: (state: ReactNode) => ReactNode;
  children: (data: T) => ReactNode;
}

export function QueryState<T>({ query, empty, wrapState, children }: Props<T>): ReactNode {
  const wrap = wrapState ?? ((state: ReactNode) => state);

  if (query.isPending) return wrap(<ActivityIndicator color={colors.textDisabled} />);

  // 재조회가 실패하면 남아 있는 값 대신 오류를 보여준다. 급여·연차 화면이라
  // 틀린 값을 보고 있는 줄 모르는 편이 더 위험하다.
  if (query.error) return wrap(<Text style={styles.error}>{query.error.message}</Text>);

  // 로딩도 오류도 아닌데 값이 없는 경우는 없다. 타입을 좁히려고 둔다.
  if (query.data === undefined) return wrap(<ActivityIndicator color={colors.textDisabled} />);

  if (empty !== undefined && isEmpty(query.data)) {
    return wrap(<Text style={styles.empty}>{empty}</Text>);
  }

  return children(query.data);
}

/**
 * 목록이 비었는지. 배열과 목록 봉투(`content`) 둘 다 받는다 —
 * 급여만 배열을 그대로 주고 나머지는 봉투로 온다 (`packages/api`의 `PageResponse`).
 */
function isEmpty(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;

  if (typeof data === 'object' && data !== null) {
    const content = (data as { content?: unknown }).content;
    if (Array.isArray(content)) return content.length === 0;
  }

  return false;
}

const styles = StyleSheet.create({
  error: { ...typography.bodySmall, color: colors.danger },
  empty: { ...typography.bodySmall, color: colors.textWeak },
});
