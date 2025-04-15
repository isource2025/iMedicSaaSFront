import { Patient } from '../../types/PatientInterface';
import styles from './DeleteConfirmation.module.css';

interface DeleteConfirmationProps {
  patient: Patient;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmation({ patient, isDeleting, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        <div className={styles.iconWarning}>⚠️</div>
      </div>
      
      <h3 className={styles.title}>Confirmar eliminación</h3>
      
      <p className={styles.message}>
        ¿Está seguro de que desea eliminar al paciente <strong>{patient.ApellidoyNombre}</strong> (HC: {patient.NumeroHC})?
      </p>
      
      <p className={styles.warning}>
        Esta acción no se puede deshacer.
      </p>
      
      <div className={styles.actions}>
        <button 
          className={styles.cancelButton} 
          onClick={onCancel}
          disabled={isDeleting}
          type="button"
        >
          Cancelar
        </button>
        
        <button 
          className={styles.deleteButton} 
          onClick={onConfirm}
          disabled={isDeleting}
          type="button"
        >
          {isDeleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </div>
  );
}
