/**
 * Hook personalizado para gestión de rendiciones
 */
import { useState, useCallback } from 'react';
import { Rendicion, RendicionFormData } from '../types/RendicionInterface';
import { rendicionService } from '../services/rendicionService';

export const useRendiciones = () => {
	const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedRendicion, setSelectedRendicion] = useState<Rendicion | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [initialized, setInitialized] = useState(false);
	
	// Estados para filtros
	const [estadoFilter, setEstadoFilter] = useState<string>('all');
	const [periodoFilter, setPeriodoFilter] = useState<{ month: number; year: number } | null>(null);

	// Estados para modales
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);

	/**
	 * Carga rendiciones con paginación y filtros
	 */
	const loadRendiciones = useCallback(async (
		page: number = 1, 
		search: string = '', 
		estado: string = 'all',
		periodo: { month: number; year: number } | null = null
	) => {
		setLoading(true);
		setError(null);

		try {
			const response = await rendicionService.getRendiciones(
				page, 
				30, 
				search, 
				estado,
				periodo?.month || null,
				periodo?.year || null
			);
			setRendiciones(response.data);
			setTotalPages(response.totalPages);
			setTotalCount(response.totalCount);
			setCurrentPage(response.currentPage);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Error al cargar rendiciones';
			setError(errorMessage);
			console.error('Error loading rendiciones:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	/**
	 * Inicializa la carga de rendiciones
	 */
	const initializeRendiciones = useCallback(async () => {
		if (!initialized) {
			await loadRendiciones(1, searchTerm, estadoFilter, periodoFilter);
			setInitialized(true);
		}
	}, [initialized, loadRendiciones, searchTerm, estadoFilter, periodoFilter]);

	/**
	 * Maneja el cambio de página
	 */
	const handlePageChange = useCallback(
		(newPage: number) => {
			setCurrentPage(newPage);
			loadRendiciones(newPage, searchTerm, estadoFilter, periodoFilter);
		},
		[loadRendiciones, searchTerm, estadoFilter, periodoFilter]
	);

	/**
	 * Maneja la búsqueda
	 */
	const handleSearch = useCallback(
		(term: string) => {
			setSearchTerm(term);
			setCurrentPage(1);
			loadRendiciones(1, term, estadoFilter, periodoFilter);
		},
		[loadRendiciones, estadoFilter, periodoFilter]
	);
	
	/**
	 * Maneja el cambio de filtro de estado
	 */
	const handleEstadoFilterChange = useCallback(
		(estado: string) => {
			setEstadoFilter(estado);
			setCurrentPage(1);
			loadRendiciones(1, searchTerm, estado, periodoFilter);
		},
		[loadRendiciones, searchTerm, periodoFilter]
	);
	
	/**
	 * Maneja el cambio de filtro de período
	 */
	const handlePeriodoFilterChange = useCallback(
		(periodo: { month: number; year: number } | null) => {
			setPeriodoFilter(periodo);
			setCurrentPage(1);
			loadRendiciones(1, searchTerm, estadoFilter, periodo);
		},
		[loadRendiciones, searchTerm, estadoFilter]
	);

	/**
	 * Crea una nueva rendición
	 */
	const createRendicion = useCallback(
		async (data: RendicionFormData) => {
			setLoading(true);
			setError(null);

			try {
				await rendicionService.createRendicion(data);
				await loadRendiciones(currentPage, searchTerm, estadoFilter, periodoFilter);
				closeAddModal();
				return true;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Error al crear rendición';
				setError(errorMessage);
				console.error('Error creating rendicion:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[currentPage, searchTerm, estadoFilter, periodoFilter, loadRendiciones]
	);

	/**
	 * Actualiza una rendición existente
	 */
	const updateRendicion = useCallback(
		async (id: number, data: RendicionFormData) => {
			setLoading(true);
			setError(null);

			try {
				await rendicionService.updateRendicion(id, data);
				await loadRendiciones(currentPage, searchTerm, estadoFilter, periodoFilter);
				closeEditModal();
				return true;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Error al actualizar rendición';
				setError(errorMessage);
				console.error('Error updating rendicion:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[currentPage, searchTerm, estadoFilter, periodoFilter, loadRendiciones]
	);

	/**
	 * Elimina una rendición
	 */
	const deleteRendicion = useCallback(
		async (id: number) => {
			setLoading(true);
			setError(null);

			try {
				await rendicionService.deleteRendicion(id);
				await loadRendiciones(currentPage, searchTerm, estadoFilter, periodoFilter);
				closeDeleteModal();
				return true;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Error al eliminar rendición';
				setError(errorMessage);
				console.error('Error deleting rendicion:', err);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[currentPage, searchTerm, estadoFilter, periodoFilter, loadRendiciones]
	);

	// Funciones para manejar modales
	const openAddModal = useCallback(() => {
		setIsAddModalOpen(true);
	}, []);

	const closeAddModal = useCallback(() => {
		setIsAddModalOpen(false);
	}, []);

	const openEditModal = useCallback((rendicion: Rendicion) => {
		setSelectedRendicion(rendicion);
		setIsEditModalOpen(true);
	}, []);

	const closeEditModal = useCallback(() => {
		setIsEditModalOpen(false);
		setSelectedRendicion(null);
	}, []);

	const openDeleteModal = useCallback((rendicion: Rendicion) => {
		setSelectedRendicion(rendicion);
		setIsDeleteModalOpen(true);
	}, []);

	const closeDeleteModal = useCallback(() => {
		setIsDeleteModalOpen(false);
		setSelectedRendicion(null);
	}, []);

	const openViewModal = useCallback((rendicion: Rendicion) => {
		setSelectedRendicion(rendicion);
		setIsViewModalOpen(true);
	}, []);

	const closeViewModal = useCallback(() => {
		setIsViewModalOpen(false);
		setSelectedRendicion(null);
	}, []);

	return {
		rendiciones,
		loading,
		error,
		selectedRendicion,
		searchTerm,
		currentPage,
		totalPages,
		totalCount,
		initialized,
		estadoFilter,
		periodoFilter,
		isAddModalOpen,
		isEditModalOpen,
		isDeleteModalOpen,
		isViewModalOpen,
		handlePageChange,
		handleSearch,
		handleEstadoFilterChange,
		handlePeriodoFilterChange,
		createRendicion,
		updateRendicion,
		deleteRendicion,
		initializeRendiciones,
		openAddModal,
		closeAddModal,
		openEditModal,
		closeEditModal,
		openDeleteModal,
		closeDeleteModal,
		openViewModal,
		closeViewModal,
	};
};
