import { useState, useEffect, useCallback, useRef } from 'react';
import { Patient, PatientFormData } from '../types/PatientInterface';
import { patientService } from '../services/patientService';
import { useDebounce } from './useDebounce';

export const usePatients = () => {
	// Estados principales
	const [patients, setPatients] = useState<Patient[]>([]);
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [initialized, setInitialized] = useState<boolean>(false);

	// Estados para modales
	const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
	const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

	// Estados para paginación
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [totalCount, setTotalCount] = useState<number>(0);
	const pageSize = 30;

	// Aplicar debounce al término de búsqueda
	const debouncedSearchTerm = useDebounce(searchTerm, 500);
	
	// Refs para evitar bucles infinitos
	const isLoadingRef = useRef(false);
	const currentPageRef = useRef(1);
	const searchTermRef = useRef('');

	// Cargar pacientes con paginación del servidor
	const loadPatients = useCallback(
		async (page: number = 1, search: string = '') => {
			if (isLoadingRef.current) return;
			
			try {
				isLoadingRef.current = true;
				setLoading(true);
				setError(null);
				
				currentPageRef.current = page;
				searchTermRef.current = search;
				
				const result = await patientService.getAllPatients(page, pageSize, search);
				setPatients(result.data);
				setCurrentPage(result.pagination.currentPage);
				setTotalPages(result.pagination.totalPages);
				setTotalCount(result.pagination.totalCount);
				setInitialized(true);
			} catch (err: any) {
				setError(err.message || 'Error al cargar pacientes');
				console.error('Error loading patients:', err);
				setPatients([]);
				setCurrentPage(1);
				setTotalPages(1);
				setTotalCount(0);
			} finally {
				setLoading(false);
				isLoadingRef.current = false;
			}
		},
		[],
	);

	// Buscar pacientes - solo cuando se solicite explícitamente
	const searchPatients = useCallback(
		async (term: string) => {
			if (!term.trim()) {
				// Si se limpia la búsqueda, volver a la primera página sin búsqueda
				setCurrentPage(1);
				await loadPatients(1, '');
				return;
			}

			// Resetear página al buscar
			setCurrentPage(1);
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
				// Recargar usando refs para evitar dependencias
				await loadPatients(currentPageRef.current, searchTermRef.current);
				return true;
			} catch (err: any) {
				setError(err.message || 'Error al crear paciente');
				console.error('Error creating patient:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	// Actualizar paciente
	const updatePatient = useCallback(
		async (id: number, patientData: PatientFormData | any) => {
			try {
				setLoading(true);
				setError(null);
				await patientService.updatePatient(id, patientData);
				setIsEditModalOpen(false);
				// Recargar usando refs para evitar dependencias
				await loadPatients(currentPageRef.current, searchTermRef.current);
				return true;
			} catch (err: any) {
				setError(err.message || 'Error al actualizar paciente');
				console.error('Error updating patient:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	// Eliminar paciente
	const deletePatient = useCallback(
		async (id: number) => {
			try {
				setLoading(true);
				setError(null);
				await patientService.deletePatient(id);
				setIsDeleteModalOpen(false);
				// Recargar usando refs para evitar dependencias
				await loadPatients(currentPageRef.current, searchTermRef.current);
				return true;
			} catch (err: any) {
				setError(err.message || 'Error al eliminar paciente');
				console.error('Error deleting patient:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	// Efecto para manejar cambios en el término de búsqueda debounced - SIN DEPENDENCIAS CIRCULARES
	useEffect(() => {
		if (!initialized) return;
		
		if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) {
			// Buscar directamente sin usar searchPatients para evitar bucles
			setCurrentPage(1);
			loadPatients(1, debouncedSearchTerm);
		} else if (searchTerm === '' && searchTermRef.current !== '') {
			// Solo recargar si se limpió la búsqueda y antes tenía contenido
			loadPatients(1, '');
		}
	}, [debouncedSearchTerm, searchTerm, initialized]);

	// Función para inicializar datos - llamada manualmente
	const initializePatients = useCallback(() => {
		if (!initialized && !isLoadingRef.current) {
			loadPatients(1, '');
		}
	}, [initialized]);

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
		loadPatients(page, debouncedSearchTerm || searchTerm);
	}, [debouncedSearchTerm, searchTerm]);

	return {
		// Datos
		patients,
		selectedPatient,
		searchTerm,
		loading,
		error,
		initialized,

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
		initializePatients,

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
