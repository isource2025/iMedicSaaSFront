'use client';

import React from 'react';
import { IoAdd, IoPencil, IoTrash, IoCheckmark, IoReturnUpBack, IoSave } from 'react-icons/io5';
// Importaciones de React y componentes
import { getDisposicionesEgreso, createDisposicionEgreso, updateDisposicionEgreso, deleteDisposicionEgreso } from '../../../services/disposicionEgresoService';
import styles from './styles.module.css';

interface DisposicionesEgresoCardProps {
  hasDisposicionesEgreso: boolean;
  onShowDataModal: () => Promise<void>;
  onCreateOpcGrd: (opcion: { descripcion: string, rubro: string }) => Promise<void>;
}

const DisposicionesEgresoCard: React.FC<DisposicionesEgresoCardProps> = ({
  hasDisposicionesEgreso,
  onShowDataModal,
  onCreateOpcGrd
}) => {
  const handleCreateOption = async () => {
    await onCreateOpcGrd({
      descripcion: 'Disposición de Egreso',
      rubro: 'ADMISION'
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>Disposición de Egreso</h3>
      </div>
      <div className={styles.cardBody}>
        <img 
          src="/images/Exit.ico" 
          alt="Disposición de Egreso" 
          className={styles.cardImage}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = '/images/ConfigGral.ico';
          }}
        />
        <p>Gestión de disposiciones de egreso para pacientes</p>
      </div>
      <div className={styles.cardFooter}>
        {hasDisposicionesEgreso ? (
          <button 
            onClick={onShowDataModal} 
            className={`${styles.button} ${styles.primaryButton}`}
            title="Ver datos de Disposición de Egreso"
          >
            <IoPencil size={20} /> Ver datos
          </button>
        ) : (
          <button 
            onClick={handleCreateOption} 
            className={`${styles.button} ${styles.successButton}`}
            title="Crear opción de Disposición de Egreso"
          >
            <IoAdd size={20} /> Crear opción
          </button>
        )}
      </div>
    </div>
  );
};

export default DisposicionesEgresoCard;
