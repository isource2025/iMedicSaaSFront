'use client';

import React from 'react';
import { IoAdd, IoPencil } from 'react-icons/io5';
// Importaciones de React y componentes
import { getEstadosAmbulatorios, createEstadoAmbulatorio, updateEstadoAmbulatorio, deleteEstadoAmbulatorio } from '../../../services/estadoAmbulatorioService';
import styles from './styles.module.css';

interface EstadosAmbulatoriosCardProps {
  hasEstadosAmbulatorios: boolean;
  onShowDataModal: () => Promise<void>;
  onCreateOpcGrd: (opcion: { descripcion: string, rubro: string }) => Promise<void>;
}

const EstadosAmbulatoriosCard: React.FC<EstadosAmbulatoriosCardProps> = ({
  hasEstadosAmbulatorios,
  onShowDataModal,
  onCreateOpcGrd
}) => {
  const handleCreateOption = async () => {
    await onCreateOpcGrd({
      descripcion: 'Estados Ambulatorios',
      rubro: 'ADMISION'
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>Estados Ambulatorios</h3>
      </div>
      <div className={styles.cardBody}>
        <img 
          src="/images/Ambulatory.ico" 
          alt="Estados Ambulatorios" 
          className={styles.cardImage}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = '/images/ConfigGral.ico';
          }}
        />
        <p>Gestión de estados para pacientes ambulatorios</p>
      </div>
      <div className={styles.cardFooter}>
        {hasEstadosAmbulatorios ? (
          <button 
            onClick={onShowDataModal} 
            className={`${styles.button} ${styles.primaryButton}`}
            title="Ver datos de Estados Ambulatorios"
          >
            <IoPencil size={20} /> Ver datos
          </button>
        ) : (
          <button 
            onClick={handleCreateOption} 
            className={`${styles.button} ${styles.successButton}`}
            title="Crear opción de Estados Ambulatorios"
          >
            <IoAdd size={20} /> Crear opción
          </button>
        )}
      </div>
    </div>
  );
};

export default EstadosAmbulatoriosCard;
