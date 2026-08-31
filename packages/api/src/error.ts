import type { AxiosError } from 'axios';

/**
 * 서버 오류를 화면이 그대로 쓸 수 있는 하나의 형태로 바꾼다.
 *
 * 서버 오류 응답은 전부 같은 모양이고 `message`는 **사용자에게 그대로 보여줘도 되는 한국어**다.
 * (docs/API_급여.md 1장) 앱에서 문구를 새로 만들지 않는다.
 *
 * 응답 본문을 이 객체에 담지 않는다. 급여액·주민번호·계좌번호가 섞여 있을 수 있고
 * Error 객체는 크래시 리포트에 그대로 실린다. 담는 것은 status와 message뿐이다.
 *
 * 모바일과 관리팀 화면이 같은 서버를 본다. 오류 규칙이 바뀌면 여기 한 곳만 고친다.
 */

/** 서버가 주는 오류 응답. 모든 엔드포인트가 같은 모양이다. */
interface ServerErrorBody {
  status?: number;
  error?: string;
  message?: string;
  path?: string;
}

export type ApiErrorKind =
  /** 연결 자체가 안 됐다. 응답이 없다 */
  | 'network'
  /** 응답이 시간 안에 오지 않았다 */
  | 'timeout'
  /** 401. 인증이 없거나 만료됐다 */
  | 'unauthorized'
  /** 403. 권한이 없다 */
  | 'forbidden'
  /** 404 */
  | 'notFound'
  /** 422. 값이 아니라 업무 규칙 위반이다 — 잔여 부족, 마감된 기간 수정 등 */
  | 'rule'
  /** 그 밖의 4xx. 값 검증 실패(400)가 여기 들어온다 */
  | 'badRequest'
  /** 5xx */
  | 'server'
  | 'unknown';

/**
 * 문구가 확정되지 않은 상황의 기본값이다. (DESIGN_SYSTEM.md 7장)
 *
 * TODO: 상황별 문구(연결 끊김 / 응답 지연 / 저장 실패)는 DESIGN_RULES.md 6장이
 * 비어 있어 정해지지 않았다. 확정되면 아래 표에 줄을 늘린다.
 */
export const FALLBACK_ERROR_MESSAGE = '지금은 불러올 수 없어요.';

/**
 * 서버가 문구를 주지 않았을 때, **상황이 분명한 것만** 따로 적는다.
 *
 * 401은 다시 눌러도 풀리지 않는다. `지금은 불러올 수 없어요`는 잠깐 안 되는 것처럼 읽혀서
 * 사용자가 새로고침만 반복하게 된다. 무엇을 해야 하는지 말해야 한다.
 *
 * 서버가 `message`를 주면 그것이 이긴다 — 서버 문구는 사용자에게 그대로 보여줘도 되는
 * 한국어다 (docs/API_급여.md 1장). 여기 있는 것은 본문이 비어 있을 때의 값이다.
 * 개발 서버의 401이 실제로 본문 없이 온다 (2026-08-31 확인).
 *
 * **`403`은 넣지 않았다.** 권한이 없는 것인지 화면을 잘못 연 것인지가 응답으로 갈라지지
 * 않는다 — 당직 명단 조회처럼 스펙과 실제 권한이 어긋난 경우도 있다 (docs/API_당직.md 7장).
 * 문구를 지어내지 않고 기본값으로 둔다.
 */
const KIND_FALLBACK_MESSAGE: Partial<Record<ApiErrorKind, string>> = {
  // 로그인이 만료된 경우와 아직 한 적 없는 경우가 같은 401로 온다. 둘 다 맞는 말로 적는다.
  // 로그인 화면이 생기면 `다시 로그인해주세요`처럼 갈 곳을 같이 적는다.
  unauthorized: '로그인이 필요해요.',
};

function fallbackFor(kind: ApiErrorKind): string {
  return KIND_FALLBACK_MESSAGE[kind] ?? FALLBACK_ERROR_MESSAGE;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP 상태. 응답을 못 받았으면 undefined */
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }

  /** 업무 규칙 위반(422)인가. 값 검증 실패(400)와 다르게 다뤄야 한다 */
  get isRuleViolation(): boolean {
    return this.kind === 'rule';
  }

  /** 다시 시도해서 풀릴 여지가 있는가. 쿼리 재시도 판단에 쓴다 */
  get isRetryable(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'server';
  }
}

/** axios 오류를 ApiError로 바꾼다. 응답 인터셉터에서만 부른다. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (!isAxiosError(error)) {
    return new ApiError('unknown', FALLBACK_ERROR_MESSAGE);
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError('timeout', FALLBACK_ERROR_MESSAGE);
  }

  const status = error.response?.status;
  if (status === undefined) {
    return new ApiError('network', FALLBACK_ERROR_MESSAGE);
  }

  const kind = kindOf(status);
  return new ApiError(kind, serverMessage(error.response?.data, kind), status);
}

function kindOf(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 422) return 'rule';
  if (status >= 500) return 'server';
  if (status >= 400) return 'badRequest';
  return 'unknown';
}

/**
 * 서버가 준 한국어 문구를 꺼낸다. 없으면 기본 문구로 떨어진다.
 *
 * 본문의 다른 필드는 꺼내지 않는다. 오류 본문에 무엇이 실릴지 앱이 알 수 없고,
 * 여기서 꺼낸 값은 화면과 크래시 리포트로 그대로 나간다.
 */
function serverMessage(data: unknown, kind: ApiErrorKind): string {
  if (typeof data !== 'object' || data === null) return fallbackFor(kind);

  const message = (data as ServerErrorBody).message;
  if (typeof message !== 'string' || message.trim() === '') return fallbackFor(kind);

  return message;
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && (error as AxiosError).isAxiosError === true;
}
