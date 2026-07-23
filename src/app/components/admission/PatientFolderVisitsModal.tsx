'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/app/components/UI/Modal';
import { admissionSearchService } from '@/app/services/admissionSearchService';
import type { AdmissionSearchRow } from '@/app/services/admissionSearchService';
import AdmissionVisitDetailContent from './AdmissionVisitDetailContent';
import AdmissionVisitExportModal from './AdmissionVisitExportModal';
import type { VisitDetailPayload, VisitDetailTabId } from './AdmissionVisitDetailModal';
import {
	VisitClinicalBadges,
	clinicalBadgeToTab,
	type ClinicalBadgeKind,
} from './AdmissionSearchClinicalBadges';
import styles from './PatientFolderVisitsModal.module.css';

type MainTab = 'visitas' | 'turnos';

type TurnoActivoRow = Awaited<
	ReturnType<typeof admissionSearchService.getTurnosActivos>
>[number];

interface PatientFolderVisitsModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient: AdmissionSearchRow | null;
	visits: AdmissionSearchRow[];
}

function badgeEstadoTurno(estado: string, esSobreturno?: boolean): string {
	if (estado === 'CANCELADO') return `${styles.turnoBadge} ${styles.turnoCancelado}`;
	if (estado === 'ATENDIDO') return `${styles.turnoBadge} ${styles.turnoAtendido}`;
	if (esSobreturno) return `${styles.turnoBadge} ${styles.turnoSt}`;
	return `${styles.turnoBadge} ${styles.turnoOcupado}`;
}

function formatFechaTurno(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	if (!y || !m || !d) return iso;
	return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
		weekday: 'short',
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
}

