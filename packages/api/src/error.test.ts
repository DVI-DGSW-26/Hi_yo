import { describe, expect, it } from 'vitest';
import { ApiError, FALLBACK_ERROR_MESSAGE, toApiError } from './error';

/**
 * 서버 오류를 화면이 쓸 수 있는 하나의 형태로 바꾼다.
 *
 * **여기에는 보안 규칙이 하나 걸려 있다** — 응답 본문을 오류 객체에 담지 않는다.
 * `Error` 는 크래시 리포트에 그대로 실리고, 오류 본문에 급여액·주민번호·계좌번호가
 * 섞여 올 수 있다 (`CLAUDE.md` 2장).
 */

/** axios 오류 흉내. 실제 axios 를 띄우지 않고 판정만 본다 */
function axiosError(status: number | undefined, data?: unknown, code?: string) {
  return {
    isAxiosError: true,
    code,
    response: status === undefined ? undefined : { status, data },
  };
}

describe('상태 코드를 종류로 가른다', () => {
  it('401 은 인증이다', () => {
    expect(toApiError(axiosError(401)).kind).toBe('unauthorized');
  });

  it('403 은 권한이다', () => {
    expect(toApiError(axiosError(403)).kind).toBe('forbidden');
  });

  it('404 는 없는 것이다', () => {
    expect(toApiError(axiosError(404)).kind).toBe('notFound');
  });

  // 400 은 요청 형식, 422 는 업무 규칙 위반 (2026-08-31 서버 확인).
  it('422 는 업무 규칙 위반이고 400 과 다르다', () => {
    expect(toApiError(axiosError(422)).kind).toBe('rule');
    expect(toApiError(axiosError(400)).kind).toBe('badRequest');
    expect(toApiError(axiosError(422)).isRuleViolation).toBe(true);
    expect(toApiError(axiosError(400)).isRuleViolation).toBe(false);
  });

  it('5xx 는 서버다', () => {
    expect(toApiError(axiosError(500)).kind).toBe('server');
    expect(toApiError(axiosError(502)).kind).toBe('server');
  });

  it('응답이 아예 없으면 연결 문제다', () => {
    expect(toApiError(axiosError(undefined)).kind).toBe('network');
  });

  it('시간이 지나면 timeout 이다', () => {
    expect(toApiError(axiosError(undefined, undefined, 'ECONNABORTED')).kind).toBe('timeout');
    expect(toApiError(axiosError(undefined, undefined, 'ETIMEDOUT')).kind).toBe('timeout');
  });

  it('axios 오류가 아니면 unknown 이다', () => {
    expect(toApiError(new Error('아무거나')).kind).toBe('unknown');
    expect(toApiError('문자열').kind).toBe('unknown');
    expect(toApiError(undefined).kind).toBe('unknown');
  });

  it('이미 ApiError 면 그대로 둔다', () => {
    const original = new ApiError('rule', '잔여 연차가 모자라요.', 422);
    expect(toApiError(original)).toBe(original);
  });
});

describe('문구는 서버 것을 쓴다', () => {
  // 서버 `message` 는 사용자에게 그대로 보여줘도 되는 한국어다 (API_급여.md 1장).
  it('서버가 준 한국어를 그대로 쓴다', () => {
    expect(toApiError(axiosError(422, { message: '잔여 연차가 모자라요.' })).message).toBe(
      '잔여 연차가 모자라요.',
    );
  });

  it('본문이 없으면 기본 문구로 떨어진다', () => {
    expect(toApiError(axiosError(500)).message).toBe(FALLBACK_ERROR_MESSAGE);
    expect(toApiError(axiosError(500, {})).message).toBe(FALLBACK_ERROR_MESSAGE);
    expect(toApiError(axiosError(500, null)).message).toBe(FALLBACK_ERROR_MESSAGE);
  });

  it('빈 문자열도 없는 것으로 본다', () => {
    expect(toApiError(axiosError(500, { message: '   ' })).message).toBe(FALLBACK_ERROR_MESSAGE);
  });

  // 401 은 다시 눌러도 안 풀린다. `지금은 불러올 수 없어요` 는 잠깐 안 되는 것처럼 읽힌다.
  it('401 만 따로 적힌 문구가 있다', () => {
    expect(toApiError(axiosError(401)).message).toBe('로그인이 필요해요.');
  });

  it('401 이라도 서버 문구가 있으면 그것이 이긴다', () => {
    expect(toApiError(axiosError(401, { message: '계정이 잠겼어요.' })).message).toBe(
      '계정이 잠겼어요.',
    );
  });

  // 403 은 권한이 없는 것인지 화면을 잘못 연 것인지 응답으로 갈라지지 않는다.
  it('403 에는 지어낸 문구를 두지 않는다', () => {
    expect(toApiError(axiosError(403)).message).toBe(FALLBACK_ERROR_MESSAGE);
  });
});

describe('민감정보를 담지 않는다', () => {
  const body = {
    message: '급여를 계산할 수 없어요.',
    netPay: 3847200,
    residentNo: '901231-1234567',
    bankAccount: '110-234-567890',
    path: '/payroll/1',
  };

  it('오류 객체에 응답 본문이 남지 않는다', () => {
    const error = toApiError(axiosError(422, body));
    const dumped = JSON.stringify({ ...error, message: error.message, stack: error.stack });

    expect(dumped).not.toContain('3847200');
    expect(dumped).not.toContain('901231');
    expect(dumped).not.toContain('110-234-567890');
  });

  // `name` 은 생성자가 박는 `'ApiError'` 다. 응답에서 온 값이 아니다.
  it('담는 것은 종류·상태·이름뿐이고 문구는 서버 것이다', () => {
    const error = toApiError(axiosError(422, body));
    expect(Object.keys({ ...error }).sort()).toEqual(['kind', 'name', 'status']);
    expect(error.message).toBe('급여를 계산할 수 없어요.');
    expect(error.status).toBe(422);
  });
});

describe('isRetryable — 다시 눌러 풀릴 여지가 있는가', () => {
  it('연결·시간초과·서버는 다시 해볼 만하다', () => {
    expect(toApiError(axiosError(undefined)).isRetryable).toBe(true);
    expect(toApiError(axiosError(undefined, undefined, 'ETIMEDOUT')).isRetryable).toBe(true);
    expect(toApiError(axiosError(503)).isRetryable).toBe(true);
  });

  // 권한 없음·업무 규칙 위반은 다시 불러도 같은 답이 온다.
  it('권한·규칙·요청 형식은 다시 해도 같다', () => {
    expect(toApiError(axiosError(401)).isRetryable).toBe(false);
    expect(toApiError(axiosError(403)).isRetryable).toBe(false);
    expect(toApiError(axiosError(422)).isRetryable).toBe(false);
    expect(toApiError(axiosError(400)).isRetryable).toBe(false);
  });
});
