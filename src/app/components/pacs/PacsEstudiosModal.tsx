'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PacsEstudiosPanel from './PacsEstudiosPanel';
import styles from './Pacs.module.css';

interface PacsEstudiosModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: string | number | null | undefined;
  pacienteNombre?: string;
}

export default function PacsEstudiosModal({ isOpen, onClose, documento, pacienteNombre }: PacsEstudiosModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={`${styles.title} modal-title`}>
            Imágenes del tomógrafo
            {pacienteNombre ? <span className={styles.titleMeta}>{pacienteNombre}</span> : null}
          </h2>
          <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className={styles.content}>
          <PacsEstudiosPanel documento={documento} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
