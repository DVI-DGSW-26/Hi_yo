import { useMutation } from '@tanstack/react-query';
import { apiUrl, authHeaders } from '@/lib/api';
import { ApiError } from '@hr/api';

/**
 * 발급된 증명서를 PDF로 받아 연다 — **웹**. `GET /certificates/{id}/pdf`
 *
 * `pdf.ts` 의 웹판이다. Metro 가 웹 번들에서만 이 파일을 고른다(`.web.ts`).
 *
 * 앱판은 캐시 디렉터리에 내려받아 공유 시트를 띄우고 지운다. 웹에는 그 둘이 없어서
 * **blob 으로 받아 내려받기를 걸고 곧바로 주소를 회수한다.**
 *
 * **주소창으로 열지 않는다.** `window.open(apiUrl(...))` 이 제일 짧지만, 그러면
 * `Authorization` 헤더가 실리지 않아 401 이 되고, 토큰을 쿼리스트링에 실어 우회하면
 * **서버 접근로그에 토큰이 남는다** (`CLAUDE.md` 2장). `fetch` 로 받아야 헤더가 실린다.
 *
 * 파일에는 **주민등록번호와 현주소가 들어 있다.** object URL 을 만들어 두고 방치하면
 * 탭이 살아 있는 동안 그 주소로 계속 열린다 — 눌리자마자 회수한다.
 */

export async function shareCertificatePdf(id: number, docNo: string | null): Promise<void> {
  let objectUrl: string | undefined;

  try {
    const response = await fetch(apiUrl(`/certificates/${id}/pdf`), {
      headers: authHeaders(),
    });
    if (!response.ok) {
      // 상태 코드와 본문을 화면에 그대로 내보내지 않는다.
      throw new ApiError('unknown', '증명서를 받지 못했어요. 잠시 후 다시 시도해주세요.');
    }

    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName(docNo);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // 네트워크 오류 문자열에는 URL 이 섞인다. 화면에 그대로 내보내지 않는다.
    throw new ApiError('unknown', '증명서를 받지 못했어요. 잠시 후 다시 시도해주세요.');
  } finally {
    /*
     * **곧바로 회수한다.** 브라우저는 `click()` 시점에 이미 blob 을 붙들었으므로
     * 내려받기는 끝까지 간다. 남겨두면 주민번호가 든 문서가 탭이 닫힐 때까지
     * 그 주소로 열린 채 남는다.
     */
    if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl);
  }
}

export function useShareCertificatePdf() {
  return useMutation({
    mutationFn: ({ id, docNo }: { id: number; docNo: string | null }) =>
      shareCertificatePdf(id, docNo),
  });
}

/** 파일명에 서버 값을 그대로 쓰지 않는다. 경로 구분자가 섞이면 엉뚱한 이름이 된다. */
function fileName(docNo: string | null): string {
  const suffix = docNo?.replace(/[^0-9A-Za-z가-힣_-]/g, '');
  return suffix ? `재직증명서_${suffix}.pdf` : '재직증명서.pdf';
}
