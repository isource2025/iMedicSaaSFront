import React from 'react';
import { IoPeople, IoAddCircle } from 'react-icons/io5';
import styles from './styles.module.css';

interface GruposEtnicosCardProps {
  onShowDataModal: () => void;
}

const GruposEtnicosCard: React.FC<GruposEtnicosCardProps> = ({
  onShowDataModal,
}) => {
  return (
    <div className={styles.card} onClick={onShowDataModal}>
      <div className={styles.cardBody}>
        <IoPeople size={64} className={styles.cardIcon} />
        <h3 className={styles.cardTitle}>Grupos Étnicos</h3>
        <p className={styles.cardDescription}>
          Gestione los grupos étnicos disponibles en el sistema.
        </p>
      </div>
      <div className={styles.cardFooter}>
        <button className={`${styles.button} ${styles.primaryButton}`}>
          Ver datos
        </button>
      </div>
    </div>
  );
};

export default GruposEtnicosCard;
