/**
 * 화면에서 거르는 목록의 공통 규칙.
 *
 * **서버가 통째로 주는 목록에만 쓴다.** 쪽으로 잘려 오는 목록(직원 `GET /employees`,
 * 결재 `GET /requests/pending`)을 화면에서 거르면 **보고 있는 쪽 안에서만 걸러진다** —
 * 다음 쪽에 있는 사람은 없는 것처럼 보인다. 그런 목록은 서버 파라미터로 거른다
 * (`DESIGN_ADMIN.md` 8장이 표 정렬을 같은 이유로 서버가 지원하는 열에만 허용한다).
 *
 * **거르기만 한다.** 업무 판정을 여기서 하지 않는다 (`CLAUDE.md` 3장). 서버가 준
 * 참·거짓과 값을 그대로 보고 고를 뿐이다.
 */

/**
 * 이름·사번처럼 눈으로 찾는 값에 쓴다.
 *
 * 앞뒤 공백을 지우고 대소문자를 무시한다. 검색어가 비어 있으면 전부 통과다 —
 * 부르는 쪽에서 빈 검색어를 따로 가려낼 필요가 없다.
 */
export function matchesKeyword(
  keyword: string,
  ...values: (string | null | undefined)[]
): boolean {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return true;
  return values.some((value) => (value ?? '').toLowerCase().includes(needle));
}

/**
 * 받은 줄에서 부서 목록을 만든다.
 *
 * **마스터(`GET /departments`)를 따로 부르지 않는다.** 이 표에 없는 부서를 골라
 * 빈 표를 보게 할 이유가 없고, 부서 마스터의 `id`와 줄의 부서 **이름**을 맞춰야 하는
 * 문제도 생기지 않는다 (같은 문제로 A-102 수정 화면이 막혀 있다).
 *
 * 부서가 비어 있는 줄은 옵션을 만들지 않는다. `전체`로 두면 그 줄도 같이 보인다.
 */
export function departmentOptions<T>(
  rows: T[] | undefined,
  pick: (row: T) => string | null | undefined,
): { value: string; label: string }[] {
  const names = new Set<string>();
  for (const row of rows ?? []) {
    const name = pick(row);
    if (name) names.add(name);
  }

  return [
    { value: '', label: '전체' },
    ...[...names]
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .map((name) => ({ value: name, label: name })),
  ];
}
