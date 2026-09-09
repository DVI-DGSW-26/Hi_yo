import { ListRow, QueryState, SectionTitle } from '@/components';
import { useMe } from './api';

/**
 * 지금 등록된 계좌. 바꾸는 화면 맨 위에서 「무엇을 바꾸는 중인가」를 보여준다.
 *
 * **계좌번호는 서버가 가려서 준다** (2026-09-09 회신 24번). 여기서 다시 가리지 않는다 —
 * 두 번 가리면 남은 네 자리까지 지워져 무엇을 바꾸는 중인지 알 수 없게 된다.
 *
 * 조회는 `useMe`를 직접 부른다. 마이페이지와 같은 쿼리 키라 다시 요청하지 않는다.
 */
export function CurrentBankAccount() {
  const me = useMe();
  const current = me.data?.bankAccount ?? null;
  const account = current?.bankAccountMasked ?? null;

  return (
    <>
      <SectionTitle title="지금 등록된 계좌" />
      <QueryState query={me}>
        {() => (
          <>
            <ListRow label="은행" value={current?.bankName ?? undefined} placeholder="아직이에요" />
            <ListRow
              label="계좌번호"
              value={account ?? undefined}
              placeholder="아직이에요"
            />
            <ListRow
              label="예금주"
              value={current?.accountHolder ?? undefined}
              placeholder="아직이에요"
            />
          </>
        )}
      </QueryState>
    </>
  );
}
