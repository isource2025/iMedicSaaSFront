import { useState, useCallback } from 'react';
import { Personal, PersonalFormData } from '../types/personal';
import { personalService } from '../services/personalService';

export function usePersonal() {
	const [personalList, setPersonalList] = useState<Personal[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<Personal | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [initialized, setInitialized] = useState(false);

	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);

	const limit = 30;

	const fetchList = useCallback(
		async (page: number, search: string) => {
			try {
				setLoading(true);
				setError(null);
				const result = await personalService.getPersonalList(page, limit, search);
				setPersonalList(result.data);
				setCurrentPage(result.pagination.currentPage);
				setTotalPages(result.pagination.totalPages);
				setTotalCount(result.pagination.totalCount);
			} catch (e: any) {
				setError(e?.message || 'Error al cargar personal');
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const initialize = useCallback(() => {
		if (!initialized) {
			fetchList(1, '');
			setInitialized(true);
		}
	}, [initialized, fetchList]);

	const handlePageChange = (page: number) => fetchList(page, searchTerm);
	const handleSearch = (term: string) => {
		setSearchTerm(term);
		setCurrentPage(1);
		fetchList(1, term);
	};

	const createPersonal = async (data: PersonalFormData): Promise<boolean> => {
		try {
			setLoading(true);
			setError(null);
			await personalService.createPersonal(data);
			await fetchList(currentPage, searchTerm);
			return true;
		} catch (e: any) {
			setError(e?.message || 'Error al crear el personal');
			alert(e?.message || 'Error al crear el personal');
			return false;
		} finally {
			setLoading(false);
		}
	};

	const updatePersonal = async (
		id: number,
		data: PersonalFormData,
	): Promise<boolean> => {
		try {
			setLoading(true);
			setError(null);
			await personalService.updatePersonal(id, data);
			await fetchList(currentPage, searchTerm);
			return true;
		} catch (e: any) {
			setError(e?.message || 'Error al actualizar el personal');
			alert(e?.message || 'Error al actualizar el personal');
			return false;
		} finally {
			setLoading(false);
		}
	};

	const deletePersonal = async (id: number): Promise<boolean> => {
		try {
			setLoading(true);
			setError(null);
			await personalService.deletePersonal(id);
			closeDeleteModal();
			await fetchList(currentPage, searchTerm);
			return true;
		} catch (e: any) {
			setError(e?.message || 'Error al eliminar el personal');
			alert(e?.message || 'Error al eliminar el personal');
			return false;
		} finally {
			setLoading(false);
		}
	};

	const openAddModal = () => {
		setSelected(null);
		setIsAddModalOpen(true);
	};
	const closeAddModal = () => setIsAddModalOpen(false);

	const openEditModal = (p: Personal) => {
		setSelected(p);
		setIsEditModalOpen(true);
	};
	const closeEditModal = () => setIsEditModalOpen(false);

	const openDeleteModal = (p: Personal) => {
		setSelected(p);
		setIsDeleteModalOpen(true);
	};
	const closeDeleteModal = () => setIsDeleteModalOpen(false);

	const openViewModal = (p: Personal) => {
		setSelected(p);
		setIsViewModalOpen(true);
	};
	const closeViewModal = () => setIsViewModalOpen(false);

	const refreshList = useCallback(() => {
		return fetchList(currentPage, searchTerm);
	}, [fetchList, currentPage, searchTerm]);

	return {
		personalList,
		loading,
		error,
		selected,
		searchTerm,
		currentPage,
		totalPages,
		totalCount,
		initialized,
		isAddModalOpen,
		isEditModalOpen,
		isDeleteModalOpen,
		isViewModalOpen,
		initialize,
		handlePageChange,
		handleSearch,
		createPersonal,
		updatePersonal,
		deletePersonal,
		openAddModal,
		closeAddModal,
		openEditModal,
		closeEditModal,
		openDeleteModal,
		closeDeleteModal,
		openViewModal,
		closeViewModal,
		refreshList,
	};
}
