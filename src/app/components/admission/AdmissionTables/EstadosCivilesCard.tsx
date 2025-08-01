'use client';

import React from 'react';
import { IoAdd, IoPencil } from 'react-icons/io5';
import { EstadoCivil } from '../../../types/admission.types';
import { getEstadosCiviles, createEstadoCivil, updateEstadoCivil, deleteEstadoCivil } from '../../../services/estadoCivilService';
import styles from './styles.module.css';

interface EstadosCivilesCardProps {
  hasEstadosCiviles: boolean;
  onShowDataModal: () => Promise<void>;
  onCreateOpcGrd: (opcion: { descripcion: string, rubro: string }) => Promise<void>;
}

const EstadosCivilesCard: React.FC<EstadosCivilesCardProps> = ({
  hasEstadosCiviles,
  onShowDataModal,
  onCreateOpcGrd
}) => {
  const handleCreateOption = async () => {
    await onCreateOpcGrd({
      descripcion: 'Estado Civil',
      rubro: 'ADMISION'
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>Estados Civiles</h3>
      </div>
      <div className={styles.cardBody}>
        <img 
          src="/images/CivilStatus.ico" 
          alt="Estados Civiles" 
          className={styles.cardImage}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = '/images/ConfigGral.ico';
          }}
        />
        <p>Gestión de estados civiles para pacientes</p>
      </div>
      <div className={styles.cardFooter}>
        {hasEstadosCiviles ? (
          <button 
            onClick={onShowDataModal} 
            className={`${styles.button} ${styles.primaryButton}`}
            title="Ver datos de Estados Civiles"
          >
            <IoPencil size={20} /> Ver datos
          </button>
        ) : (
          <button 
            onClick={handleCreateOption} 
            className={`${styles.button} ${styles.successButton}`}
            title="Crear opción de Estados Civiles"
          >
            <IoAdd size={20} /> Crear opción
          </button>
        )}
      </div>
    </div>
  );
};

export default EstadosCivilesCard;
