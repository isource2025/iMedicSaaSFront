import React from 'react';
import { IoShield, IoAddCircle } from 'react-icons/io5';
import styles from './styles.module.css';

interface EstadosMilitaresCardProps {
  onShowDataModal: () => void;
}

const EstadosMilitaresCard: React.FC<EstadosMilitaresCardProps> = ({
  onShowDataModal,
}) => {
  return (
    <div className={styles.card} onClick={onShowDataModal}>
      <div className={styles.cardBody}>
        <IoShield size={64} className={styles.cardIcon} />
        <h3 className={styles.cardTitle}>Estados Militares</h3>
        <p className={styles.cardDescription}>
          Gestione los estados militares disponibles en el sistema.
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

export default EstadosMilitaresCard;
