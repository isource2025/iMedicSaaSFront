'use client';

import { useState } from 'react';
import { usePatients } from '../../hooks/usePatients';
import { Patient } from '../../types/PatientInterface';
import PatientList from '../../components/Patients/PatientList';
import PatientForm from '../../components/Patients/PatientForm';
import DeleteConfirmation from '../../components/Patients/DeleteConfirmation';
import PatientDetails from '../../components/Patients/PatientDetails';
import Modal from '../../components/UI/Modal';
import PatientSearchBar from '../../components/Patients/PatientSearchBar';
import styles from './patients.module.css';

export default function PatientsPage() {
  const {
    patients,
    searchTerm,
    loading,
    error,
    selectedPatient,
    currentPage,
    totalPages,
    isAddModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    isViewModalOpen,
    handleSearch,
    handlePageChange,
    createPatient,
    updatePatient,
    deletePatient,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    openViewModal,
    closeViewModal
  } = usePatients();

  const handleViewHistory = (patient: Patient) => {
    alert(`Ver historia clínica de ${patient.ApellidoyNombre} (Funcionalidad en desarrollo)`);
  };

  const handleNewAdmission = (patient: Patient) => {
    alert(`Nueva admisión para ${patient.ApellidoyNombre} (Funcionalidad en desarrollo)`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Administración de Pacientes</h1>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Buscar por nombre o historia clínica"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
        />
        <button
          className={styles.addButton}
          onClick={openAddModal}
          aria-label="Agregar nuevo paciente"
        >
          <span className={styles.addIcon}>➕</span> Agregar paciente
        </button>
      </div>
      <PatientList 
        patients={patients}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onView={openViewModal}
        onAdmission={handleNewAdmission}
        onViewHistory={handleViewHistory}
      />

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={closeAddModal} 
        title="Añadir Paciente"
        size="medium"
      >
        <PatientForm 
          onSubmit={createPatient} 
          onCancel={closeAddModal} 
          isSubmitting={loading} 
        />
      </Modal>

      {selectedPatient && (
        <Modal 
          isOpen={isEditModalOpen} 
          onClose={closeEditModal} 
          title="Editar Paciente"
          size="medium" 
        >
          <PatientForm 
            patient={selectedPatient} 
            onSubmit={(data) => updatePatient(selectedPatient.IDPaciente, data)} 
            onCancel={closeEditModal} 
            isSubmitting={loading} 
          />
        </Modal>
      )}

      {selectedPatient && (
        <Modal 
          isOpen={isDeleteModalOpen} 
          onClose={closeDeleteModal} 
          title="Eliminar Paciente"
          size="small" 
        >
          <DeleteConfirmation 
            patient={selectedPatient}
            onConfirm={() => deletePatient(selectedPatient.IDPaciente)}
            onCancel={closeDeleteModal}
            isDeleting={loading}
          />
        </Modal>
      )}

      {selectedPatient && (
        <Modal 
          isOpen={isViewModalOpen} 
          onClose={closeViewModal} 
          title="Detalles del Paciente"
          size="medium" 
        >
          <PatientDetails 
            patient={selectedPatient}
            onClose={closeViewModal}
            onEdit={() => {
              closeViewModal();
              openEditModal(selectedPatient);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
