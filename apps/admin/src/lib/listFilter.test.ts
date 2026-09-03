import { describe, expect, it } from 'vitest';
import { departmentOptions, matchesKeyword } from './listFilter';

/**
 * 화면에서 거르는 목록의 공통 규칙. 서버가 통째로 주는 목록에만 쓴다.
 *
 * **거르기만 한다.** 업무 판정을 여기서 하지 않는다 (`CLAUDE.md` 3장).
 */

describe('matchesKeyword', () => {
  it('일부만 겹쳐도 찾는다', () => {
    expect(matchesKeyword('민준', '김민준')).toBe(true);
    expect(matchesKeyword('김', '김민준')).toBe(true);
  });

  it('여러 값 중 하나만 걸려도 통과다', () => {
    expect(matchesKeyword('2024', '김민준', 'E2024001')).toBe(true);
  });

  it('겹치는 값이 없으면 거른다', () => {
    expect(matchesKeyword('박세희', '김민준', 'E2024001')).toBe(false);
  });

  // 부르는 쪽에서 빈 검색어를 따로 가려낼 필요가 없어야 한다.
  it('검색어가 비어 있으면 전부 통과다', () => {
    expect(matchesKeyword('', '김민준')).toBe(true);
    expect(matchesKeyword('   ', '김민준')).toBe(true);
  });

  it('앞뒤 공백을 지우고 본다', () => {
    expect(matchesKeyword('  민준  ', '김민준')).toBe(true);
  });

  it('대소문자를 무시한다', () => {
    expect(matchesKeyword('e2024', 'E2024001')).toBe(true);
    expect(matchesKeyword('E2024', 'e2024001')).toBe(true);
  });

  // 값이 비어 있는 줄이 검색 때 터지면 안 된다.
  it('값이 없어도 터지지 않는다', () => {
    expect(matchesKeyword('민준', null, undefined)).toBe(false);
    expect(matchesKeyword('', null, undefined)).toBe(true);
  });

  it('볼 값을 안 넘기면 걸릴 것이 없다', () => {
    expect(matchesKeyword('민준')).toBe(false);
  });
});

describe('departmentOptions', () => {
  const rows = [
    { department: '생산' },
    { department: '개발' },
    { department: '생산' },
    { department: '품질' },
  ];

  it('맨 앞에 전체를 둔다', () => {
    expect(departmentOptions(rows, (row) => row.department)[0]).toEqual({
      value: '',
      label: '전체',
    });
  });

  it('같은 부서를 한 번만 담는다', () => {
    const options = departmentOptions(rows, (row) => row.department);
    expect(options.map((option) => option.value)).toEqual(['', '개발', '생산', '품질']);
  });

  it('가나다순으로 세운다', () => {
    const options = departmentOptions(
      [{ department: '해외영업' }, { department: '개발' }, { department: '품질관리' }],
      (row) => row.department,
    );
    expect(options.map((option) => option.label)).toEqual(['전체', '개발', '품질관리', '해외영업']);
  });

  // 부서가 비어 있는 줄은 옵션을 만들지 않는다. `전체` 로 두면 그 줄도 같이 보인다.
  it('부서가 없는 줄은 옵션을 만들지 않는다', () => {
    const options = departmentOptions(
      [{ department: '개발' }, { department: null }, { department: '' }],
      (row) => row.department,
    );
    expect(options.map((option) => option.value)).toEqual(['', '개발']);
  });

  it('줄이 아직 안 왔어도 전체는 고를 수 있다', () => {
    expect(departmentOptions(undefined, (row: { department: string }) => row.department)).toEqual([
      { value: '', label: '전체' },
    ]);
  });
});
