import { Patient } from '../../types/PatientInterface';
import styles from './PatientDetails.module.css';

interface PatientDetailsProps {
  patient: Patient;
  onClose: () => void;
  onEdit: () => void;
}

export default function PatientDetails({ patient, onClose, onEdit }: PatientDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.patientAvatar}>
          {patient.ApellidoyNombre?.charAt(0) || 'P'}
        </div>
        <h2 className={styles.patientName}>{patient.ApellidoyNombre}</h2>
      </div>
      
      <div className={styles.infoSection}>
        <h3 className={styles.sectionTitle}>Información personal</h3>
        
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>ID Paciente:</span>
            <span className={styles.infoValue}>{patient.IDPaciente}</span>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Historia Clínica:</span>
            <span className={styles.infoValue}>{patient.NumeroHC}</span>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Sexo:</span>
            <span className={styles.infoValue}>
              {patient.Sexo === 'M' ? 'Masculino' : 
               patient.Sexo === 'F' ? 'Femenino' : 
               patient.Sexo === 'O' ? 'Otro' : patient.Sexo}
            </span>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Fecha de Nacimiento:</span>
            <span className={styles.infoValue}>{formatDate(patient.FechaNacimiento)}</span>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Domicilio:</span>
            <span className={styles.infoValue}>{patient.Domicilio || '-'}</span>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Estado Civil:</span>
            <span className={styles.infoValue}>{patient.EstadoCivil || '-'}</span>
          </div>
        </div>
      </div>
      
      <div className={styles.actions}>
        <button 
          className={styles.historyButton} 
          type="button"
          onClick={() => alert('Funcionalidad en construcción: Ver Historia Clínica')}
        >
          📋 Ver Historia Clínica
        </button>
        
        <button 
          className={styles.admissionButton} 
          type="button"
          onClick={() => alert('Funcionalidad en construcción: Nueva Admisión')}
        >
          🏥 Nueva Admisión
        </button>
      </div>
      
      <div className={styles.footer}>
        <button className={styles.closeButton} onClick={onClose}>
          Cerrar
        </button>
        <button className={styles.editButton} onClick={onEdit}>
          Editar
        </button>
      </div>
    </div>
  );
}
