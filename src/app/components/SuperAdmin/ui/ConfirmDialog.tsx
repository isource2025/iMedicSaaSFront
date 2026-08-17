'use client';

import styles from '../superAdmin.module.css';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="sa-confirm-title">
      <div className={styles.modalPanel} style={{ width: 'min(440px, 96vw)' }}>
        <div className={styles.modalHeader}>
          <strong id="sa-confirm-title">{title}</strong>
          <button type="button" className={styles.modalClose} onClick={onCancel} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.wizardHint} style={{ margin: 0 }}>
            {message}
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${danger ? styles.btnDanger : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
