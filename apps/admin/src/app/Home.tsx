import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * 임시 진입점. 화면이 생기면 대체한다.
 *
 * 지금은 서버에 붙었는지, 어떤 권한으로 붙었는지만 보여준다. 관리팀 화면은 권한에 따라
 * 보이는 것이 달라서, 어떤 계정으로 보고 있는지 모르면 화면을 잘못 읽는다.
 */

/** 연결 확인에 필요한 만큼만 적는다. 전체 DTO는 화면을 만들 때 정의한다. */
interface MeSummary {
  summary: {
    id: number;
    name: string;
    departmentName: string | null;
    employmentStatusLabel: string | null;
  };
}

export function Home() {
  const { data, isPending, error } = useQuery({
    queryKey: ['employees', 'me'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<MeSummary>('/employees/me', { signal });
      return data;
    },
  });

  return (
    <section>
      <h1 className="page-title">HR 관리</h1>

      {isPending && <p className="muted">불러오는 중이에요.</p>}
      {error && <p className="danger">{error.message}</p>}
      {data && (
        <dl className="rows">
          <dt>접속 계정</dt>
          <dd>{data.summary.name}</dd>
          <dt>부서</dt>
          <dd>{data.summary.departmentName ?? '아직이에요'}</dd>
          <dt>재직 상태</dt>
          <dd>{data.summary.employmentStatusLabel ?? '아직이에요'}</dd>
        </dl>
      )}

      <p className="muted">
        화면은 아직 없어요. 명세서에 상세 스펙이 있는 A-102·A-302·A-601부터 만들 차례예요.
      </p>
    </section>
  );
}
