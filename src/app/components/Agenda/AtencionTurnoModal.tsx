'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { agendaService, type AgendaSlot, type DiagnosticoCie10, type SectorReceptorEstudio, type TipoPedidoEstudio } from '@/app/services/agendaService';
import RacEnfermeriaModal from '@/app/components/Agenda/RacEnfermeriaModal';
import AgendaAdjuntosTab from '@/app/components/Agenda/AgendaAdjuntosTab';
import TipoPedidoEstudioPicker from '@/app/components/Agenda/TipoPedidoEstudioPicker';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { useModalLayer } from '@/app/hooks/useModalLayer';
import styles from './AtencionTurnoModal.module.css';

/** Prefijo (primeros 2 dígitos) del código de práctica, para filtrar sector receptor. */
function prefijoPractica(idPractica: number | string | null | undefined): string {
	const s = String(idPractica ?? '').replace(/\D/g, '');
	return s.slice(0, 2);
}

const URGENCIA_OPCIONES = [
	{ value: 'Normal', label: 'Normal' },
	{ value: 'Medio', label: 'Medio' },
	{ value: 'Urgente', label: 'Urgente' },
];

/** Paleta para diferenciar visualmente cada estudio/procedimiento cargado. */
const ITEM_COLORS = [
	'#0083a9',
	'#7c3aed',
	'#db2777',
	'#ea580c',
	'#16a34a',
	'#0891b2',
	'#ca8a04',
	'#4f46e5',
];

function colorPorIndice(i: number): string {
	return ITEM_COLORS[i % ITEM_COLORS.length];
}

