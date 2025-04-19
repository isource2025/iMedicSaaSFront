import { useState } from 'react';
import { Patient } from '../../types/PatientInterface';
import styles from './PatientList.module.css';
import Pagination from '../UI/Pagination';

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
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
  };

  return (
    <div className={styles.container}>
      {/* Mensaje de error */}
      {error && (
        <div className={styles.errorContainer} role="alert">
          <strong className={styles.errorTitle}>Error!</strong>
          <span className={styles.errorMessage}> {error}</span>
        </div>
      )}
      
      {/* Tabla de pacientes */}
      <div className={styles.tableContainer}>
        <table className={styles.table} aria-label="Lista de pacientes">
          <thead className={styles.tableHeader}>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Nombre y Apellido</th>
              <th scope="col">Domicilio</th>
              <th scope="col">Sexo</th>
              <th scope="col">Número HC</th>
              <th scope="col">Fecha de Nacimiento</th>
              <th scope="col">Estado Civil</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.loadingContainer}>
                  <div className={styles.loadingContent}>
                    <div className={styles.loadingSpinner}></div>
                    <span className={styles.loadingText}>Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.noResults}>No se encontraron pacientes</td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient.IDPaciente} className={styles.tableRow}>
                  <td>{patient.IDPaciente}</td>
                  <td className={styles.patientName}>
                    <button 
                      className={styles.viewButton} 
                      onClick={() => onView(patient)}
                      title="Ver detalles"
                      aria-label={`Ver detalles de ${patient.ApellidoyNombre}`}
                    >
                      {patient.ApellidoyNombre}
                    </button>
                  </td>
                  <td>{patient.Domicilio || '-'}</td>
                  <td>{patient.Sexo}</td>
                  <td>{patient.NumeroHC}</td>
                  <td>{formatDate(patient.FechaNacimiento)}</td>
                  <td>{patient.EstadoCivil || '-'}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => onViewHistory(patient)}
                        className={styles.historyButton}
                        title="Ver historia clínica"
                        aria-label={`Ver historia clínica de ${patient.ApellidoyNombre}`}
                      >
                        📋
                      </button>
                      <button
                        onClick={() => onAdmission(patient)}
                        className={styles.admissionButton}
                        title="Nueva admisión"
                        aria-label={`Nueva admisión para ${patient.ApellidoyNombre}`}
                      >
                        🏥
                      </button>
                      <button
                        onClick={() => onEdit(patient)}
                        className={styles.editButton}
                        title="Editar"
                        aria-label={`Editar ${patient.ApellidoyNombre}`}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(patient)}
                        className={styles.deleteButton}
                        title="Eliminar"
                        aria-label={`Eliminar ${patient.ApellidoyNombre}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
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
