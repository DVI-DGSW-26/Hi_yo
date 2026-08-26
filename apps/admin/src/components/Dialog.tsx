import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import './Dialog.css';

interface Props {
  open: boolean;
  title: string;
  /** 무엇이 일어나는지 구체적으로. `정말 하시겠어요?` 는 쓰지 않는다 */
  description: string;
  /** 동작을 적는다. `확인` 이 아니라 `퇴사 처리하기` */
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
  loading?: boolean;
  /** 사유 입력처럼 실행 전에 받아야 하는 것 */
  children?: ReactNode;
}

/**
 * 되돌릴 수 없는 동작에 쓴다 (DESIGN_ADMIN.md 6장).
 *
 * 네이티브 `<dialog>`를 쓴다. 포커스 가두기와 Esc 닫기를 브라우저가 해준다.
 */
export function Dialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  danger,
  loading,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onCancel={onClose} onClose={onClose}>
      <h2 className="dialog-title">{title}</h2>
      <p className="dialog-description">{description}</p>
      {children}
      <div className="dialog-actions">
        {/* 좌측은 닫기. `취소` 가 아니다 (DESIGN_SYSTEM.md 7장). */}
        <Button label="닫기" onClick={onClose} />
        <Button
          label={confirmLabel}
          variant={danger ? 'danger' : 'primary'}
          loading={loading}
          onClick={onConfirm}
        />
      </div>
    </dialog>
  );
}
