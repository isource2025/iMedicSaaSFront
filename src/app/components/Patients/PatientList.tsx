import { useState } from 'react';
import { Patient } from '../../types/PatientInterface';
import styles from './PatientList.module.css';
import Pagination from '../UI/Pagination';
import Loader from '../Loader/Loader';
import { IoDocumentTextOutline, IoMedicalOutline, IoPencil, IoTrashOutline, IoChevronDown } from 'react-icons/io5';
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

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
                  <Loader />
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
                    <div>{patient.NumeroDocumento || '-'}</div>
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

      {/* Mobile collapsible list */}
      <div className={styles.mobileList}>
        {loading ? (
          <div style={{ position: 'relative', minHeight: '200px' }}>
            <Loader />
          </div>
        ) : patients.length === 0 ? (
          <div className={styles.noResults}>No se encontraron pacientes</div>
        ) : (
          patients.map((patient) => {
            const isOpen = expandedId === patient.IDPaciente;
            return (
              <div key={patient.IDPaciente} className={`${styles.mobileItem} ${isOpen ? styles.mobileItemOpen : ''}`}>
                <button
                  className={styles.mobileItemHeader}
                  onClick={() => toggleExpand(patient.IDPaciente)}
                  aria-expanded={isOpen}
                >
                  <div className={styles.mobileItemLeft}>
                    <div className={styles.mobileItemName}>{patient.ApellidoyNombre}</div>
                    <div className={styles.mobileItemTags}>
                      {String(patient.NumeroDocumento || '').trim() && String(patient.NumeroDocumento).trim() !== '0' ? <span className={styles.mobileTag}><span className={styles.mobileTagLabel}>DNI</span> {patient.NumeroDocumento}</span> : null}
                      {String(patient.NumeroHC || '').trim() && String(patient.NumeroHC).trim() !== '0' ? <span className={styles.mobileTag}><span className={styles.mobileTagLabel}>HC</span> {patient.NumeroHC}</span> : null}
                      {patient.Cobertura && <span className={styles.mobileTagAccent}>{patient.Cobertura}</span>}
                    </div>
                  </div>
                  <IoChevronDown size={14} className={`${styles.mobileChevron} ${isOpen ? styles.mobileChevronOpen : ''}`} />
                </button>
                <div className={`${styles.mobileItemBody} ${isOpen ? styles.mobileItemBodyOpen : ''}`}>
                  <div className={styles.mobileDetailRow}>
                    <span className={styles.mobileTag}><span className={styles.mobileTagLabel}>Nac.</span> {formatDate(patient.FechaNacimiento)}</span>
                    <span className={styles.mobileTag}><span className={styles.mobileTagLabel}>Edad</span> {getAgeText(patient.FechaNacimiento)}</span>
                    {patient.Domicilio && <span className={styles.mobileTag}><span className={styles.mobileTagLabel}>Dir.</span> {patient.Domicilio}</span>}
                  </div>
                  <div className={styles.mobileActions}>
                    <button onClick={() => onView(patient)} className={styles.historyButton} title="Ver detalles">
                      <IoDocumentTextOutline size={18} />
                    </button>
                    <button onClick={() => onViewHistory(patient)} className={styles.historyButton} title="Historia clínica">
                      <IoMedicalOutline size={18} />
                    </button>
                    <button onClick={() => onEdit(patient)} className={styles.editButton} title="Editar">
                      <IoPencil size={16} />
                    </button>
                    <button onClick={() => onDelete(patient)} className={styles.deleteButton} title="Eliminar">
                      <IoTrashOutline size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
