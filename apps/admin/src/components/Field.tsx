import { useId, type ReactNode } from 'react';
import './Field.css';

interface Props {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  required?: boolean;
  /** 있으면 테두리와 문구가 danger 로 바뀐다. 배경은 칠하지 않는다 */
  error?: string;
  /** 자동으로 채워지는 값. 입력칸처럼 보이면 눌러본다 (DESIGN_ADMIN.md 4장) */
  readOnly?: boolean;
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'month' | 'time';
  placeholder?: string;
  /** 서버가 받는 한계를 그대로 넣는다 */
  maxLength?: number;
  /**
   * 여러 줄로 받는다. `type` 은 무시된다.
   *
   * **문단이 여러 개인 값에만 쓴다** — 촉진 통보의 「보낸 본문 원문」처럼 한 줄 칸에서는
   * 무엇을 붙여넣었는지 읽어서 확인할 수 없는 값이다. 사유·메모 한 줄은 그대로 한 줄 칸이다.
   *
   * **새 컴포넌트를 만들지 않고 여기에 둔다** (2026-09-09에 물어보고 정했다).
   * 라벨 자리·필수 표시·오류 테두리·`aria` 연결이 한 줄 칸과 같아야 하는데,
   * 따로 만들면 규칙이 바뀔 때 두 곳을 고쳐야 한다 (`DESIGN_RULES.md` 7장).
   */
  multiline?: boolean;
  /** 여러 줄일 때 처음 보이는 줄 수. 넘치면 칸이 늘지 않고 안에서 스크롤한다 */
  rows?: number;
}

/** 라벨은 필드 위. 필수 표시는 라벨 뒤 `*` 하나 (DESIGN_ADMIN.md 4장). */
export function Field({
  label,
  value,
  onChange,
  required,
  error,
  readOnly,
  type = 'text',
  placeholder,
  maxLength,
  multiline,
  rows = 6,
}: Props) {
  /*
   * **라벨로 id 를 만들지 않는다** (2026-09-02).
   *
   * 한 화면에 같은 라벨이 둘이면 id 가 겹치고, 그때 `htmlFor` 는 **첫 번째 칸만**
   * 가리킨다 — 두 번째 칸은 라벨 없는 입력이 된다. 당직 상세에서 실제로 그랬다:
   * 「대상자 추가하기」와 「순번 바꾸기」 대화상자가 둘 다 `순번` 을 받아
   * `field-순번` 이 두 번 나왔다.
   */
  const id = useId();

  if (readOnly) {
    return (
      <div className="field">
        <span className="field-label">{label}</span>
        <span className="field-readonly">{value || '아직이에요'}</span>
      </div>
    );
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="field-required"> *</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className={error ? 'field-input is-multiline has-error' : 'field-input is-multiline'}
          rows={rows}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => onChange?.(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : (
        <input
          id={id}
          className={error ? 'field-input has-error' : 'field-input'}
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => onChange?.(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

/** 필드를 두 열로 나눈다. 라벨-값 쌍이 가로로 흩어지지 않게 열 폭을 고정한다. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="field-grid">{children}</div>;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** 아무것도 안 고른 상태의 문구. 없으면 첫 항목이 선택된다 */
  placeholder?: string;
  error?: string;
}

/** 고정 목록에서 고르는 값. 부서·직무·급여 기간처럼 서버가 목록을 주는 것에 쓴다. */
export function Select({ label, value, onChange, options, placeholder, error }: SelectProps) {
  /* 라벨로 만들지 않는 이유는 `Field` 와 같다 */
  const id = useId();

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={error ? 'field-input has-error' : 'field-input'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
