'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { admissionSearchService, type AdmissionSearchRow } from '@/app/services/admissionSearchService';
import PatientFolderVisitsModal from '@/app/components/admission/PatientFolderVisitsModal';
import { usePermiso } from '@/app/hooks/usePermiso';
import { groupRowsByPatient, sortVisitsByDateDesc } from '@/app/utils/admissionSearchUtils';
import styles from './PatientFolderFab.module.css';

export default function PatientFolderFab({ stack = false }: { stack?: boolean }) {
	const { puede, loaded } = usePermiso();
	const canUse = loaded && puede('ADMISION.BUSQUEDA.VER');

	const [expanded, setExpanded] = useState(false);
	const [dni, setDni] = useState('');
	const [searching, setSearching] = useState(false);
	const [searchError, setSearchError] = useState('');
	const [folderModal, setFolderModal] = useState<{
		patient: AdmissionSearchRow;
		visits: AdmissionSearchRow[];
	} | null>(null);

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
				setDni('');
				setSearchError('');
			}
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, [expanded]);

	const runSearch = useCallback(async () => {
		const trimmed = dni.trim();
		if (!trimmed) {
			setSearchError('Ingresá un DNI');
			return;
		}
		setSearching(true);
		setSearchError('');
		try {
			const response = await admissionSearchService.buscar({
				dni: trimmed,
				page: 1,
				limit: 200,
			});
			const rows = response.data || [];
			if (rows.length === 0) {
				setSearchError('No se encontraron visitas para ese DNI');
				return;
			}
			const groups = groupRowsByPatient(rows);
			const group = groups[0];
			setExpanded(false);
			setDni('');
			setFolderModal({
				patient: group.patient,
				visits: sortVisitsByDateDesc(group.visits),
			});
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			setSearchError(err?.response?.data?.message || err?.message || 'Error al buscar');
		} finally {
			setSearching(false);
		}
	}, [dni]);

	if (!canUse) return null;

	return (
		<>
			<div
				className={`${styles.wrap} ${stack ? styles.wrapInStack : ''}`}
				ref={wrapRef}
			>
				{expanded ? (
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
							inputMode="numeric"
							className={styles.searchInput}
							placeholder="DNI del paciente"
							value={dni}
							onChange={(e) => {
								setDni(e.target.value);
								if (searchError) setSearchError('');
							}}
							disabled={searching}
							aria-label="Buscar carpeta por DNI"
						/>
						<button
							type="submit"
							className={styles.searchSubmit}
							disabled={searching || !dni.trim()}
							aria-label="Buscar"
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
								<circle cx="11" cy="11" r="7" />
								<path d="M20 20l-3.5-3.5" />
							</svg>
						</button>
					</form>
				) : (
					<button
						type="button"
						className={styles.fab}
						onClick={() => setExpanded(true)}
						aria-label="Buscar carpeta de paciente por DNI"
						title="Carpeta de paciente"
					>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
							<circle cx="11" cy="11" r="7" />
							<path d="M20 20l-3.5-3.5" />
						</svg>
					</button>
				)}
				{searchError ? <p className={styles.inlineError}>{searchError}</p> : null}
			</div>

			<PatientFolderVisitsModal
				isOpen={folderModal != null}
				onClose={() => setFolderModal(null)}
				patient={folderModal?.patient ?? null}
				visits={folderModal?.visits ?? []}
			/>
		</>
	);
}