function inicialesEstudio(desc: string): string {
	const palabras = String(desc || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (palabras.length === 0) return '?';
	if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
	return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

interface TurnoAtencion {
	idTurno: number;
	pacienteNombre?: string | null;
	numeroDocumento?: number | string | null;
	sector?: string | null;
	hora?: string | null;
	fecha?: string | null;
	observaciones?: string | null;
	cobertura?: string | null;
	horaLlegada?: string | null;
	horaIngreso?: string | null;
	horaSalida?: string | null;
	idClasificacionTriage?: number | null;
	racControles?: unknown;
	racMedicacion?: unknown;
}

interface Props {
	open: boolean;
	matricula: number;
	fechaTurno: string;
	turno: TurnoAtencion | null;
	onClose: () => void;
	onCerrado: () => void;
	/** Reabre atención finalizada para editar/agregar (solo quien cerró, 24 h). */
	modoEdicion?: boolean;
}

type WizardStep = 'rac' | 'hc' | 'estudios' | 'interconsultas' | 'procedimientos' | 'adjuntos';

interface ProcedimientoItem {
	key: string;
	tipo: TipoPedidoEstudio;
}

interface PedidoEstudioItem {
	key: string;
	tipo: TipoPedidoEstudio;
	notas: string;
	estadoUrgencia: 'Normal' | 'Urgente' | 'Medio';
	idSectorReceptor: string;
}

interface PedidoInterconsultaItem {
	key: string;
	idSectorReceptor: string;
	motivo: string;
	estadoUrgencia: 'Normal' | 'Urgente' | 'Medio';
}

let itemKeySeq = 0;
function nextItemKey() {
	itemKeySeq += 1;
	return `item-${itemKeySeq}`;
}

const STEPS: { id: WizardStep; label: string; short: string }[] = [
	{ id: 'rac', label: 'RAC', short: 'RAC' },
	{ id: 'hc', label: 'Historia clínica', short: 'HC' },
	{ id: 'procedimientos', label: 'Procedimientos', short: 'Proc.' },
	{ id: 'estudios', label: 'Solicitud de Estudios', short: 'Estudios' },
	{ id: 'interconsultas', label: 'Interconsultas', short: 'Interc.' },
	{ id: 'adjuntos', label: 'Adjuntos', short: 'Adj.' },
];

export default function AtencionTurnoModal({
	open,
	matricula,
	fechaTurno,
	turno,
	onClose,
	onCerrado,
	modoEdicion = false,
}: Props) {
	const mounted = useModalLayer(open);
	const [stepIndex, setStepIndex] = useState(0);
	const [loadingRac, setLoadingRac] = useState(false);
	const [loadingEdicion, setLoadingEdicion] = useState(false);
	const [resumenExistente, setResumenExistente] = useState<{
		procedimientos: number;
		estudios: number;
		venceEn: string | null;
	} | null>(null);
	const [racResumen, setRacResumen] = useState<{
		triage?: number | null;
		ultimoControl?: string | null;
	} | null>(null);

	const [motivo, setMotivo] = useState('');
	const [enfermedadActual, setEnfermedadActual] = useState('');
	const [diagTerm, setDiagTerm] = useState('');
	const [diagResults, setDiagResults] = useState<DiagnosticoCie10[]>([]);
	const [diagSel, setDiagSel] = useState<DiagnosticoCie10 | null>(null);
	const [diagLoading, setDiagLoading] = useState(false);

	const [procedimientos, setProcedimientos] = useState<ProcedimientoItem[]>([]);
	const [pedidosEstudios, setPedidosEstudios] = useState<PedidoEstudioItem[]>([]);
	const [pedidosInterconsultas, setPedidosInterconsultas] = useState<PedidoInterconsultaItem[]>([]);
	const [icDestinoDraft, setIcDestinoDraft] = useState('');
	const [icMotivoDraft, setIcMotivoDraft] = useState('');
	const [icUrgenciaDraft, setIcUrgenciaDraft] = useState<'Normal' | 'Urgente' | 'Medio'>('Normal');
	const [sectoresReceptor, setSectoresReceptor] = useState<SectorReceptorEstudio[]>([]);
	const [loadingSectores, setLoadingSectores] = useState(false);

	const [visited, setVisited] = useState<Record<WizardStep, boolean>>({
		rac: false,
		hc: false,
		estudios: false,
		interconsultas: false,
		procedimientos: false,
		adjuntos: false,
	});

	const [uploadingAdj, setUploadingAdj] = useState(false);
	const [confirmNav, setConfirmNav] = useState<{
		action: () => void;
		message: string;
	} | null>(null);

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [validacionErrores, setValidacionErrores] = useState<
		{ step: WizardStep; label: string }[] | null
	>(null);

	const step = STEPS[stepIndex]?.id ?? 'rac';
	const isFirst = stepIndex === 0;
	const isLast = stepIndex === STEPS.length - 1;

	const racSlot = useMemo((): AgendaSlot | null => {
		if (!turno?.idTurno) return null;
		return {
			hora: turno.hora || '',
			sector: turno.sector || '',
			estado: 'OCUPADO',
			idTurno: turno.idTurno,
			pacienteNombre: turno.pacienteNombre,
			numeroDocumento:
				turno.numeroDocumento != null ? Number(turno.numeroDocumento) : null,
			observaciones: turno.observaciones,
		};
	}, [turno]);

	useEffect(() => {
		if (!open || !turno?.idTurno) return;
		setStepIndex(0);
		setMotivo('');
		setEnfermedadActual('');
		setDiagTerm('');
		setDiagResults([]);
		setDiagSel(null);
		setProcedimientos([]);
		setPedidosEstudios([]);
		setPedidosInterconsultas([]);
		setIcDestinoDraft('');
		setIcMotivoDraft('');
		setIcUrgenciaDraft('Normal');
		setError(null);
		setResumenExistente(null);
		setValidacionErrores(null);
		setVisited({
			rac: false,
			hc: false,
			estudios: false,
			interconsultas: false,
			procedimientos: false,
			adjuntos: false,
		});
		setLoadingRac(true);
		agendaService
			.getRacTurno(turno.idTurno)
			.then((rac) => {
				setRacResumen({
					triage: rac?.turno?.idClasificacionTriage ?? null,
					ultimoControl: rac?.controles?.[0]
						? `${rac.controles[0].FechaControl ?? ''} ${rac.controles[0].HoraControl ?? ''}`.trim()
						: null,
				});
			})
			.catch(() => setRacResumen(null))
			.finally(() => setLoadingRac(false));

		if (!modoEdicion) return;
		let cancel = false;
		setLoadingEdicion(true);
		agendaService
			.getDetalleAtencionTurno(turno.idTurno)
			.then((det) => {
				if (cancel) return;
				const ed = det.edicionPostCierre;
				if (!ed?.puedeEditar) {
					setError(
						ed?.motivoBloqueo ||
							'Solo quien finalizó la atención puede editarla dentro de las 24 horas',
					);
					return;
				}
				if (det.hc) {
					setMotivo(det.hc.motivoConsulta || '');
					setEnfermedadActual(det.hc.enfermedadActual || '');
				}
				if (det.diagnostico?.codigo) {
					setDiagSel({
						codigo: det.diagnostico.codigo,
						descripcion: det.diagnostico.descripcion || '',
						valor: 0,
					});
					setDiagTerm(
						`${det.diagnostico.codigo}${
							det.diagnostico.descripcion ? ` — ${det.diagnostico.descripcion}` : ''
						}`,
					);
				}
				setResumenExistente({
					procedimientos: det.procedimientosRealizados?.length || 0,
					estudios: det.pedidosEstudios?.length || 0,
					venceEn: ed.venceEn,
				});
				setVisited({
					rac: true,
					hc: true,
					estudios: true,
					interconsultas: true,
					procedimientos: true,
					adjuntos: true,
				});
			})
			.catch((e: unknown) => {
				if (cancel) return;
				const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
				setError(
					err?.response?.data?.mensaje ||
						err?.message ||
						'No se pudo cargar la atención para editar',
				);
			})
			.finally(() => {
				if (!cancel) setLoadingEdicion(false);
			});
		return () => {
			cancel = true;
		};
	}, [open, turno?.idTurno, modoEdicion]);

	useEffect(() => {
		if (!open) return;
		let cancel = false;
		setLoadingSectores(true);
		agendaService
			.listarSectoresReceptorEstudios()
			.then((rows) => {
				if (!cancel) setSectoresReceptor(rows);
			})
			.catch(() => {
				if (!cancel) setSectoresReceptor([]);
			})
			.finally(() => {
				if (!cancel) setLoadingSectores(false);
			});
		return () => {
			cancel = true;
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;
		setVisited((v) => ({ ...v, [step]: true }));
	}, [open, step]);

	useEffect(() => {
		if (step !== 'adjuntos') setUploadingAdj(false);
	}, [step]);

	useEffect(() => {
		const t = diagTerm.trim();
		if (t.length < 2) {
			setDiagResults([]);
			return;
		}
		let cancel = false;
		setDiagLoading(true);
		const handle = setTimeout(async () => {
			try {
				const rows = await agendaService.buscarDiagnosticos(t, 25);
				if (!cancel) setDiagResults(rows);
			} catch {
				if (!cancel) setDiagResults([]);
			} finally {
				if (!cancel) setDiagLoading(false);
			}
		}, 280);
		return () => {
			cancel = true;
			clearTimeout(handle);
		};
	}, [diagTerm]);

	// Auto-selecciona el sector receptor cuando la práctica tiene un único sector posible
	useEffect(() => {
		if (loadingSectores || sectoresReceptor.length === 0) return;
		setPedidosEstudios((prev) => {
			let changed = false;
			const next = prev.map((p) => {
				if (p.idSectorReceptor) return p;
				const pref = prefijoPractica(p.tipo.idPractica);
				const matches = pref
					? sectoresReceptor.filter((s) => s.prefijos.includes(pref))
					: sectoresReceptor;
				if (matches.length === 1) {
					changed = true;
					return { ...p, idSectorReceptor: matches[0].valor };
				}
				return p;
			});
			return changed ? next : prev;
		});
	}, [pedidosEstudios, sectoresReceptor, loadingSectores]);

	const pedidosEstudiosIncompletos = pedidosEstudios.some((p) => !p.idSectorReceptor.trim());
	const pedidosInterconsultasIncompletos = pedidosInterconsultas.some(
		(p) => !p.idSectorReceptor.trim() || !p.motivo.trim(),
	);

	const stepComplete = useMemo(() => {
		const hcOk =
			motivo.trim().length > 0 &&
			enfermedadActual.trim().length > 0 &&
			Boolean(diagSel);
		return {
			rac: visited.rac,
			hc: hcOk,
			estudios: visited.estudios && !pedidosEstudiosIncompletos,
			interconsultas: visited.interconsultas && !pedidosInterconsultasIncompletos,
			procedimientos: visited.procedimientos,
			adjuntos: visited.adjuntos,
		};
	}, [
		visited,
		motivo,
		enfermedadActual,
		diagSel,
		pedidosEstudiosIncompletos,
		pedidosInterconsultasIncompletos,
	]);

	const guardNav = useCallback(
		(action: () => void, message = 'Hay un archivo subiéndose. Si continúa, la carga se interrumpirá.') => {
			if (uploadingAdj && step === 'adjuntos') {
				setConfirmNav({ action, message });
				return;
			}
			action();
		},
		[uploadingAdj, step],
	);

	const goTo = (idx: number) => {
		if (idx < 0 || idx >= STEPS.length) return;
		setStepIndex(idx);
	};

	const goNext = () => {
		if (!isLast) goTo(stepIndex + 1);
	};

	const goPrev = () => {
		if (!isFirst) goTo(stepIndex - 1);
	};

	const handleClose = () => {
		guardNav(onClose, 'Hay un archivo subiéndose. Si cierra, la carga se interrumpirá.');
	};

	const handleNext = () => {
		guardNav(goNext);
	};

	const handlePrev = () => {
		guardNav(goPrev);
	};

	const handleStepClick = (idx: number) => {
		if (idx === stepIndex) return;
		guardNav(() => goTo(idx));
	};

	const cerrarTurno = async () => {
		if (!turno?.idTurno || !diagSel) return;
		setSubmitting(true);
		setError(null);
		const payload = {
			diagnostico: diagSel.codigo.trim(),
			hci: {
				motivoConsulta: motivo.trim(),
				enfermedadActual: enfermedadActual.trim(),
			},
			procedimientos: procedimientos.map((p) => ({
				idTipoPedido: p.tipo.idTipoPedido,
			})),
			pedidosEstudios: pedidosEstudios.map((p) => ({
				idTipoPedido: p.tipo.idTipoPedido,
				idSectorReceptor: p.idSectorReceptor.trim(),
				notas: p.notas.trim() || undefined,
				estadoUrgencia: p.estadoUrgencia,
			})),
			pedidosInterconsultas: pedidosInterconsultas.map((p) => ({
				idSectorReceptor: p.idSectorReceptor.trim(),
				motivo: p.motivo.trim(),
				estadoUrgencia: p.estadoUrgencia,
			})),
		};
		try {
			if (modoEdicion) {
				await agendaService.actualizarAtencionPostCierre(matricula, turno.idTurno, payload);
			} else {
				await agendaService.cerrarTurno(matricula, turno.idTurno, payload);
			}
			onCerrado();
			onClose();
		} catch (e: unknown) {
			const err = e as {
				response?: { data?: { mensaje?: string } };
				message?: string;
			};
			setError(
				err?.response?.data?.mensaje ||
					err?.message ||
					(modoEdicion ? 'Error al guardar la atención' : 'Error al finalizar la atención'),
			);
		} finally {
			setSubmitting(false);
		}
	};

	const validarCierre = (): { step: WizardStep; label: string }[] => {
		const errs: { step: WizardStep; label: string }[] = [];
		if (!motivo.trim()) errs.push({ step: 'hc', label: 'Motivo de consulta' });
		if (!enfermedadActual.trim())
			errs.push({ step: 'hc', label: 'Enfermedad actual' });
		if (!diagSel) errs.push({ step: 'hc', label: 'Diagnóstico CIE-10' });
		if (pedidosEstudiosIncompletos)
			errs.push({
				step: 'estudios',
				label: 'Sector receptor en la solicitud de estudios',
			});
		if (pedidosInterconsultasIncompletos)
			errs.push({
				step: 'interconsultas',
				label: 'Servicio destino y motivo en interconsultas',
			});
		return errs;
	};

	const handleCerrar = () => {
		const errs = validarCierre();
		if (errs.length > 0) {
			setValidacionErrores(errs);
			return;
		}
		guardNav(() => void cerrarTurno());
	};

	const irAPasoError = (target: WizardStep) => {
		const idx = STEPS.findIndex((s) => s.id === target);
		setValidacionErrores(null);
		if (idx >= 0) guardNav(() => goTo(idx));
	};

	if (!open || !turno?.idTurno || !mounted) return null;

	const paciente = turno.pacienteNombre || 'Paciente';
	const subtitle = `${fechaTurno} · ${turno.hora || '—'}${turno.sector ? ` · ${turno.sector}` : ''}`;

	const modal = (
		<div className={styles.overlay}>
			<div
				className={styles.modal}
				role='dialog'
				aria-modal='true'
				onClick={(e) => e.stopPropagation()}
			>
				<header className={styles.header}>
					<div className={styles.headerMain}>
						<h2 className={styles.title}>
							{modoEdicion ? 'Editar atención' : 'Atención del turno'}
						</h2>
						<p className={styles.subtitle}>
							<strong>{paciente}</strong> · {subtitle}
						</p>
						{modoEdicion && resumenExistente?.venceEn ? (
							<p className={styles.obsLine}>
								Podés editar o agregar hasta{' '}
								{new Date(resumenExistente.venceEn).toLocaleString('es-AR')}
								{resumenExistente.procedimientos || resumenExistente.estudios
									? ` · Ya registrados: ${resumenExistente.procedimientos} proc., ${resumenExistente.estudios} estudios`
									: ''}
							</p>
						) : null}
						{turno.observaciones ? (
							<p className={styles.obsLine}>Motivo agenda: {turno.observaciones}</p>
						) : null}
						{loadingRac ? null : racResumen ? (
							<p className={styles.obsLine}>
								RAC · Triage {racResumen.triage ?? '—'}
								{racResumen.ultimoControl
									? ` · Último control ${racResumen.ultimoControl}`
									: ''}
							</p>
						) : null}
					</div>
					<button
						type='button'
						className={styles.closeBtn}
						onClick={handleClose}
						aria-label='Cerrar'
					>
						×
					</button>
				</header>

				<nav className={styles.stepper} aria-label='Pasos de atención'>
					{STEPS.map((s, idx) => {
						const done = stepComplete[s.id];
						const active = idx === stepIndex;
						return (
							<button
								key={s.id}
								type='button'
								className={`${styles.stepItem} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}
								onClick={() => handleStepClick(idx)}
								aria-current={active ? 'step' : undefined}
							>
								<span className={styles.stepCheck} aria-hidden>
									{done ? '✓' : idx + 1}
								</span>
								<span className={styles.stepLabel}>{s.label}</span>
							</button>
						);
					})}
				</nav>

				<div className={styles.body}>
					{loadingEdicion ? (
						<p className={styles.empty}>Cargando atención…</p>
					) : null}
					{modoEdicion && !loadingEdicion ? (
						<p className={styles.sectionHint}>
							Los ítems nuevos que agregues se suman a lo ya facturado/pedido. La HC se
							actualiza al guardar.
						</p>
					) : null}
					{step === 'rac' && racSlot ? (
						<div className={styles.racEmbed}>
							<RacEnfermeriaModal
								embedded
								open
								slot={racSlot}
								fechaTurno={fechaTurno}
								onClose={() => {}}
							/>
						</div>
					) : null}

					{step === 'hc' ? (
						<div className={styles.hcForm}>
							<div className={styles.field}>
								<label htmlFor='motivo-atencion'>
									Motivo de consulta <span className={styles.req}>*</span>
								</label>
								<textarea
									id='motivo-atencion'
									rows={3}
									value={motivo}
									onChange={(e) => setMotivo(e.target.value)}
									placeholder='Motivo de la consulta…'
								/>
							</div>
							<div className={styles.field}>
								<label htmlFor='ea-atencion'>
									Enfermedad actual <span className={styles.req}>*</span>
								</label>
								<textarea
									id='ea-atencion'
									rows={4}
									value={enfermedadActual}
									onChange={(e) => setEnfermedadActual(e.target.value)}
									placeholder='Descripción de la enfermedad actual…'
								/>
							</div>
							<div className={styles.field}>
								<label htmlFor='diag-atencion'>
									Diagnóstico CIE-10 <span className={styles.req}>*</span>
								</label>
								<div className={styles.diagInputWrap}>
									<input
										id='diag-atencion'
										type='text'
										value={diagTerm}
										onChange={(e) => setDiagTerm(e.target.value)}
										placeholder='Buscar por código o descripción…'
									/>
									{diagLoading ? (
										<span
											className={styles.diagSpinner}
											aria-label='Buscando diagnósticos'
										/>
									) : null}
								</div>
								{diagSel ? (
									<p className={styles.diagSelected}>
										Seleccionado: <strong>{diagSel.codigo}</strong> —{' '}
										{diagSel.descripcion}
										<button
											type='button'
											className={styles.linkBtn}
											onClick={() => {
												setDiagSel(null);
												setDiagTerm('');
											}}
										>
											Cambiar
										</button>
									</p>
								) : null}
								{!diagSel && diagResults.length > 0 ? (
									<div className={styles.diagResults}>
										{diagResults.map((d) => (
											<button
												key={d.codigo}
												type='button'
												className={styles.diagRow}
												onClick={() => {
													setDiagSel(d);
													setDiagTerm(`${d.codigo} — ${d.descripcion}`);
													setDiagResults([]);
												}}
											>
												<span className={styles.diagCode}>{d.codigo}</span>
												<span>{d.descripcion}</span>
											</button>
										))}
									</div>
								) : null}
								{!diagSel &&
								diagTerm.trim().length >= 2 &&
								!diagLoading &&
								diagResults.length === 0 ? (
									<p className={styles.empty}>Sin resultados.</p>
								) : null}
							</div>
						</div>
					) : null}

					{step === 'estudios' ? (
						<div className={styles.hcForm}>
							<p className={styles.sectionHint}>
								Solicite estudios para realizar en otro sector. Puede agregar uno o
								varios pedidos; se guardarán al finalizar la atención.
							</p>
							<TipoPedidoEstudioPicker
								id='pedido-estudio-buscar'
								label='Agregar pedido de estudio'
								onSelect={(tipo) =>
									setPedidosEstudios((prev) => [
										...prev,
										{
											key: nextItemKey(),
											tipo,
											notas: '',
											estadoUrgencia: 'Normal',
											idSectorReceptor: '',
										},
									])
								}
							/>
							{pedidosEstudios.length > 0 ? (
								<div className={styles.itemGrid}>
									{pedidosEstudios.map((p, idx) => {
										const pref = prefijoPractica(p.tipo.idPractica);
										const matches = pref
											? sectoresReceptor.filter((s) => s.prefijos.includes(pref))
											: sectoresReceptor;
										const sectoresBase = matches.length > 0 ? matches : sectoresReceptor;
										const sectoresOpts = sectoresBase.map((s) => ({
											value: s.valor,
											label: `${s.descripcion} (${s.valor})`,
										}));
										const sectorUnico = matches.length === 1;
										const color = colorPorIndice(idx);
										return (
										<article key={p.key} className={styles.itemCard} style={{ borderTopColor: color }}>
											<div className={styles.itemCardHeader}>
												<div className={styles.itemCardHead}>
													<span
														className={styles.itemAvatar}
														style={{ background: color }}
														aria-hidden
													>
														{inicialesEstudio(p.tipo.descripcion)}
													</span>
													<div>
														<p className={styles.itemCardTitle}>{p.tipo.descripcion}</p>
														<p className={styles.itemCardMeta}>
															Código {p.tipo.idPractica}
														</p>
													</div>
												</div>
												<button
													type='button'
													className={styles.linkBtn}
													onClick={() =>
														setPedidosEstudios((prev) =>
															prev.filter((x) => x.key !== p.key),
														)
													}
												>
													Quitar
												</button>
											</div>
											<div className={styles.itemCardBody}>
												<CustomSelect
													label='Sector receptor *'
													name={`sector-${p.key}`}
													value={p.idSectorReceptor}
													isLoading={loadingSectores}
													disabled={sectorUnico}
													options={sectoresOpts}
													onChange={(v) =>
														setPedidosEstudios((prev) =>
															prev.map((x) =>
																x.key === p.key
																	? { ...x, idSectorReceptor: String(v) }
																	: x,
															),
														)
													}
												/>
												{sectorUnico ? (
													<p className={styles.itemHintSmall}>
														Sector asignado automáticamente según el tipo de estudio.
													</p>
												) : null}
												<CustomSelect
													label='Urgencia'
													name={`urg-${p.key}`}
													value={p.estadoUrgencia}
													isLoading={false}
													options={URGENCIA_OPCIONES}
													onChange={(v) =>
														setPedidosEstudios((prev) =>
															prev.map((x) =>
																x.key === p.key
																	? {
																			...x,
																			estadoUrgencia:
																				v as PedidoEstudioItem['estadoUrgencia'],
																		}
																	: x,
															),
														)
													}
												/>
												<label htmlFor={`notas-${p.key}`}>
													Observaciones (opcional)
												</label>
												<textarea
													id={`notas-${p.key}`}
													rows={2}
													value={p.notas}
													onChange={(e) =>
														setPedidosEstudios((prev) =>
															prev.map((x) =>
																x.key === p.key
																	? { ...x, notas: e.target.value }
																	: x,
															),
														)
													}
													placeholder='Indicaciones para el estudio…'
												/>
											</div>
										</article>
										);
									})}
								</div>
							) : (
								<p className={styles.empty}>
									Sin pedidos cargados. Este paso es opcional.
								</p>
							)}
							{pedidosEstudiosIncompletos ? (
								<p className={styles.error}>
									Seleccione el sector receptor de cada pedido de estudio.
								</p>
							) : null}
						</div>
					) : null}

					{step === 'interconsultas' ? (
						<div className={styles.hcForm}>
							<p className={styles.sectionHint}>
								Solicite interconsultas a un servicio destino (ej. Oftalmología). Se
								registran al finalizar la atención (tipo 33) y aparecen en la bandeja del
								servicio receptor.
							</p>
							<div className={styles.field}>
								<label htmlFor='ic-destino'>Servicio destino</label>
								<select
									id='ic-destino'
									value={icDestinoDraft}
									onChange={(e) => setIcDestinoDraft(e.target.value)}
									disabled={loadingSectores}
								>
									<option value=''>Seleccione…</option>
									{sectoresReceptor.map((s) => (
										<option key={s.valor} value={s.valor}>
											{s.descripcion} ({s.valor})
										</option>
									))}
								</select>
							</div>
							<div className={styles.field}>
								<label htmlFor='ic-urg'>Urgencia</label>
								<select
									id='ic-urg'
									value={icUrgenciaDraft}
									onChange={(e) =>
										setIcUrgenciaDraft(e.target.value as PedidoInterconsultaItem['estadoUrgencia'])
									}
								>
									{URGENCIA_OPCIONES.map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>
							<div className={styles.field}>
								<label htmlFor='ic-motivo'>Motivo</label>
								<textarea
									id='ic-motivo'
									rows={3}
									value={icMotivoDraft}
									onChange={(e) => setIcMotivoDraft(e.target.value)}
									placeholder='Motivo de la interconsulta…'
								/>
							</div>
							<button
								type='button'
								className={styles.btnPrimary}
								disabled={!icDestinoDraft.trim() || !icMotivoDraft.trim()}
								onClick={() => {
									setPedidosInterconsultas((prev) => [
										...prev,
										{
											key: nextItemKey(),
											idSectorReceptor: icDestinoDraft.trim(),
											motivo: icMotivoDraft.trim(),
											estadoUrgencia: icUrgenciaDraft,
										},
									]);
									setIcMotivoDraft('');
									setIcDestinoDraft('');
									setIcUrgenciaDraft('Normal');
								}}
							>
								Agregar interconsulta
							</button>
							{pedidosInterconsultas.length > 0 ? (
								<div className={styles.itemList}>
									{pedidosInterconsultas.map((p) => {
										const dest = sectoresReceptor.find((s) => s.valor === p.idSectorReceptor);
										return (
											<article key={p.key} className={styles.itemCard}>
												<div className={styles.itemCardHeader}>
													<div>
														<p className={styles.itemCardTitle}>
															{dest?.descripcion || p.idSectorReceptor}
														</p>
														<p className={styles.itemCardMeta}>
															{p.estadoUrgencia} · {p.motivo.slice(0, 80)}
															{p.motivo.length > 80 ? '…' : ''}
														</p>
													</div>
													<button
														type='button'
														className={styles.linkBtn}
														onClick={() =>
															setPedidosInterconsultas((prev) =>
																prev.filter((x) => x.key !== p.key),
															)
														}
													>
														Quitar
													</button>
												</div>
											</article>
										);
									})}
								</div>
							) : (
								<p className={styles.empty}>
									Sin interconsultas. Este paso es opcional.
								</p>
							)}
						</div>
					) : null}

					{step === 'procedimientos' ? (
						<div className={styles.hcForm}>
							<p className={styles.sectionHint}>
								Registre los procedimientos realizados en consultorio durante la
								atención. Cada uno se factura al finalizar la atención con el médico que
								lo realizó.
							</p>
							<TipoPedidoEstudioPicker
								id='procedimiento-buscar'
								label='Agregar procedimiento realizado'
								onSelect={(tipo) =>
									setProcedimientos((prev) => [
										...prev,
										{ key: nextItemKey(), tipo },
									])
								}
							/>
							{procedimientos.length > 0 ? (
								<div className={styles.itemList}>
									{procedimientos.map((p) => (
										<article key={p.key} className={styles.itemCard}>
											<div className={styles.itemCardHeader}>
												<div>
													<p className={styles.itemCardTitle}>{p.tipo.descripcion}</p>
													<p className={styles.itemCardMeta}>
														Código {p.tipo.idPractica}
													</p>
												</div>
												<button
													type='button'
													className={styles.linkBtn}
													onClick={() =>
														setProcedimientos((prev) =>
															prev.filter((x) => x.key !== p.key),
														)
													}
												>
													Quitar
												</button>
											</div>
										</article>
									))}
								</div>
							) : (
								<p className={styles.empty}>
									Sin procedimientos cargados. Este paso es opcional.
								</p>
							)}
						</div>
					) : null}

					{step === 'adjuntos' && turno.idTurno ? (
						<AgendaAdjuntosTab
							idTurno={turno.idTurno}
							onUploadingChange={setUploadingAdj}
						/>
					) : null}

					{error ? <div className={styles.error}>{error}</div> : null}
				</div>

				<footer className={styles.footer}>
					<button type='button' className={styles.btnSecondary} onClick={handleClose}>
						Cancelar
					</button>
					<div className={styles.footerNav}>
						{!isFirst ? (
							<button
								type='button'
								className={styles.btnSecondary}
								onClick={handlePrev}
								disabled={loadingEdicion}
							>
								Anterior
							</button>
						) : null}
						{!isLast ? (
							<button
								type='button'
								className={styles.btnPrimary}
								onClick={handleNext}
								disabled={loadingEdicion}
							>
								Siguiente
							</button>
						) : null}
						<button
							type='button'
							className={styles.btnFinalizar}
							disabled={submitting || loadingEdicion}
							onClick={handleCerrar}
						>
							{submitting
								? modoEdicion
									? 'Guardando…'
									: 'Finalizando…'
								: modoEdicion
									? 'Guardar cambios'
									: 'Finalizar atención'}
						</button>
					</div>
				</footer>
			</div>

			{validacionErrores && validacionErrores.length > 0 ? (
				<div
					className={styles.confirmOverlay}
					onClick={() => setValidacionErrores(null)}
					role='presentation'
				>
					<div
						className={styles.confirmBox}
						role='alertdialog'
						aria-modal='true'
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className={styles.confirmTitle}>Faltan datos obligatorios</h3>
						<p className={styles.confirmText}>
							No se puede finalizar la atención todavía. Completá lo siguiente:
						</p>
						<ul className={styles.validacionList}>
							{validacionErrores.map((v, i) => (
								<li key={`${v.step}-${i}`} className={styles.validacionItem}>
									<span>{v.label}</span>
									<button
										type='button'
										className={styles.validacionLink}
										onClick={() => irAPasoError(v.step)}
									>
										Ir a corregir →
									</button>
								</li>
							))}
						</ul>
						<div className={styles.confirmActions}>
							<button
								type='button'
								className={styles.btnSecondary}
								onClick={() => setValidacionErrores(null)}
							>
								Entendido
							</button>
							<button
								type='button'
								className={styles.btnFinalizar}
								disabled={submitting}
								onClick={() => {
									const errs = validarCierre();
									if (errs.length > 0) {
										setValidacionErrores(errs);
										return;
									}
									setValidacionErrores(null);
									guardNav(() => void cerrarTurno());
								}}
							>
								{submitting
									? modoEdicion
										? 'Guardando…'
										: 'Finalizando…'
									: modoEdicion
										? 'Guardar cambios'
										: 'Finalizar atención'}
							</button>
						</div>
					</div>
				</div>
			) : null}

			{confirmNav ? (
				<div
					className={styles.confirmOverlay}
					onClick={() => setConfirmNav(null)}
					role='presentation'
				>
					<div
						className={styles.confirmBox}
						role='alertdialog'
						aria-modal='true'
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className={styles.confirmTitle}>Carga en curso</h3>
						<p className={styles.confirmText}>{confirmNav.message}</p>
						<div className={styles.confirmActions}>
							<button
								type='button'
								className={styles.btnSecondary}
								onClick={() => setConfirmNav(null)}
							>
								Quedarme
							</button>
							<button
								type='button'
								className={styles.btnPrimary}
								onClick={() => {
									const act = confirmNav.action;
									setConfirmNav(null);
									setUploadingAdj(false);
									act();
								}}
							>
								Continuar igual
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);

	return createPortal(modal, document.body);
}
