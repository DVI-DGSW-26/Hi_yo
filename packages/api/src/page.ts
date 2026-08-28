/**
 * 목록 응답의 공통 봉투. 배열이 아니라 이 모양으로 온다.
 *
 * `page`는 0부터다. **급여 엔드포인트만 예외적으로 배열을 그대로 준다**
 * (docs/API_급여.md 1장).
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** 목록 요청의 공통 파라미터. 서버는 Spring Pageable을 평평한 쿼리로 받는다. */
export interface PageParams {
  page?: number;
  size?: number;
  sort?: string[];
}

/**
 * 한 번에 받을 수 있는 최대 개수. **서버가 이 값으로 잘라 준다.**
 *
 * 더 큰 값을 보내도 오류가 나지 않는다 — 조용히 100으로 깎여서 온다
 * (2026-08-28 실호출 확인. `size=101`·`150`·`500` 모두 응답 `size=100`).
 *
 * **"한 번에 다 받자"는 코드를 쓰지 않는다.** 직원이 100명을 넘으면 뒤가 잘리는데
 * 오류도 없어서 아무도 모른다. 목록은 `totalPages`를 보고 넘기거나, 다 받아야 하는
 * 자리라면 이 크기로 여러 번 받는다.
 */
export const MAX_PAGE_SIZE = 100;
