import { maskAccountNo } from '@hr/format';
import { ListRow, QueryState, SectionTitle } from '@/components';
import { useMe } from './api';

/**
 * 지금 등록된 계좌. 바꾸는 화면 맨 위에서 「무엇을 바꾸는 중인가」를 보여준다.
 *
 * **계좌번호는 가려서 그린다.** 서버가 원문을 주기 때문이다 (2026-09-02 회신 10번).
 * 여기서 원문을 띄우면 바꿀 것도 없는 사람에게까지 계좌번호를 보여주는 셈이 된다.
 *
 * 조회는 `useMe`를 직접 부른다. 마이페이지와 같은 쿼리 키라 다시 요청하지 않는다.
 */
export function CurrentBankAccount() {
  const me = useMe();
  const current = me.data?.bankAccount ?? null;
  const account = current?.bankAccount ?? null;

  return (
    <>
      <SectionTitle title="지금 등록된 계좌" />
      <QueryState query={me}>
        {() => (
          <>
            <ListRow label="은행" value={current?.bankName ?? undefined} placeholder="아직이에요" />
            <ListRow
              label="계좌번호"
              value={account === null ? undefined : maskAccountNo(account)}
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
