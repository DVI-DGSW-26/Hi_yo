import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { useMutation } from '@tanstack/react-query';
import { apiUrl, authHeaders } from '@/lib/api';
import { ApiError } from '@/lib/apiError';

/**
 * 발급된 증명서를 PDF로 받아 연다. `GET /certificates/{id}/pdf`
 *
 * 발급(POST)을 다시 부르지 않는다. 같은 증명서를 몇 번을 내려받아도 같은 문서여야 한다.
 *
 * 파일에는 **주민등록번호와 현주소가 들어 있다.** 캐시 디렉터리에 잠깐 두고, 공유 시트가
 * 닫히면 지운다. 기기에 만료 없이 남겨두지 않는다.
 */

export async function shareCertificatePdf(id: number, docNo: string | null): Promise<void> {
  if (!(await isAvailableAsync())) {
    throw new ApiError('unknown', '이 기기에서는 파일을 열 수 없어요.');
  }

  const target = new File(Paths.cache, fileName(docNo));
  let downloaded: File | undefined;

  try {
    downloaded = await File.downloadFileAsync(apiUrl(`/certificates/${id}/pdf`), target, {
      headers: authHeaders(),
      // 같은 증명서를 다시 받으면 덮어쓴다. 남아 있는 파일 때문에 실패하게 두지 않는다.
      idempotent: true,
    });

    await shareAsync(downloaded.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: '재직증명서',
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // 내려받기 실패의 원인 문자열에는 URL과 상태가 섞여 있다. 화면에 그대로 내보내지 않는다.
    throw new ApiError('unknown', '증명서를 받지 못했어요. 잠시 후 다시 시도해주세요.');
  } finally {
    remove(downloaded ?? target);
  }
}

export function useShareCertificatePdf() {
  return useMutation({
    mutationFn: ({ id, docNo }: { id: number; docNo: string | null }) =>
      shareCertificatePdf(id, docNo),
  });
}

/** 파일명에 서버 값을 그대로 쓰지 않는다. 경로 구분자가 섞이면 엉뚱한 곳에 쓴다. */
function fileName(docNo: string | null): string {
  const suffix = docNo?.replace(/[^0-9A-Za-z가-힣_-]/g, '');
  return suffix ? `재직증명서_${suffix}.pdf` : '재직증명서.pdf';
}

function remove(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // 지우지 못해도 화면 흐름을 막지 않는다. 캐시 디렉터리라 시스템이 정리한다.
  }
}
