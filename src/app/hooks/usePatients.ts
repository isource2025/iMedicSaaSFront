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
	const [totalCount, setTotalCount] = useState<number>(0);
	const [pageSize, setPageSize] = useState<number>(30);

	// Aplicar debounce al término de búsqueda
	const debouncedSearchTerm = useDebounce(searchTerm, 500);

	// Cargar pacientes con paginación del servidor
	const loadPatients = useCallback(
		async (page: number = 1, search: string = '') => {
			try {
				setLoading(true);
				setError(null);
				
				const result = await patientService.getAllPatients(page, pageSize, search);
				setPatients(result.data);
				setCurrentPage(result.pagination.currentPage);
				setTotalPages(result.pagination.totalPages);
				setTotalCount(result.pagination.totalCount);
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
				loadPatients(1, '');
				return;
			}

			// Usar loadPatients con el término de búsqueda
			await loadPatients(1, term);
		},
		[loadPatients],
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
				// Recargar la página actual con el término de búsqueda actual
				await loadPatients(currentPage, searchTerm);
				return true;
			} catch (err: any) {
				setError(err.message || 'Error al crear paciente');
				console.error('Error creating patient:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[loadPatients, currentPage, searchTerm],
	);

	// Actualizar paciente
	const updatePatient = useCallback(
		async (id: number, patientData: PatientFormData | any) => {
			try {
				setLoading(true);
				setError(null);
				await patientService.updatePatient(id, patientData);
				setIsEditModalOpen(false);
				// Recargar la página actual con el término de búsqueda actual
				await loadPatients(currentPage, searchTerm);
				return true;
			} catch (err: any) {
				setError(err.message || 'Error al actualizar paciente');
				console.error('Error updating patient:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[loadPatients, currentPage, searchTerm],
	);

	// Eliminar paciente
	const deletePatient = useCallback(
		async (id: number) => {
			try {
				setLoading(true);
				setError(null);
				await patientService.deletePatient(id);
				setIsDeleteModalOpen(false);
				// Recargar la página actual con el término de búsqueda actual
				await loadPatients(currentPage, searchTerm);
				return true;
			} catch (err: any) {
				setError(err.message || 'Error al eliminar paciente');
				console.error('Error deleting patient:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[loadPatients, currentPage, searchTerm],
	);

	// Efecto para manejar cambios en el término de búsqueda debounced
	useEffect(() => {
		if (debouncedSearchTerm) {
			searchPatients(debouncedSearchTerm);
		} else {
			loadPatients(1, '');
		}
	}, [debouncedSearchTerm, searchPatients, loadPatients]);

	// Cargar pacientes al montar el componente
	useEffect(() => {
		loadPatients(1, '');
	}, []);

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

	const handlePageChange = useCallback((page: number) => {
		loadPatients(page, searchTerm);
	}, [loadPatients, searchTerm]);

	return {
		// Datos
		patients,
		selectedPatient,
		searchTerm,
		loading,
		error,

		// Paginación
		currentPage,
		totalPages,
		totalCount,
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
