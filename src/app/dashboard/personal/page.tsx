'use client';

import { useEffect, useState } from 'react';
import { usePersonal } from '@/app/hooks/usePersonal';
import { Personal } from '@/app/types/personal';
import PersonalList from '@/app/components/Personal/PersonalList';
import PersonalExportModal, {
	type ExportFieldOption,
} from '@/app/components/Personal/PersonalExportModal';
import PersonalForm from '@/app/components/Personal/PersonalForm';
import DeletePersonalConfirmation from '@/app/components/Personal/DeletePersonalConfirmation';
import SyncFisicoInforme from '@/app/components/Personal/SyncFisicoInforme';
import Modal from '@/app/components/UI/Modal';
import { SearchInput } from '@/app/components/beds/SearchInput';
import { personalService } from '@/app/services/personalService';
import type {
	CuentaSoloNube,
	SyncFisicoInforme as SyncFisicoInformeData,
} from '@/app/services/personalService';
import { downloadPersonalExcel } from '@/app/utils/downloadPersonalExcel';
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
		refreshList,
	} = usePersonal();

	const [fullPersonalEditing, setFullPersonalEditing] = useState<Personal | null>(null);
	const [syncDisponible, setSyncDisponible] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [syncResult, setSyncResult] = useState<{
		ok: boolean;
		informe?: SyncFisicoInformeData;
		error?: string;
	} | null>(null);
	const [exportOpen, setExportOpen] = useState(false);
	const [exportFields, setExportFields] = useState<ExportFieldOption[]>([]);
	const [exporting, setExporting] = useState(false);
	const [huerfanos, setHuerfanos] = useState<CuentaSoloNube[]>([]);
	const [reparandoHuerfanos, setReparandoHuerfanos] = useState(false);
	const [huerfanosMsg, setHuerfanosMsg] = useState<string | null>(null);

	const cargarHuerfanos = async () => {
		try {
			const rows = await personalService.getCuentasSoloNube();
			setHuerfanos(rows);
		} catch {
			setHuerfanos([]);
		}
	};

	useEffect(() => {
		if (!initialized) initialize();
	}, [initialized, initialize]);

	useEffect(() => {
		(async () => {
			try {
				const estado = await personalService.getSyncFisicoEstado();
				setSyncDisponible(!!estado.disponible);
			} catch {
				setSyncDisponible(false);
			}
			try {
				const fields = await personalService.getExportFields();
				setExportFields(fields);
			} catch (e) {
				console.error('export fields', e);
			}
			await cargarHuerfanos();
		})();
	}, []);

	useEffect(() => {
		(async () => {
			if (isEditModalOpen && selected) {
				try {
					const p = await personalService.getPersonalById(selected.Valor);
					setFullPersonalEditing(p);
				} catch (e) {
					console.error('refetch personal', e);
				}
			} else {
				setFullPersonalEditing(null);
			}
		})();
	}, [isEditModalOpen, selected]);

	const handleSyncFisico = async () => {
		if (syncing) return;
		setSyncing(true);
		setSyncResult(null);
		try {
			const resumen = await personalService.syncDesdeFisico();
			const usuarios = resumen.informe?.usuarios?.length
				? resumen.informe.usuarios
				: resumen.usuarios || [];
			const informe = {
				mensaje:
					resumen.informe?.mensaje ||
					(resumen.sinCambios
						? 'La nube ya estaba al día. No hubo cambios respecto a la base física.'
						: 'Se aplicaron cambios desde la base física.'),
				sinCambios: resumen.informe ? resumen.informe.sinCambios : !!resumen.sinCambios,
				items: resumen.informe?.items || [],
				usuarios,
				catalogoSectores: resumen.informe?.catalogoSectores || [],
				catalogoServicios: resumen.informe?.catalogoServicios || [],
				roles: resumen.informe?.roles,
			};
			setSyncResult({ ok: true, informe });
			await refreshList();
			await cargarHuerfanos();
		} catch (e) {
			setSyncResult({
				ok: false,
				error: e instanceof Error ? e.message : 'Error al sincronizar',
			});
		} finally {
			setSyncing(false);
		}
	};

	const handleExport = async (campos: string[]) => {
		setExporting(true);
		try {
			const data = await personalService.exportarPersonal(campos);
			const stamp = new Date().toISOString().slice(0, 10);
			downloadPersonalExcel(data.columns, data.rows, `personal_${stamp}.xlsx`);
			setExportOpen(false);
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Error al exportar');
		} finally {
			setExporting(false);
		}
	};

	const handleCreatePersonal = async (data: Parameters<typeof createPersonal>[0]) => {
		const created = await createPersonal(data);
		await cargarHuerfanos();
		return created;
	};

	const handleRepararHuerfanos = async () => {
		if (reparandoHuerfanos) return;
		setReparandoHuerfanos(true);
		setHuerfanosMsg(null);
		try {
			const result = await personalService.repararCuentasSoloNube();
			const n = result.reparados.length;
			const err = result.errores.length;
			setHuerfanosMsg(
				n === 0 && err === 0
					? 'No había fichas para restaurar.'
					: err
					  ? `Se restauraron ${n} en el hospital. ${err} no se pudieron reparar.`
					  : `Se restauraron ${n} ficha(s) en la base del hospital.`,
			);
			await refreshList();
			await cargarHuerfanos();
		} catch (e) {
			setHuerfanosMsg(e instanceof Error ? e.message : 'Error al reparar');
		} finally {
			setReparandoHuerfanos(false);
		}
	};

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

			{huerfanos.length > 0 && (
				<div className={styles.orphanBanner} role='alert'>
					<div className={styles.orphanBannerText}>
						<strong>
							{huerfanos.length === 1
								? 'Hay 1 usuario que puede entrar al sistema pero no está en esta tabla.'
								: `Hay ${huerfanos.length} usuarios que pueden entrar al sistema pero no están en esta tabla.`}
						</strong>
						<p>
							Quedaron en la nube sin ficha en la base del hospital.{' '}
							{huerfanos
								.slice(0, 4)
								.map((h) => h.apellidoNombre || h.nombreRed || `ID ${h.valor}`)
								.join(', ')}
							{huerfanos.length > 4 ? '…' : '.'}
						</p>
						{huerfanosMsg ? <p className={styles.orphanBannerMsg}>{huerfanosMsg}</p> : null}
					</div>
					<button
						type='button'
						className={styles.orphanBannerBtn}
						onClick={handleRepararHuerfanos}
						disabled={reparandoHuerfanos}
					>
						{reparandoHuerfanos ? 'Restaurando…' : 'Restaurar en el hospital'}
					</button>
				</div>
			)}

			<div className={styles.content}>
				<div className={styles.controls}>
					<div className={styles.searchContainer}>
						<SearchInput
							searchTerm={searchTerm}
							setSearchTerm={handleSearch}
							placeholder='Buscar por nombre, DNI, ID o usuario...'
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
										<li>Usuario de acceso (NombreRed)</li>
									</ul>
								</>
							}
						/>
					</div>
					<div className={styles.toolbarActions}>
						{syncDisponible && (
							<button
								type='button'
								className={styles.secondaryButton}
								onClick={handleSyncFisico}
								disabled={syncing}
							>
								{syncing ? 'Actualizando…' : 'Actualizar desde base física'}
							</button>
						)}
						<button
							type='button'
							className={styles.secondaryButton}
							onClick={() => setExportOpen(true)}
						>
							Exportar a Excel
						</button>
						<button
							className={styles.addButton}
							onClick={openAddModal}
							aria-label='Agregar personal'
						>
							<span className={styles.addIcon}>+</span> Agregar personal
						</button>
					</div>
				</div>

				<PersonalList
					personalList={personalList}
					loading={loading}
					error={error}
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={handlePageChange}
					onEdit={openEditModal}
				/>

				<Modal
					isOpen={!!syncResult}
					onClose={() => setSyncResult(null)}
					title={
						syncResult?.ok
							? `Actualización desde base física${
									syncResult.informe?.usuarios?.length
										? ` · ${syncResult.informe.usuarios.length} personas`
										: ''
							  }`
							: 'Error al actualizar'
					}
					size={syncResult?.ok ? 'large' : 'small'}
				>
					{syncResult?.ok && syncResult.informe ? (
						<SyncFisicoInforme
							informe={syncResult.informe}
							onClose={() => setSyncResult(null)}
						/>
					) : (
						<div className={styles.syncResultBody}>
							<p className={styles.syncResultError}>
								{syncResult?.error || 'No se pudo completar la actualización.'}
							</p>
							<button
								type='button'
								className={styles.syncResultOk}
								onClick={() => setSyncResult(null)}
							>
								Aceptar
							</button>
						</div>
					)}
				</Modal>

				<PersonalExportModal
					open={exportOpen}
					fields={exportFields}
					loading={exporting}
					onClose={() => setExportOpen(false)}
					onConfirm={handleExport}
				/>

				<Modal
					isOpen={isAddModalOpen}
					onClose={closeAddModal}
					title='Nuevo Personal'
					size='xlarge'
				>
					<PersonalForm
						onSubmit={handleCreatePersonal}
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
						<PersonalForm
								personal={fullPersonalEditing || selected}
								isEditing
								onSubmit={async (data) =>
									updatePersonal((fullPersonalEditing || selected).Valor, data)
								}
								onCancel={closeEditModal}
								onDelete={() => {
									closeEditModal();
									openDeleteModal(fullPersonalEditing || selected);
								}}
								isSubmitting={loading}
							/>
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
			</div>
		</div>
	);
}
