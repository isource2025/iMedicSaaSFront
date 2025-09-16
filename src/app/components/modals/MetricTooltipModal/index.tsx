'use client';

import React from 'react';
import styles from './MetricTooltipModal.module.css';
// Componente Icon local
const Icon = ({ path, className, style }: { path: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
};

interface MetricTooltipModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  formula?: string;
  example?: string;
  importance: string;
}

export const MetricTooltipModal: React.FC<MetricTooltipModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  formula,
  example,
  importance
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <Icon path={ICONS.close} className={styles.closeIcon} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>¿Qué representa?</h4>
            <p className={styles.description}>{description}</p>
          </div>

          {formula && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Cálculo</h4>
              <div className={styles.formula}>{formula}</div>
            </div>
          )}

          {example && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Ejemplo</h4>
              <p className={styles.example}>{example}</p>
            </div>
          )}

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Importancia Clínica</h4>
            <p className={styles.importance}>{importance}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
