'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePatients } from '@/app/hooks/usePatients';
import { Patient } from '@/app/types/PatientInterface';
import { PatientFormData } from '@/app/types/PatientFormInterface';
import PatientList from '@/app/components/Patients/PatientList';
import DeleteConfirmation from '@/app/components/Patients/DeleteConfirmation';
import PatientDetails from '@/app/components/Patients/PatientDetails';
import Modal from '@/app/components/UI/Modal';
import ModalAddPatient from '@/app/components/modals/ModalAddPatient';
import { PatientFormBase } from '@/app/components/Patients/PatientFormBase';
import { SearchInput } from '@/app/components/beds/SearchInput';
import { patientService } from '@/app/services/patientService';
import Loader from '@/app/components/Loader/Loader';
import styles from './patients.module.css';

function PatientsPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const abrioDesdeQuery = useRef(false);

	const {
		patients,
		loading,
		error,
		selectedPatient,
		searchTerm,
		currentPage,
		totalPages,
		totalCount,
		initialized,
		isAddModalOpen,
		isEditModalOpen,
		isDeleteModalOpen,
		isViewModalOpen,
		handlePageChange,
		handleSearch,
		createPatient,
		updatePatient,
		deletePatient,
		initializePatients,
		openAddModal,
		closeAddModal,
		openEditModal,
		closeEditModal,
		openDeleteModal,
		closeDeleteModal,
		openViewModal,
		closeViewModal,
	} = usePatients();

	const handleViewHistory = (patient: Patient) => {
		alert(
			`Ver historia clínica de ${patient.ApellidoyNombre} (Funcionalidad en desarrollo)`,
		);
	};

	const handleNewAdmission = (patient: Patient) => {
		alert(`Nueva admisión para ${patient.ApellidoyNombre} (Funcionalidad en desarrollo)`);
	};

	// Estado para paciente completo (cuando se edita se fuerza re-fetch para tener campos relacionados a selects)
	const [fullPatientEditing, setFullPatientEditing] = useState<Patient | null>(null);
	const [loadingFullPatient, setLoadingFullPatient] = useState(false);

	// Inicializar datos al montar el componente
	useEffect(() => {
		if (!initialized) {
			initializePatients();
		}
	}, [initialized, initializePatients]);

	// Abrir modal de alta si se llegó con ?agregar=1 (desde agenda u otros módulos)
	useEffect(() => {
		if (!initialized || abrioDesdeQuery.current) return;
		const debeAbrir =
			searchParams.get('agregar') === '1' || searchParams.get('nuevo') === '1';
		if (!debeAbrir) return;
		abrioDesdeQuery.current = true;
		openAddModal();
		router.replace('/dashboard/patients', { scroll: false });
	}, [initialized, searchParams, openAddModal, router]);

	// Cuando se abre modal de edición, traer datos completos del backend (garantiza consistencia de selects)
	useEffect(() => {
		(async () => {
			if (isEditModalOpen && selectedPatient) {
				setLoadingFullPatient(true);
				try {
					const p = await patientService.getPatientById(selectedPatient.IDPaciente);
					setFullPatientEditing(p);
				} catch (e) {
					console.error('Error refetching full patient', e);
				} finally {
					setLoadingFullPatient(false);
				}
			} else {
				setFullPatientEditing(null);
			}
		})();
	}, [isEditModalOpen, selectedPatient]);

	console.log('Full patient editing:', fullPatientEditing);

	return (
		<div className={styles.container}>
			<div className={styles.titleRow}>
				<h1 className={styles.title}>Administrador de Pacientes</h1>
				<button
					className={`${styles.addButton} ${styles.addButtonMobile}`}
					onClick={openAddModal}
					aria-label='Agregar nuevo paciente'
				>
					<span className={styles.addIcon}>+</span>
				</button>
			</div>
			<div className={styles.content}>
				<div className={styles.controls}>
					<div className={styles.searchContainer}>
						<SearchInput
							searchTerm={searchTerm}
							setSearchTerm={handleSearch}
							placeholder='Buscar por nombre, DNI, HC o admisión...'
							loading={loading}
							error={error}
							isSearching={!!searchTerm}
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
						<span className={styles.addIcon}>+</span> Agregar paciente
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
						{(loadingFullPatient || !fullPatientEditing) && (
							<div style={{ position: 'relative', minHeight: '200px' }}>
								<Loader />
							</div>
						)}
						{fullPatientEditing && (
							<PatientFormBase
								initialData={fullPatientEditing as any}
								isEditing
								onSubmit={async (data: any) => {
									return updatePatient(fullPatientEditing.IDPaciente, data);
								}}
								onClose={closeEditModal}
								isSubmitting={loading || loadingFullPatient}
							/>
						)}
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

export default function PatientsPage() {
	return (
		<Suspense
			fallback={
				<div className={styles.container}>
					<Loader />
				</div>
			}
		>
			<PatientsPageContent />
		</Suspense>
	);
}
