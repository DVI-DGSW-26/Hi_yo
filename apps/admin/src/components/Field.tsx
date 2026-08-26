import type { ReactNode } from 'react';
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
  type?: 'text' | 'number' | 'date' | 'month';
  placeholder?: string;
  /** 서버가 받는 한계를 그대로 넣는다 */
  maxLength?: number;
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
}: Props) {
  const id = `field-${label}`;

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
  const id = `select-${label}`;

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
