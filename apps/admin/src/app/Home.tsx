import { useQuery } from '@tanstack/react-query';
import { DetailList } from '@/components';
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
    <section className="page-blocks">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">HR 관리</h1>
          <p className="page-lead">
            왼쪽 메뉴에서 화면을 골라주세요. 관리팀 화면은 권한에 따라 보이는 것이 달라서,
            어떤 계정으로 보고 있는지 여기에 적어둬요.
          </p>
        </div>
      </div>

      {isPending && <p className="muted">불러오는 중이에요.</p>}
      {error && <p className="danger">{error.message}</p>}
      {data && (
        <div className="panel">
          <div className="panel-body">
            <DetailList
              items={[
                { label: '접속 계정', value: data.summary.name },
                { label: '부서', value: data.summary.departmentName ?? '아직이에요' },
                { label: '재직 상태', value: data.summary.employmentStatusLabel ?? '아직이에요' },
              ]}
            />
          </div>
        </div>
      )}

      <p className="muted">A-302 연차 결재는 전자서명 형식이 정해지면 만들어요.</p>
    </section>
  );
}
