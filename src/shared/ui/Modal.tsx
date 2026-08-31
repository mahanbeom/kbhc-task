import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/* 네이티브 <dialog>를 사용한다 — showModal()이 포커스 이동·트랩(top layer)과
 * ESC 닫기를 브라우저 수준에서 보장하므로 별도 focus-trap 구현이 필요 없다. */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto w-full max-w-sm rounded-lg bg-background p-6 backdrop:bg-black/50"
    >
      <h2 id={titleId} className="mb-4 text-lg font-bold">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
