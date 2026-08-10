"use client";

import { useMemo, useState } from 'react';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import { useBedDetail } from '../contexts/BedDetailContext';
import NuevaEpicrisisModal from './NuevaEpicrisisModal';
import { NuevaEpicrisisPayload } from '../../../types/epicrisis';
import ModalBasePaciente from '../../modals/ModalBasePaciente';
import { epicrisisService } from '../../../services/epicrisisService';
import EpicrisisTable, { EpicrisisRow } from './EpicrisisTable';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { generarPDFEpicrisis } from '../../../utils/pdfEpicrisis';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import { usePermiso } from '@/app/hooks/usePermiso';
import { formatSqlDate } from '../../../utils/dateUtils';
import styles from '../evoluciones/EvolucionesSection.module.css';
import Loader from '../../Loader/Loader';

export default function EpicrisisSection({
	numeroVisita,
	patientName,
	documentoPaciente,
	bedSector,
	patientLocation,
}: {
	numeroVisita: number | null;
	patientName?: string;
	documentoPaciente?: string;
	bedSector?: string;
	patientLocation?: string;
}) {
	const { activeSection } = useBedDetail();
	const { puede } = usePermiso();
	const canPrint =
		puede('INTERNACION.EPICRISIS.IMPRIMIR') || puede('INTERNACION.EPICRISIS.VER');
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [printing, setPrinting] = useState(false);
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

	const patientInfo = useMemo(
		() => ({
			nombre: patientName,
			documento: documentoPaciente,
			numeroVisita: numeroVisita ?? undefined,
			ubicacion: patientLocation,
		}),
		[patientName, documentoPaciente, numeroVisita, patientLocation],
	);

	const selectedRow = useMemo(
		() => (selectedId != null ? baseRows.find((r) => r.id === selectedId) ?? null : null),
		[baseRows, selectedId],
	);

	const printEpicrisis = async (row: EpicrisisRow) => {
		setPrinting(true);
		try {
			const empresaInfo = await obtenerInfoEmpresa();
			generarPDFEpicrisis(row, patientInfo, empresaInfo);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : 'No se pudo generar el PDF');
		} finally {
			setPrinting(false);
		}
	};

	const handleExport = async (option: ExportOption, _data: EpicrisisRow[]) => {
		if (option !== 'pdf') return;
		const empresaInfo = await obtenerInfoEmpresa();
		const pdfData = rows.map((row) => [
			row.fecha
				? formatSqlDate(row.fecha, { showTime: false, showDate: true, showYear: true })
				: '—',
			row.hora || '—',
			[row.diagnostico, row.diagnosticoText].filter(Boolean).join(' — ') || '—',
			row.epicrisis
				? row.epicrisis.length > 200
					? `${row.epicrisis.slice(0, 200)}…`
					: row.epicrisis
				: '—',
			row.profesionalNombreCompleto ||
				(row.profesional != null ? `Prof. ${row.profesional}` : '—'),
			row.sectorDescripcion || row.idSector || '—',
		]);

		await exportToPDF({
			title: 'Epicrisis',
			subtitle: numeroVisita ? `Visita: ${numeroVisita}` : undefined,
			headers: ['Fecha', 'Hora', 'Diagnóstico', 'Epicrisis', 'Profesional', 'Sector'],
			data: pdfData,
			fileName: `epicrisis_${numeroVisita || 'visita'}.pdf`,
			orientation: 'landscape',
			empresaInfo,
			patientInfo: {
				numeroVisita: numeroVisita || undefined,
				nombre: patientName,
				numeroDocumento: documentoPaciente,
				ubicacion: patientLocation,
			},
			columnStyles: {
				0: { cellWidth: 22, minCellWidth: 18 },
				1: { cellWidth: 16, minCellWidth: 14 },
				2: { cellWidth: 40, minCellWidth: 32 },
				3: { cellWidth: 80, minCellWidth: 60 },
				4: { cellWidth: 40, minCellWidth: 32 },
				5: { cellWidth: 22, minCellWidth: 18 },
			},
		});
	};

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
					{canPrint && (
						<ExportButton
							data={rows}
							fileName={`epicrisis_${numeroVisita || 'visita'}.pdf`}
							onExport={handleExport}
							options={['pdf']}
						/>
					)}
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
							canPrint={canPrint}
							onPrint={printEpicrisis}
							printing={printing}
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
						{canPrint && selectedRow && (
							<button
								type="button"
								className={`${styles.btn}`}
								disabled={printing}
								onClick={() => void printEpicrisis(selectedRow)}
							>
								{printing ? 'Generando…' : 'Imprimir PDF'}
							</button>
						)}
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
