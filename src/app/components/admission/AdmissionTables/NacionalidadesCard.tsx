import React from 'react';
import { IoGlobeOutline, IoAddCircle } from 'react-icons/io5';
import styles from './styles.module.css';

interface NacionalidadesCardProps {
  hasNacionalidades: boolean;
  onShowDataModal: () => void;
  onCreateOpcGrd: (opcGrd: { descripcion: string; rubro: string }) => Promise<void>;
}

/**
 * Componente que muestra una tarjeta para acceder a la tabla de Nacionalidades
 */
const NacionalidadesCard: React.FC<NacionalidadesCardProps> = ({
  hasNacionalidades = false,
  onShowDataModal,
  onCreateOpcGrd
}) => {
  const handleCreate = async () => {
    try {
      await onCreateOpcGrd({
        descripcion: 'Nacionalidad',
        rubro: 'ADMISION'
      });
    } catch (error) {
      console.error('Error al crear la opción de Nacionalidades:', error);
    }
  };

  return hasNacionalidades ? (
    <div className={styles.card} onClick={onShowDataModal} data-testid="nacionalidades-card">
      <div className={styles.cardBody}>
        <IoGlobeOutline size={64} className={styles.cardIcon} />
        <h3 className={styles.cardTitle}>Nacionalidades</h3>
        <p className={styles.cardDescription}>
          Gestione los códigos de nacionalidades del sistema.
        </p>
      </div>
      <div className={styles.cardFooter}>
        <button className={`${styles.button} ${styles.primaryButton}`}>
          Ver datos
        </button>
      </div>
    </div>
  ) : (
    <div className={styles.cardCreateContainer}>
      <button className={styles.cardCreate} onClick={handleCreate}>
        <IoAddCircle size={40} className={styles.cardCreateIcon} />
        <span className={styles.cardCreateText}>Agregar Nacionalidades</span>
      </button>
    </div>
  );
};

export default NacionalidadesCard;
