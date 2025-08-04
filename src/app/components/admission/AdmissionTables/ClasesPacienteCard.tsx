'use client';

import React from 'react';
import { IoAdd, IoPencil, IoTrash, IoCheckmark, IoReturnUpBack, IoSave } from 'react-icons/io5';
// Importaciones de React y componentes
import { getClasesPaciente, createClasePaciente, updateClasePaciente, deleteClasePaciente } from '../../../services/clasePacienteService';
import styles from './styles.module.css';

interface ClasesPacienteCardProps {
  hasClasesPaciente: boolean;
  onShowDataModal: () => Promise<void>;
  onCreateOpcGrd: (opcion: { descripcion: string, rubro: string }) => Promise<void>;
}

const ClasesPacienteCard: React.FC<ClasesPacienteCardProps> = ({
  hasClasesPaciente,
  onShowDataModal,
  onCreateOpcGrd
}) => {
  const handleCreateOption = async () => {
    await onCreateOpcGrd({
      descripcion: 'Clases de Paciente',
      rubro: 'ADMISION'
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>Clases de Paciente</h3>
      </div>
      <div className={styles.cardBody}>
        <img 
          src="/images/Patient.ico" 
          alt="Clases de Paciente" 
          className={styles.cardImage}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = '/images/ConfigGral.ico';
          }}
        />
        <p>Gestión de tipos y clases de pacientes</p>
      </div>
      <div className={styles.cardFooter}>
        {hasClasesPaciente ? (
          <button 
            onClick={onShowDataModal} 
            className={`${styles.button} ${styles.primaryButton}`}
            title="Ver datos de Clases de Paciente"
          >
            <IoPencil size={20} /> Ver datos
          </button>
        ) : (
          <button 
            onClick={handleCreateOption} 
            className={`${styles.button} ${styles.successButton}`}
            title="Crear opción de Clases de Paciente"
          >
            <IoAdd size={20} /> Crear opción
          </button>
        )}
      </div>
    </div>
  );
};

export default ClasesPacienteCard;
