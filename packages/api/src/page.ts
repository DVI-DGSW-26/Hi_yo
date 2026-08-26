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
