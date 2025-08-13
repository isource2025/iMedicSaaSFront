import { useState, useEffect, useCallback, useMemo } from 'react';
import { Patient, PatientFormData } from '../types/PatientInterface';
import { patientService } from '../services/patientService';
import { useDebounce } from './useDebounce';

export const usePatients = () => {
	// Estados principales
	const [patients, setPatients] = useState<Patient[]>([]);
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

	// Estados para modales
	const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
	const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

	// Estados para paginación
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(30);

	// Aplicar debounce al término de búsqueda
	const debouncedSearchTerm = useDebounce(searchTerm, 500);

	// Cargar pacientes
	const loadPatients = useCallback(
		async (page: number = 1) => {
			try {
				setLoading(true);
				setError(null);
				const data = await patientService.getAllPatients();
				setPatients(data);

				// Simulación de paginación (esto debe hacerse en el backend)
				setTotalPages(Math.ceil(data.length / pageSize));
				setCurrentPage(page);
			} catch (err: any) {
				setError(err.message || 'Error al cargar pacientes');
				console.error('Error loading patients:', err);
			} finally {
				setLoading(false);
			}
		},
		[pageSize],
	);

	// Buscar pacientes
	const searchPatients = useCallback(
		async (term: string) => {
			if (!term.trim()) {
				loadPatients();
				return;
			}

			try {
				setLoading(true);
				setError(null);
				const data = await patientService.searchPatients(term);
				setPatients(data);
				setTotalPages(Math.ceil(data.length / pageSize));
				setCurrentPage(1);
			} catch (err: any) {
				setError(err.message || 'Error al buscar pacientes');
				console.error('Error searching patients:', err);
			} finally {
				setLoading(false);
			}
		},
		[loadPatients, pageSize],
	);

	// Manejar búsqueda
	const handleSearch = useCallback((term: string) => {
		setSearchTerm(term);
	}, []);

	// Crear paciente
	const createPatient = useCallback(
		async (patientData: PatientFormData | any) => {
			try {
				setLoading(true);
				setError(null);
				const file: File | null = patientData._fotoFile || null;
				await patientService.createPatient(patientData, file);
				setIsAddModalOpen(false);
				await loadPatients();
				return true;
			} catch (err: any) {
				setError(err.message || 'Error al crear paciente');
				console.error('Error creating patient:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[loadPatients],
	);

	// Actualizar paciente
	const updatePatient = useCallback(async (id: number, patientData: PatientFormData | any) => {
		try {
			setLoading(true);
			setError(null);
			await patientService.updatePatient(id, patientData);
			setIsEditModalOpen(false);
			await loadPatients();
			return true;
		} catch (err: any) {
			setError(err.message || 'Error al actualizar paciente');
			console.error('Error updating patient:', err);
			return false;
		} finally {
			setLoading(false);
		}
	}, [loadPatients]);

	// Eliminar paciente
	const deletePatient = useCallback(
		async (id: number) => {
			try {
				setLoading(true);
				setError(null);
				await patientService.deletePatient(id);
				setIsDeleteModalOpen(false);
				await loadPatients();
				return true;
			} catch (err: any) {
				setError(err.message || 'Error al eliminar paciente');
				console.error('Error deleting patient:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[loadPatients],
	);

	// Obtener pacientes paginados
	const paginatedPatients = useMemo(() => {
		const startIndex = (currentPage - 1) * pageSize;
		const endIndex = startIndex + pageSize;
		return patients.slice(startIndex, endIndex);
	}, [patients, currentPage, pageSize]);

	// Efecto para manejar cambios en el término de búsqueda debounced
	useEffect(() => {
		if (debouncedSearchTerm) {
			searchPatients(debouncedSearchTerm);
		} else {
			loadPatients();
		}
	}, [debouncedSearchTerm, searchPatients, loadPatients]);

	// Cargar pacientes al montar el componente
	useEffect(() => {
		loadPatients();
	}, [loadPatients]);

	// Funciones para modales
	const openAddModal = () => setIsAddModalOpen(true);
	const closeAddModal = () => setIsAddModalOpen(false);

	const openEditModal = (patient: Patient) => {
		setSelectedPatient(patient);
		setIsEditModalOpen(true);
	};
	const closeEditModal = () => {
		setIsEditModalOpen(false);
		setSelectedPatient(null);
	};

	const openDeleteModal = (patient: Patient) => {
		setSelectedPatient(patient);
		setIsDeleteModalOpen(true);
	};
	const closeDeleteModal = () => {
		setIsDeleteModalOpen(false);
		setSelectedPatient(null);
	};

	const openViewModal = (patient: Patient) => {
		setSelectedPatient(patient);
		setIsViewModalOpen(true);
	};
	const closeViewModal = () => {
		setIsViewModalOpen(false);
		setSelectedPatient(null);
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	return {
		// Datos
		patients: paginatedPatients,
		allPatients: patients,
		selectedPatient,
		searchTerm,
		loading,
		error,

		// Paginación
		currentPage,
		totalPages,
		pageSize,
		handlePageChange,

		// Acciones CRUD
		loadPatients,
		searchPatients,
		handleSearch,
		createPatient,
		updatePatient,
		deletePatient,

		// Estado de modales
		isAddModalOpen,
		isEditModalOpen,
		isDeleteModalOpen,
		isViewModalOpen,

		// Acciones de modales
		openAddModal,
		closeAddModal,
		openEditModal,
		closeEditModal,
		openDeleteModal,
		closeDeleteModal,
		openViewModal,
		closeViewModal,

		// Selección
		setSelectedPatient,
	};
};