export default function PatientFolderVisitsModal({
	isOpen,
	onClose,
	patient,
	visits,
}: PatientFolderVisitsModalProps) {
	const [mainTab, setMainTab] = useState<MainTab>('visitas');
	const [turnosActivos, setTurnosActivos] = useState<TurnoActivoRow[]>([]);
	const [loadingTurnos, setLoadingTurnos] = useState(false);
	const [turnosError, setTurnosError] = useState('');

	const [expandedBadge, setExpandedBadge] = useState<{
		numeroVisita: number;
		kind: ClinicalBadgeKind;
	} | null>(null);
	const [detailCache, setDetailCache] = useState<Record<number, VisitDetailPayload>>({});
	const [loadingDetail, setLoadingDetail] = useState<number | null>(null);
	const [detailError, setDetailError] = useState('');
	const [exportVisita, setExportVisita] = useState<number | null>(null);

	const resetState = useCallback(() => {
		setMainTab('visitas');
		setTurnosActivos([]);
		setLoadingTurnos(false);
		setTurnosError('');
		setExpandedBadge(null);
		setDetailCache({});
		setLoadingDetail(null);
		setDetailError('');
		setExportVisita(null);
	}, []);

	useEffect(() => {
		if (!isOpen) resetState();
	}, [isOpen, resetState]);

	useEffect(() => {
		if (!isOpen || !patient?.IdPaciente || mainTab !== 'turnos') return;
		let cancel = false;
		setLoadingTurnos(true);
		setTurnosError('');
		admissionSearchService
			.getTurnosActivos(patient.IdPaciente)
			.then((rows) => {
				if (!cancel) setTurnosActivos(rows);
			})
			.catch((e: unknown) => {
				if (!cancel) {
					setTurnosActivos([]);
					const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
					setTurnosError(
						err?.response?.data?.mensaje || err?.message || 'No se pudieron cargar los turnos',
					);
				}
			})
			.finally(() => {
				if (!cancel) setLoadingTurnos(false);
			});
		return () => {
			cancel = true;
		};
	}, [isOpen, patient?.IdPaciente, mainTab]);

	const ensureDetail = useCallback(async (numeroVisita: number) => {
		let found: VisitDetailPayload | undefined;
		setDetailCache((prev) => {
			found = prev[numeroVisita];
			return prev;
		});
		if (found) return found;

		setLoadingDetail(numeroVisita);
		setDetailError('');
		try {
			const data = (await admissionSearchService.detalle(
				numeroVisita,
			)) as VisitDetailPayload;
			setDetailCache((prev) => ({ ...prev, [numeroVisita]: data }));
			return data;
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			setDetailError(
				err?.response?.data?.message || err?.message || 'No se pudo cargar el detalle',
			);
			return null;
		} finally {
			setLoadingDetail(null);
		}
	}, []);

	const handleBadgeClick = useCallback(
		(kind: ClinicalBadgeKind, numeroVisita: number) => {
			const tab = clinicalBadgeToTab(kind);
			if (
				expandedBadge?.numeroVisita === numeroVisita &&
				expandedBadge.kind === kind
			) {
				setExpandedBadge(null);
				return;
			}
			setExpandedBadge({ numeroVisita, kind });
			setDetailError('');
			if (!detailCache[numeroVisita]) void ensureDetail(numeroVisita);
		},
		[expandedBadge, detailCache, ensureDetail],
	);

	const handleExportar = useCallback(
		async (numeroVisita: number) => {
			setDetailError('');
			const data = detailCache[numeroVisita] || (await ensureDetail(numeroVisita));
			if (!data) return;
			setExportVisita(numeroVisita);
		},
		[detailCache, ensureDetail],
	);

	if (!patient) return null;

	const title = `Carpeta — ${patient.ApellidoYNombre || 'Paciente'}`;

	const tipoAtencion = (v: AdmissionSearchRow) => {
		const s = String(v.TipoAtencion || '').trim();
		if (s) return s;
		const d = String(v.TipoPacienteDescripcion || v.EstadoAmbulatorioDescripcion || '').trim();
		return d || 'Sin clasificar';
	};

	const tipoClass = (v: AdmissionSearchRow) => {
		const t = tipoAtencion(v).toLowerCase();
		if (t.includes('ambul')) return styles.typeAmbulatorio;
		if (t.includes('intern')) return styles.typeInternado;
		return styles.typeUnknown;
	};

	const expandedSection: VisitDetailTabId | undefined = expandedBadge
		? clinicalBadgeToTab(expandedBadge.kind)
		: undefined;

	return (
		<>
		<Modal isOpen={isOpen} onClose={onClose} title={title} size="large">
			<div className={styles.meta}>
				<span>
					DNI {patient.NumeroDocumento || '—'} · HC {patient.NumeroHC || '—'}
				</span>
			</div>

			<div className={styles.mainTabs} role="tablist" aria-label="Secciones de carpeta">
				<button
					type="button"
					role="tab"
					aria-selected={mainTab === 'visitas'}
					className={mainTab === 'visitas' ? styles.mainTabActive : styles.mainTab}
					onClick={() => setMainTab('visitas')}
				>
					Visitas
					<span className={styles.tabCount}>{visits.length}</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={mainTab === 'turnos'}
					className={mainTab === 'turnos' ? styles.mainTabActive : styles.mainTab}
					onClick={() => setMainTab('turnos')}
				>
					Turnos activos
				</button>
			</div>

			{mainTab === 'visitas' ? (
				<div className={styles.list} role="tabpanel">
					{visits.length === 0 ? (
						<p className={styles.emptyMsg}>Sin visitas registradas para este paciente.</p>
					) : (
						visits.map((visit) => {
							const nv = visit.NumeroVisita;
							const isExpandedHere = expandedBadge?.numeroVisita === nv;
							const cached = detailCache[nv];
							const loadingHere = loadingDetail === nv;

							return (
								<article key={nv} className={styles.visitCard}>
									<div className={styles.visitHead}>
										<span className={styles.visitTitle}>Visita #{nv}</span>
										<span className={styles.visitDate}>
											{visit.FechaAdmision || '—'} {visit.HoraAdmision || ''}
										</span>
										<button
											type="button"
											className={styles.exportBtn}
											onClick={() => void handleExportar(nv)}
											disabled={loadingDetail === nv}
										>
											Exportar…
										</button>
									</div>
									<div className={styles.visitMetaRow}>
										<span className={`${styles.visitTypeBadge} ${tipoClass(visit)}`}>
											{tipoAtencion(visit)}
										</span>
									</div>
									<VisitClinicalBadges
										row={visit}
										activeKind={isExpandedHere ? expandedBadge?.kind : undefined}
										onBadgeClick={handleBadgeClick}
									/>
									{isExpandedHere && expandedSection && expandedSection !== 'resumen' ? (
										<div className={styles.inlinePanel}>
											{detailError && !loadingHere ? (
												<p className={styles.detailError}>{detailError}</p>
											) : null}
											<AdmissionVisitDetailContent
												numeroVisita={nv}
												loading={loadingHere}
												data={cached ?? null}
												singleSectionOnly={expandedSection}
												hideToolbar
												hideResumen
												onReloadData={() => {
													setDetailCache((prev) => {
														const next = { ...prev };
														delete next[nv];
														return next;
													});
													void ensureDetail(nv);
												}}
											/>
										</div>
									) : null}
								</article>
							);
						})
					)}
				</div>
			) : (
				<div className={styles.turnosPanel} role="tabpanel">
					{loadingTurnos ? (
						<div className={styles.turnosLoading}>
							<span className={styles.spinner} aria-hidden />
						</div>
					) : turnosError ? (
						<p className={styles.detailError}>{turnosError}</p>
					) : turnosActivos.length === 0 ? (
						<p className={styles.emptyMsg}>
							No hay turnos activos (ocupados, desde hoy en adelante).
						</p>
					) : (
						<div className={styles.turnosList}>
							{turnosActivos.map((t) => (
								<div key={t.idTurno} className={styles.turnoCard}>
									<div className={styles.turnoHead}>
										<strong>{formatFechaTurno(t.fecha)}</strong>
										<span className={styles.turnoHora}>{t.hora ?? '—'}</span>
									</div>
									<p className={styles.turnoProf}>
										{t.profesionalNombre ||
											(t.profesional ? `Mat. ${t.profesional}` : '—')}
									</p>
									<div className={styles.turnoMeta}>
										<span>Sector {t.sector || '—'}</span>
										<span
											className={badgeEstadoTurno(t.estado, t.esSobreturno)}
										>
											{t.estado}
											{t.esSobreturno ? ' · ST' : ''}
										</span>
									</div>
									{t.observaciones ? (
										<p className={styles.turnoObs}>{t.observaciones}</p>
									) : null}
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</Modal>
		{exportVisita != null ? (
			<AdmissionVisitExportModal
				isOpen
				onClose={() => setExportVisita(null)}
				numeroVisita={exportVisita}
				evolucionesMedicas={detailCache[exportVisita]?.evolucionesMedicas}
			/>
		) : null}
		</>
	);
}
