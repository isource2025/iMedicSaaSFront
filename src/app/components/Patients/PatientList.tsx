import { Patient } from '../../types/PatientInterface';
import styles from './PatientList.module.css';
import Pagination from '../UI/Pagination';
import { IoDocumentTextOutline, IoMedicalOutline, IoPencil, IoTrashOutline } from 'react-icons/io5';
import { clarionDateToDate, calculateAge } from '../../utils/dateUtils';

interface PatientListProps {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
  onView: (patient: Patient) => void;
  onAdmission: (patient: Patient) => void;
  onViewHistory: (patient: Patient) => void;
}

export default function PatientList({ 
  patients,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onView,
  onAdmission,
  onViewHistory
}: PatientListProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';

    let date: Date | null;

    if (/^\d+$/.test(dateString)) {
      date = clarionDateToDate(dateString);
    } else {
      date = new Date(dateString);
    }

    if (!date || isNaN(date.getTime())) return '-';

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${day}/${month}/${year}`;
  };

  const getAgeText = (dateString?: string) => {
    if (!dateString) return '';

    let age: number | null;

    if (/^\d+$/.test(dateString)) {
      age = calculateAge(dateString, true);
    } else {
      age = calculateAge(dateString);
    }

    if (age === null) return '';

    return `${age} años`;
  };

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.errorContainer} role="alert">
          <strong className={styles.errorTitle}>Error!</strong>
          <span className={styles.errorMessage}> {error}</span>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table} aria-label="Lista de pacientes">
          <thead className={styles.tableHeader}>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Documento / HC</th>
              <th scope="col">Nombre y Domicilio</th>
              <th scope="col">Fecha Nac. / Edad</th>
              <th scope="col">Cobertura</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.loadingContainer}>
                  <div className={styles.loadingContent}>
                    <div className={styles.loadingSpinner}></div>
                    <span className={styles.loadingText}>Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.noResults}>No se encontraron pacientes</td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient.IDPaciente} className={styles.tableRow}>
                  <td>{patient.IDPaciente}</td>
                  <td className={styles.documentColumn}>
                    <div>{patient.Numerodocumento || '-'}</div>
                    <div className={styles.hcNumber}>{patient.NumeroHC}</div>
                  </td>
                  <td className={styles.patientColumn}>
                    <button 
                      className={styles.viewButton} 
                      onClick={() => onView(patient)}
                      title="Ver detalles"
                      aria-label={`Ver detalles de ${patient.ApellidoyNombre}`}
                    >
                      {patient.ApellidoyNombre}
                    </button>
                    <div className={styles.addressText}>{patient.Domicilio || '-'}</div>
                  </td>
                  <td className={styles.birthDateColumn}>
                    <div>{formatDate(patient.FechaNacimiento)}</div>
                    <div className={styles.ageText}>
                      {getAgeText(patient.FechaNacimiento)}
                    </div>
                  </td>
                  <td className={styles.coverageColumn}>
                    {patient.Cobertura || '-'}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => onViewHistory(patient)}
                        className={styles.historyButton}
                        title="Ver historia clínica"
                        aria-label={`Ver historia clínica de ${patient.ApellidoyNombre}`}
                      >
                        <IoDocumentTextOutline size={20} />
                      </button>
                      <button
                        onClick={() => onAdmission(patient)}
                        className={styles.admissionButton}
                        title="Nueva admisión"
                        aria-label={`Nueva admisión para ${patient.ApellidoyNombre}`}
                      >
                        <IoMedicalOutline size={20} />
                      </button>
                      <button
                        onClick={() => onEdit(patient)}
                        className={styles.editButton}
                        title="Editar"
                        aria-label={`Editar ${patient.ApellidoyNombre}`}
                      >
                        <IoPencil size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(patient)}
                        className={styles.deleteButton}
                        title="Eliminar"
                        aria-label={`Eliminar ${patient.ApellidoyNombre}`}
                      >
                        <IoTrashOutline size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && patients.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
