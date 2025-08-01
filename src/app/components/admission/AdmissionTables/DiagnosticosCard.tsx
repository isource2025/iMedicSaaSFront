'use client';

import React from 'react';
import { IoAdd, IoPencil } from 'react-icons/io5';
// Importaciones de React y componentes
import styles from './styles.module.css';

interface DiagnosticosCardProps {
  hasDiagnosticos: boolean;
  onShowDataModal: () => Promise<void>;
  onCreateOpcGrd: (opcion: { descripcion: string, rubro: string }) => Promise<void>;
}

const DiagnosticosCard: React.FC<DiagnosticosCardProps> = ({
  hasDiagnosticos,
  onShowDataModal,
  onCreateOpcGrd
}) => {
  const handleCreateOption = async () => {
    await onCreateOpcGrd({
      descripcion: 'Diagnósticos',
      rubro: 'ADMISION'
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>Diagnósticos</h3>
      </div>
      <div className={styles.cardBody}>
        <img 
          src="/images/Diagnosis.ico" 
          alt="Diagnósticos" 
          className={styles.cardImage}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = '/images/ConfigGral.ico';
          }}
        />
        <p>Gestión de diagnósticos y codificación ICD-10</p>
      </div>
      <div className={styles.cardFooter}>
        {hasDiagnosticos ? (
          <button 
            onClick={onShowDataModal} 
            className={`${styles.button} ${styles.primaryButton}`}
            title="Ver datos de Diagnósticos"
          >
            <IoPencil size={20} /> Ver datos
          </button>
        ) : (
          <button 
            onClick={handleCreateOption} 
            className={`${styles.button} ${styles.successButton}`}
            title="Crear opción de Diagnósticos"
          >
            <IoAdd size={20} /> Crear opción
          </button>
        )}
      </div>
    </div>
  );
};

export default DiagnosticosCard;
