'use client';

import { useMemo, useState } from 'react';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import IndicacionesTable, { IndicacionRow } from './IndicacionesTable';
import { useBedDetail } from '../contexts/BedDetailContext';
import styles from './IndicacionesSection.module.css';
import IndicativoColors from './IdicativosColors';

type IndicacionDTO = {
	id: string;
	cantidad?: number | string;
	descripcion?: string;
	profesional?: string;
	frecuencia?: string;
	observaciones?: string;
	proximo?: string;
	anterior?: string;
	vigenteDesde?: string;
	nro?: number | string;
	idSector?: string;
	medicamento?: string;
};

export default function IndicacionesSection({
	bedId,
	patientId,
	numeroVisita,
}: {
	bedId?: string | number;
	patientId?: string | number;
	numeroVisita: number | null;
}) {
	const { activeSection, selectedDate } = useBedDetail();

	const indicacionesPath = useMemo(
		() => (numeroVisita ? `/indicaciones/${numeroVisita}/byDate` : undefined),
		[numeroVisita],
	);

	const { data, isLoading, error, refetch } = useBedSectionFetch<IndicacionDTO[]>({
		bedId,
		patientId,
		enabled: !!indicacionesPath && activeSection === 'indicaciones',
		endpointOverride: indicacionesPath ? { indicaciones: indicacionesPath } : undefined,
		cacheTimeMs: 15000,
	});

	const baseRows: IndicacionRow[] = useMemo(() => {
		const list = Array.isArray(data) ? data : [];
		return list.map((x) => ({
			id: x.id,
			cantidad: x.cantidad,
			descripcion: x.descripcion,
			profesional: x.profesional,
			frecuencia: x.frecuencia,
			observaciones: x.observaciones,
			proximo: x.proximo ? formatMaybeDate(x.proximo) : undefined,
			anterior: x.anterior ? formatMaybeDate(x.anterior) : undefined,
			vigenteDesde: x.vigenteDesde ? formatMaybeDate(x.vigenteDesde) : undefined,
			nro: x.nro,
			idSector: x.idSector,
			medicamento: x.medicamento,
		}));
	}, [data]);

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	const [helpOpen, setHelpOpen] = useState(false);

	if (activeSection !== 'indicaciones') return null;

	// Filtrado simple por texto
	const rows = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return baseRows;
		return baseRows.filter((r) => {
			const hay = (v?: string | number) =>
				v != null && String(v).toLowerCase().includes(q);
			return (
				hay(r.descripcion) ||
				hay(r.profesional) ||
				hay(r.frecuencia) ||
				hay(r.observaciones) ||
				hay(r.medicamento) ||
				hay(r.idSector) ||
				hay(r.nro)
			);
		});
	}, [baseRows, query]);

	const tableMaxHeight = 'calc(100vh - 15rem)';

	const onAddIndicacion = () => {
		console.log('Agregar indicación');
	};

	return (
		<div className={styles.root}>
			{/* Header local */}
			<div className={styles.header}>
				<strong>Indicaciones</strong>
				<small className={styles.subtitle}>
					{selectedDate ? selectedDate.toLocaleDateString() : '—'}
				</small>
				<button className={styles.refreshBtn} onClick={refetch}>
					Refrescar
				</button>
			</div>

			{/* Toolbar: búsqueda + acciones */}
			<div className={styles.toolbar}>
				<div className={styles.searchWrap}>
					<span className={styles.searchIcon} aria-hidden>
						🔎
					</span>
					<input
						className={styles.searchInput}
						type='text'
						placeholder='Buscar por descripción, profesional, medicamento, sector, nro…'
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>

				<div className={styles.actions}>
					<button
						className={`${styles.btn} ${styles.btnPrimary}`}
						onClick={onAddIndicacion}
					>
						<span className={styles.btnIcon} aria-hidden>
							＋
						</span>
						Agregar indicación
					</button>

					<button
						className={`${styles.btn} ${styles.btnGhost}`}
						onClick={() => setHelpOpen(true)}
						aria-label='Ayuda'
						title='Ayuda'
					>
						<span className={styles.btnIcon} aria-hidden>
							❕
						</span>
					</button>
				</div>
			</div>

			{/* Contenedor flexible para la tabla */}
			<div className={styles.content}>
				<div className={styles.tableHolder}>
					{isLoading && (
						<div className={styles.loadingOverlay}>Cargando indicaciones…</div>
					)}

					{error ? (
						<div className={styles.errorBox}>
							<div>Error cargando indicaciones: {error.message}</div>
						</div>
					) : (
						<IndicacionesTable
							rows={rows}
							selectedId={selectedId}
							onSelectRow={(id) => setSelectedId(id)}
							maxHeight={tableMaxHeight}
						/>
					)}
				</div>
			</div>

			{/* Modal de ayuda (placeholder) */}
			{helpOpen && <IndicativoColors setHelpOpen={setHelpOpen} />}
		</div>
	);
}

function formatMaybeDate(s: string) {
	const d = new Date(s);
	return isNaN(d.getTime()) ? s : d.toLocaleString();
}
