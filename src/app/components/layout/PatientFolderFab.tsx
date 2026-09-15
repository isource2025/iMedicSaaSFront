'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { admissionSearchService, type AdmissionSearchRow } from '@/app/services/admissionSearchService';
import AdmissionVisitDetailModal from '@/app/components/admission/AdmissionVisitDetailModal';
import PatientFolderVisitsModal from '@/app/components/admission/PatientFolderVisitsModal';
import { useAdmissionVisitDetail } from '@/app/hooks/useAdmissionVisitDetail';
import { usePermiso } from '@/app/hooks/usePermiso';
import { interpretarBusquedaUnificada } from '@/app/utils/busquedaPaciente';
import styles from './PatientFolderFab.module.css';

type Carpeta = {
	patient: AdmissionSearchRow;
	visits: AdmissionSearchRow[];
};

export default function PatientFolderFab({ stack = false }: { stack?: boolean }) {
	const { puede, loaded } = usePermiso();
	const canUse = loaded && puede('ADMISION.BUSQUEDA.VER');

	const [expanded, setExpanded] = useState(false);
	const [termino, setTermino] = useState('');
	const [searching, setSearching] = useState(false);
	const [searchError, setSearchError] = useState('');
	const [hits, setHits] = useState<Carpeta[]>([]);
	const [folderModal, setFolderModal] = useState<Carpeta | null>(null);

	const {
		selectedVisit,
		detailData,
		loadingDetail,
		detailModalOpen,
		detailError,
		openVisitDetail,
		closeVisitDetail,
		reloadVisitDetail,
	} = useAdmissionVisitDetail();

	const inputRef = useRef<HTMLInputElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (expanded) {
			window.setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [expanded]);

	useEffect(() => {
		if (!expanded) return;
		const onDoc = (e: MouseEvent) => {
			const el = wrapRef.current;
			if (el && !el.contains(e.target as Node)) {
				setExpanded(false);
				setTermino('');
				setSearchError('');
				setHits([]);
			}
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, [expanded]);

	const runSearch = useCallback(async () => {
		const trimmed = termino.trim();
		if (!trimmed) {
			setSearchError('Ingresá nombre, DNI o número de visita');
			return;
		}
		setSearching(true);
		setSearchError('');
		setHits([]);
		try {
			const response = await admissionSearchService.buscar({
				termino: trimmed,
				page: 1,
				limit: 200,
			});
			const rows = response.data || [];
			if (rows.length === 0) {
				setSearchError('No se encontraron pacientes ni visitas');
				return;
			}
			const resultado = interpretarBusquedaUnificada(trimmed, rows);
			if (resultado.tipo === 'visita') {
				setExpanded(false);
				setTermino('');
				void openVisitDetail(resultado.visita.NumeroVisita);
				return;
			}
			if (resultado.grupos.length === 1) {
				setExpanded(false);
				setTermino('');
				setFolderModal(resultado.grupos[0]);
				return;
			}
			setHits(resultado.grupos);
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			setSearchError(err?.response?.data?.message || err?.message || 'Error al buscar');
		} finally {
			setSearching(false);
		}
	}, [termino, openVisitDetail]);

	if (!canUse) return null;

	return (
		<>
			<div className={`${styles.wrap} ${stack ? styles.wrapInStack : ''}`} ref={wrapRef}>
				{expanded ? (
					<div className={styles.searchPanel}>
						<form
							className={styles.searchForm}
							onSubmit={(e) => {
								e.preventDefault();
								void runSearch();
							}}
						>
							<input
								ref={inputRef}
								type="text"
								className={styles.searchInput}
								placeholder="Nombre, DNI o nº de visita"
								value={termino}
								onChange={(e) => {
									setTermino(e.target.value);
									if (searchError) setSearchError('');
									if (hits.length) setHits([]);
								}}
								disabled={searching}
								aria-label="Buscar por nombre, DNI o número de visita"
							/>
							<button
								type="submit"
								className={styles.searchSubmit}
								disabled={searching || !termino.trim()}
								aria-label={searching ? 'Buscando' : 'Buscar'}
								aria-busy={searching}
							>
								{searching ? (
									<span className={styles.spinner} aria-hidden />
								) : (
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.2"
										aria-hidden
									>
										<circle cx="11" cy="11" r="7" />
										<path d="M20 20l-3.5-3.5" />
									</svg>
								)}
							</button>
						</form>
						{hits.length > 0 && (
							<ul className={styles.hitList}>
								{hits.map((g) => (
									<li key={g.patient.IdPaciente}>
										<button
											type="button"
											onClick={() => {
												setFolderModal(g);
												setExpanded(false);
												setTermino('');
												setHits([]);
											}}
										>
											<span className={styles.hitName}>
												{String(g.patient.ApellidoYNombre || '').trim() || '—'}
											</span>
											<span className={styles.hitMeta}>
												DNI {String(g.patient.NumeroDocumento || '').trim() || '—'} ·{' '}
												{g.visits.length} visita{g.visits.length === 1 ? '' : 's'}
											</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				) : (
					<button
						type="button"
						className={styles.fab}
						onClick={() => setExpanded(true)}
						aria-label="Buscar paciente por nombre, DNI o número de visita"
						title="Buscar paciente"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
							<circle cx="11" cy="11" r="7" />
							<path d="M20 20l-3.5-3.5" />
						</svg>
					</button>
				)}
				{!searching && searchError ? <p className={styles.inlineError}>{searchError}</p> : null}
			</div>

			<PatientFolderVisitsModal
				isOpen={folderModal != null}
				onClose={() => setFolderModal(null)}
				patient={folderModal?.patient ?? null}
				visits={folderModal?.visits ?? []}
			/>

			<AdmissionVisitDetailModal
				isOpen={detailModalOpen}
				onClose={closeVisitDetail}
				numeroVisita={selectedVisit}
				loading={loadingDetail}
				data={detailData}
				error={detailError}
				backLabel="Cerrar"
				onReloadData={() => void reloadVisitDetail()}
			/>
		</>
	);
}
