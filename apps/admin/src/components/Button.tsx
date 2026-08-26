import type { ReactNode } from 'react';
import './Button.css';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props {
  label: string;
  onClick: () => void;
  variant?: Variant;
  loading?: boolean;
  /**
   * 값이 있으면 버튼이 비활성되고 이 문구가 버튼 옆에 나온다.
   *
   * **비활성만 시키는 방법은 없다.** 이유 없는 회색 버튼을 만들지 않기 위해서다
   * (DESIGN_ADMIN.md 1장). 사용자가 고칠 수 있는 이유(값 미입력·잔여 부족)로는
   * 막지 않는다 — 그건 눌리게 두고 서버가 준 문구를 인라인으로 보여준다.
   */
  disabledReason?: string;
}

/**
 * 한 화면에 `primary`는 1개다.
 * `danger`는 되돌리기 어렵거나 업무상 영향이 큰 동작에만 쓴다 (DESIGN_ADMIN.md 5장).
 */
export function Button({ label, onClick, variant = 'secondary', loading, disabledReason }: Props) {
  const disabled = disabledReason !== undefined || loading === true;

  return (
    <span className="btn-wrap">
      <button
        type="button"
        className={`btn btn-${variant}`}
        onClick={onClick}
        disabled={disabled}
        aria-describedby={disabledReason ? `${label}-reason` : undefined}
      >
        {loading ? '처리 중이에요' : label}
      </button>
      {disabledReason && (
        <span className="btn-reason" id={`${label}-reason`}>
          {disabledReason}
        </span>
      )}
    </span>
  );
}

/** 표 안의 행별 동작. 행마다 버튼을 넣으면 표가 버튼 밭이 된다 (DESIGN_ADMIN.md 5장). */
export function RowLink({ label, onClick }: { label: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="row-link" onClick={onClick}>
      {label}
    </button>
  );
}
