'use client';

import { useState, useEffect } from 'react';
import { usePatients } from '../../hooks/usePatients';
import { Patient } from '../../types/PatientInterface';
import { PatientFormData } from '../../types/PatientFormInterface';
import PatientList from '../../components/Patients/PatientList';
import PatientForm from '../../components/Patients/PatientForm';
import DeleteConfirmation from '../../components/Patients/DeleteConfirmation';
import PatientDetails from '../../components/Patients/PatientDetails';
import Modal from '../../components/UI/Modal';
import ModalAddPatient from '../../components/modals/ModalAddPatient';
import { SearchInput } from '../../components/beds/SearchInput';
import useSearchManager from '../../hooks/useSearchManager';
import { patientService } from '../../services/patientService';
import styles from './patients.module.css';

export default function PatientsPage() {
	const {
		patients: hookPatients,
		loading: hookLoading,
		error: hookError,
		selectedPatient,
		currentPage,
		totalPages,
		isAddModalOpen,
		isEditModalOpen,
		isDeleteModalOpen,
		isViewModalOpen,
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
		closeViewModal,
	} = usePatients();

	// Usar el hook useSearchManager para la búsqueda remota (Contexto 1)
	const {
		searchTerm,
		setSearchTerm,
		results: searchResults,
		loading,
		error,
		isSearching,
	} = useSearchManager<Patient>({
		fetchRemote: (term) => patientService.searchPatients(term),
		searchKeys: ['ApellidoyNombre', 'NumeroDocumento', 'NumeroHC', 'IDPaciente'],
		minSearchLength: 3,
	});

	// Constante para el tamaño de página (debe coincidir con el valor en usePatients)
	const pageSize = 30;

	// Calcular el número total de páginas basado en los resultados actuales
	const calculatedTotalPages = isSearching
		? Math.ceil(searchResults.length / pageSize)
		: totalPages;

	// Asegurarse de que currentPage no exceda el nuevo totalPages
	const adjustedCurrentPage = Math.min(currentPage, Math.max(1, calculatedTotalPages));

	// Paginar los resultados de búsqueda si es necesario
	const paginatedSearchResults = isSearching
		? searchResults.slice(
				(adjustedCurrentPage - 1) * pageSize,
				adjustedCurrentPage * pageSize,
		  )
		: [];

	// Determinar qué pacientes mostrar: resultados de búsqueda paginados o pacientes del hook
	const patients = isSearching ? paginatedSearchResults : hookPatients;

	const handleViewHistory = (patient: Patient) => {
		alert(
			`Ver historia clínica de ${patient.ApellidoyNombre} (Funcionalidad en desarrollo)`,
		);
	};

	const handleNewAdmission = (patient: Patient) => {
		alert(`Nueva admisión para ${patient.ApellidoyNombre} (Funcionalidad en desarrollo)`);
	};

	return (
		<div className={styles.container}>
			<h1 className={styles.title}>Administrador de Pacientes</h1>
			<div className={styles.content}>
				<div className={styles.controls}>
					<div className={styles.searchContainer}>
						<SearchInput
							searchTerm={searchTerm}
							setSearchTerm={setSearchTerm}
							placeholder='Buscar por nombre, DNI, HC o admisión...'
							loading={loading}
							error={error}
							isSearching={isSearching}
							tooltipContent={
								<>
									<p>Buscar pacientes por:</p>
									<ul>
										<li>Nombre y apellido</li>
										<li>Número de documento (DNI)</li>
										<li>Número de historia clínica</li>
										<li>Número de admisión</li>
									</ul>
									<p
										style={{
											fontSize: '0.8rem',
											fontStyle: 'italic',
											marginTop: '0.5rem',
										}}
									>
										Mínimo 3 caracteres
									</p>
								</>
							}
						/>
					</div>
					<button
						className={styles.addButton}
						onClick={openAddModal}
						aria-label='Agregar nuevo paciente'
					>
						<span className={styles.addIcon}>➕</span> Agregar paciente
					</button>
				</div>
				<PatientList
					patients={patients}
					loading={loading}
					error={error}
					currentPage={adjustedCurrentPage}
					totalPages={calculatedTotalPages}
					onPageChange={handlePageChange}
					onEdit={openEditModal}
					onDelete={openDeleteModal}
					onView={openViewModal}
					onAdmission={handleNewAdmission}
					onViewHistory={handleViewHistory}
				/>

				<ModalAddPatient
					isOpen={isAddModalOpen}
					onClose={closeAddModal}
					onSubmit={createPatient}
					isEditing={false}
					isSubmitting={loading}
				/>

				{selectedPatient && (
					<Modal
						isOpen={isEditModalOpen}
						onClose={closeEditModal}
						title='Editar Paciente'
						size='full'
					>
						<PatientForm
							patient={selectedPatient}
							onSubmit={(data) =>
								updatePatient(selectedPatient.IDPaciente, data)
							}
							onCancel={closeEditModal}
							isSubmitting={loading}
						/>
					</Modal>
				)}

				{selectedPatient && (
					<Modal
						isOpen={isDeleteModalOpen}
						onClose={closeDeleteModal}
						title='Eliminar Paciente'
						size='small'
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
						title='Detalles del Paciente'
						size='medium'
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
		</div>
	);
}
