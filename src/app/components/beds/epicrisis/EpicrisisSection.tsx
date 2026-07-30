"use client";

import { useMemo, useState } from 'react';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import { useBedDetail } from '../contexts/BedDetailContext';
import NuevaEpicrisisModal from './NuevaEpicrisisModal';
import { NuevaEpicrisisPayload } from '../../../types/epicrisis';
import ModalBasePaciente from '../../modals/ModalBasePaciente';
import { epicrisisService } from '../../../services/epicrisisService';
import EpicrisisTable, { EpicrisisRow } from './EpicrisisTable';
import styles from '../evoluciones/EvolucionesSection.module.css';
import Loader from '../../Loader/Loader';

export default function EpicrisisSection({
	numeroVisita,
	patientName,
	documentoPaciente,
	bedSector,
}: {
	numeroVisita: number | null;
	patientName?: string;
	documentoPaciente?: string;
	bedSector?: string;
}) {
	const { activeSection } = useBedDetail();
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [query, setQuery] = useState('');

	const epicrisisPath = useMemo(
		() => (numeroVisita ? `/epicrisis/${numeroVisita}` : undefined),
		[numeroVisita],
	);

	const { data, isLoading, error, refetch } = useBedSectionFetch<any>({
		enabled: !!epicrisisPath && activeSection === 'epicrisis',
		endpointOverride: epicrisisPath ? { epicrisis: epicrisisPath } : undefined,
		cacheTimeMs: 20000,
	});

	const baseRows: EpicrisisRow[] = useMemo(() => {
		const list: any[] = Array.isArray(data)
			? data
			: data && Array.isArray(data.data)
				? data.data
				: [];

		return list.map((x) => ({
			id: Number(x.IdHCEpicrisis ?? x.idHCEpicrisis),
			idHCEpicrisis: Number(x.IdHCEpicrisis ?? x.idHCEpicrisis),
			idVisita: Number(x.IdVisita ?? x.idVisita),
			nroHC: x.NroHC ?? x.nroHC,
			fecha: x.Fecha ?? x.fecha,
			hora: x.Hora ?? x.hora,
			idSector: x.IdSector ?? x.idSector,
			sectorDescripcion: x.SectorDescripcion ?? x.sectorDescripcion,
			profesional: x.Profecional ?? x.profesional,
			profesionalNombreCompleto:
				x.ProfesionalNombreCompleto ?? x.profesionalNombreCompleto,
			epicrisis: x.Epicrisis ?? x.epicrisis ?? '',
			numeroDocumento: x.NumeroDocumento ?? x.numeroDocumento,
			diagnostico: x.Diagnostico ?? x.diagnostico ?? '',
			diagnosticoText: x.DiagnosticoText ?? x.diagnosticoText ?? '',
		}));
	}, [data]);

	const rows = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return baseRows;
		return baseRows.filter((r) => {
			const hay = (v?: string | number | null) =>
				v != null && String(v).toLowerCase().includes(q);
			return (
				hay(r.epicrisis) ||
				hay(r.diagnostico) ||
				hay(r.diagnosticoText) ||
				hay(r.profesionalNombreCompleto) ||
				hay(r.idSector)
			);
		});
	}, [baseRows, query]);

	if (activeSection !== 'epicrisis') return null;

	const closeModal = () => {
		setModalOpen(false);
		setSelectedId(null);
	};

	const handleSave = async (payload: NuevaEpicrisisPayload) => {
		setSaving(true);
		try {
			const finalPayload: NuevaEpicrisisPayload = {
				...payload,
				IdVisita: payload.IdVisita ?? numeroVisita ?? 0,
			};
			if (selectedId) {
				await epicrisisService.actualizar(selectedId, finalPayload);
			} else {
				await epicrisisService.crear(finalPayload);
			}
			return finalPayload;
		} catch (err) {
			if (err instanceof Error) alert(err.message);
			throw err;
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className={styles.root}>
			<div className={styles.dateHeader}>
				<h2 className={styles.sectionTitle}>Epicrisis</h2>
				<span className={styles.dateText}>
					{patientName ? `Paciente: ${patientName}` : 'Resumen del episodio de hospitalización'}
				</span>
				<div className={styles.dateActions}>
					<button
						className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
						onClick={() => {
							setSelectedId(null);
							setModalOpen(true);
						}}
					>
						<span className={styles.addIcon} aria-hidden>
							+
						</span>
						Epicrisis
					</button>
				</div>
			</div>

			<div className={styles.toolbar}>
				<div className={styles.searchWrap}>
					<span className={styles.searchIcon}>🔍</span>
					<input
						type="text"
						placeholder="Buscar por texto, diagnóstico, profesional…"
						className={styles.searchInput}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</div>

			<div className={styles.content}>
				<div className={styles.tableHolder}>
					{isLoading && (
						<div style={{ position: 'relative', minHeight: '200px' }}>
							<Loader />
						</div>
					)}
					{error && (
						<div className={styles.errorBox}>
							Error al cargar epicrisis: {error.message}
						</div>
					)}
					{!isLoading && !error && (
						<EpicrisisTable
							rows={rows}
							onSelectRow={setSelectedId}
							selectedId={selectedId}
							refetch={refetch}
						/>
					)}
				</div>
			</div>

			<ModalBasePaciente
				numeroVisita={numeroVisita ? String(numeroVisita) : ''}
				onClose={closeModal}
				isOpen={modalOpen || selectedId !== null}
				titulo={selectedId != null ? 'Editando Epicrisis' : 'Nueva Epicrisis'}
				footerButtons={
					<>
						<button
							className={`${styles.btn} ${styles.btnPrimary}`}
							type="submit"
							form="nueva-epicrisis-form"
							disabled={saving}
						>
							{saving ? 'Guardando…' : selectedId != null ? 'Actualizar' : 'Guardar'}
						</button>
					</>
				}
			>
				<NuevaEpicrisisModal
					onClose={closeModal}
					onSave={handleSave}
					defaultIdVisita={numeroVisita}
					documentoPaciente={documentoPaciente}
					bedSector={bedSector}
					idEpicrisis={selectedId}
					refetch={refetch}
				/>
			</ModalBasePaciente>
		</div>
	);
}
