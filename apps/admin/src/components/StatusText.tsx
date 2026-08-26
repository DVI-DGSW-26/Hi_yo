import './StatusText.css';

type Tone = 'done' | 'error' | 'neutral';

/**
 * 상태를 색으로 구분하려 하지 않는다. 확정·승인만 그린, 반려·누락만 빨강,
 * 나머지는 전부 무채색이다. 뱃지(알약 배경)를 쓰지 않는다 — 표에서 20개 늘어서면
 * 그것만 보인다 (DESIGN_ADMIN.md 7장).
 */
export function StatusText({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return <span className={`status status-${tone}`}>{label}</span>;
}
