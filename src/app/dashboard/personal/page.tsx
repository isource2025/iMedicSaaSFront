'use client';

import { useEffect, useState } from 'react';
import { usePersonal } from '@/app/hooks/usePersonal';
import { Personal } from '@/app/types/personal';
import PersonalList from '@/app/components/Personal/PersonalList';
import PersonalActionModals, {
	type PersonalExtraKind,
} from '@/app/components/Personal/PersonalActionModals';
import PersonalForm from '@/app/components/Personal/PersonalForm';
import PersonalDetails from '@/app/components/Personal/PersonalDetails';
import DeletePersonalConfirmation from '@/app/components/Personal/DeletePersonalConfirmation';
import Modal from '@/app/components/UI/Modal';
import { SearchInput } from '@/app/components/beds/SearchInput';
import Loader from '@/app/components/Loader/Loader';
import { personalService } from '@/app/services/personalService';
import styles from './personal.module.css';

export default function PersonalPage() {
	const {
		personalList,
		loading,
		error,
		selected,
		searchTerm,
		currentPage,
		totalPages,
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
	} = usePersonal();

	const [fullPersonalEditing, setFullPersonalEditing] = useState<Personal | null>(null);
	const [extraModal, setExtraModal] = useState<{
		kind: PersonalExtraKind;
		personal: Personal;
	} | null>(null);
	const [loadingFull, setLoadingFull] = useState(false);

	useEffect(() => {
		if (!initialized) initialize();
	}, [initialized, initialize]);

	useEffect(() => {
		(async () => {
			if (isEditModalOpen && selected) {
				setLoadingFull(true);
				try {
					const p = await personalService.getPersonalById(selected.Valor);
					setFullPersonalEditing(p);
				} catch (e) {
					console.error('refetch personal', e);
				} finally {
					setLoadingFull(false);
				}
			} else {
				setFullPersonalEditing(null);
			}
		})();
	}, [isEditModalOpen, selected]);

	return (
		<div className={styles.container}>
			<div className={styles.titleRow}>
				<h1 className={styles.title}>Administrador de Personal</h1>
				<button
					className={`${styles.addButton} ${styles.addButtonMobile}`}
					onClick={openAddModal}
					aria-label='Agregar personal'
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
							placeholder='Buscar por nombre, DNI o ID...'
							loading={loading}
							error={error}
							isSearching={!!searchTerm}
							tooltipContent={
								<>
									<p>Buscar personal por:</p>
									<ul>
										<li>Apellido y nombre</li>
										<li>Número de documento (DNI)</li>
										<li>ID interno</li>
									</ul>
								</>
							}
						/>
					</div>
					<button
						className={styles.addButton}
						onClick={openAddModal}
						aria-label='Agregar personal'
					>
						<span className={styles.addIcon}>+</span> Agregar personal
					</button>
				</div>

				<PersonalList
					personalList={personalList}
					loading={loading}
					error={error}
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={handlePageChange}
					onEdit={openEditModal}
					onDelete={openDeleteModal}
					onView={openViewModal}
					onOpenExtra={(p, kind) => setExtraModal({ personal: p, kind })}
				/>

				<PersonalActionModals
					open={!!extraModal}
					kind={extraModal?.kind ?? null}
					personal={extraModal?.personal ?? null}
					onClose={() => setExtraModal(null)}
					onSaved={refreshList}
				/>

				<Modal
					isOpen={isAddModalOpen}
					onClose={closeAddModal}
					title='Nuevo Personal'
					size='xlarge'
				>
					<PersonalForm
						onSubmit={createPersonal}
						onCancel={closeAddModal}
						isSubmitting={loading}
					/>
				</Modal>

				{selected && (
					<Modal
						isOpen={isEditModalOpen}
						onClose={closeEditModal}
						title='Editar Personal'
						size='xlarge'
					>
						{(loadingFull || !fullPersonalEditing) && (
							<div style={{ position: 'relative', minHeight: '200px' }}>
								<Loader />
							</div>
						)}
						{fullPersonalEditing && (
							<PersonalForm
								personal={fullPersonalEditing}
								isEditing
								onSubmit={async (data) =>
									updatePersonal(fullPersonalEditing.Valor, data)
								}
								onCancel={closeEditModal}
								isSubmitting={loading || loadingFull}
							/>
						)}
					</Modal>
				)}

				{selected && (
					<Modal
						isOpen={isDeleteModalOpen}
						onClose={closeDeleteModal}
						title='Eliminar Personal'
						size='small'
					>
						<DeletePersonalConfirmation
							personal={selected}
							onConfirm={() => deletePersonal(selected.Valor)}
							onCancel={closeDeleteModal}
							isDeleting={loading}
						/>
					</Modal>
				)}

				{selected && (
					<Modal
						isOpen={isViewModalOpen}
						onClose={closeViewModal}
						title='Detalle del personal'
						size='large'
					>
						<PersonalDetails
							personal={selected}
							onClose={closeViewModal}
							onEdit={() => {
								closeViewModal();
								openEditModal(selected);
							}}
						/>
					</Modal>
				)}
			</div>
		</div>
	);
}
