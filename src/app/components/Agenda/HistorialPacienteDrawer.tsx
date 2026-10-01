'use client';

import { useEffect, useState } from 'react';
import PatientFolderVisitsContent from '@/app/components/admission/PatientFolderVisitsContent';
import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import styles from './HistorialPacienteDrawer.module.css';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	patient: AdmissionSearchRow;
	visits: AdmissionSearchRow[];
	loading: boolean;
	error: string;
	/** false si el turno no trae DNI (no se puede buscar el historial). */
	puedeBuscar: boolean;
	onRetry: () => void;
}

/**
 * Panel lateral desplegable (borde derecho) con la Carpeta del paciente.
 * Se monta dentro del contenedor del wizard (que debe tener `position: relative`)
 * y se superpone sin modificar el layout de la atención.
 */
export default function HistorialPacienteDrawer({
	open,
	onOpenChange,
	patient,
	visits,
	loading,
	error,
	puedeBuscar,
	onRetry,
}: Props) {
	// El contenido se monta la primera vez que se abre y después se conserva
	// (así no se pierden visitas expandidas al plegar y volver a abrir).
	const [everOpened, setEverOpened] = useState(false);

	useEffect(() => {
		if (open) setEverOpened(true);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				onOpenChange(false);
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onOpenChange]);

	const count = visits.length;
	const tabLabel = open ? 'Ocultar historial del paciente' : 'Ver historial del paciente';

	return (
		<div className={styles.root}>
			{open ? (
				<div
					className={styles.backdrop}
					onClick={() => onOpenChange(false)}
					aria-hidden
				/>
			) : null}

			<aside
				id='historial-paciente-panel'
				className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
				aria-label='Historial del paciente'
				aria-hidden={!open}
			>
				<header className={styles.panelHeader}>
					<button
						type='button'
						className={styles.backBtn}
						onClick={() => onOpenChange(false)}
					>
						<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' aria-hidden>
							<path d='M15 6l-6 6 6 6' />
						</svg>
						Volver a la atención
					</button>
					<div className={styles.panelTitleWrap}>
						<h3 className={styles.panelTitle}>Historial del paciente</h3>
						<p className={styles.panelSub}>{patient.ApellidoYNombre || 'Paciente'}</p>
					</div>
					<button
						type='button'
						className={styles.closeBtn}
						onClick={() => onOpenChange(false)}
						aria-label='Cerrar historial'
					>
						×
					</button>
				</header>

				<div className={styles.panelBody}>
					{!everOpened ? null : !puedeBuscar ? (
						<p className={styles.state}>
							Este turno no tiene DNI cargado, no se puede buscar el historial.
						</p>
					) : loading ? (
						<div className={styles.state}>
							<span className={styles.spinner} aria-hidden />
							<span>Cargando historial…</span>
						</div>
					) : error ? (
						<div className={styles.state}>
							<p className={styles.errorText}>{error}</p>
							<button type='button' className={styles.retryBtn} onClick={onRetry}>
								Reintentar
							</button>
						</div>
					) : (
						<PatientFolderVisitsContent
							key={patient.IdPaciente || patient.NumeroDocumento}
							patient={patient}
							visits={visits}
							hideTurnosTab
							fillHeight
							clinicalLinkNewTab
						/>
					)}
				</div>
			</aside>

			<button
				type='button'
				className={`${styles.tab} ${open ? styles.tabOpen : ''}`}
				onClick={() => onOpenChange(!open)}
				aria-expanded={open}
				aria-controls='historial-paciente-panel'
				aria-label={tabLabel}
				title={tabLabel}
			>
				<svg
					className={styles.tabArrow}
					width='18'
					height='18'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='2.6'
					aria-hidden
				>
					<path d='M15 6l-6 6 6 6' />
				</svg>
				{puedeBuscar && !loading && !error ? (
					<span className={styles.tabBadge}>{count}</span>
				) : null}
			</button>
		</div>
	);
}
