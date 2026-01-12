import type { PropsWithChildren, ReactNode } from "react";
import styles from "./Modal.module.css";

type ModalProps = PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
}>;

export function Modal({ isOpen, onClose, title, footer, children }: ModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    onClose();
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={styles["gen-modal-overlay"]} role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className={styles["gen-modal"]} onClick={stopPropagation}>
        <div className={styles["gen-modal-header"]}>
          {title && <h3 className={styles["gen-modal-title"]}>{title}</h3>}
          <button className={styles["gen-modal-close"]} aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles["gen-modal-body"]}>{children}</div>

        {footer && <div className={styles["gen-modal-footer"]}>{footer}</div>}
      </div>
    </div>
  );
}
