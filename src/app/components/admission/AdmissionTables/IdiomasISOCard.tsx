import React from 'react';
import { IoLanguage, IoAddCircle } from 'react-icons/io5';
import styles from './styles.module.css';

interface IdiomasISOCardProps {
  hasIdiomasISO?: boolean;
  onShowDataModal: () => void;
  onCreateOpcGrd: (opcGrd: { descripcion: string; rubro: string }) => Promise<void>;
}

const IdiomasISOCard: React.FC<IdiomasISOCardProps> = ({
  hasIdiomasISO = false,
  onShowDataModal,
  onCreateOpcGrd
}) => {
  const handleCreate = async () => {
    try {
      await onCreateOpcGrd({
        descripcion: 'Idiomas ISO',
        rubro: 'ADMISION'
      });
    } catch (error) {
      console.error('Error al crear la opción de Idiomas ISO:', error);
    }
  };

  return hasIdiomasISO ? (
    <div className={styles.card} onClick={onShowDataModal}>
      <div className={styles.cardBody}>
        <IoLanguage size={64} className={styles.cardIcon} />
        <h3 className={styles.cardTitle}>Idiomas ISO</h3>
        <p className={styles.cardDescription}>
          Gestione los códigos de idiomas según el estándar ISO.
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
        <span className={styles.cardCreateText}>Agregar Idiomas ISO</span>
      </button>
    </div>
  );
};

export default IdiomasISOCard;
