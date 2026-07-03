'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '@/app/contexts/AppContext';
import { authService } from '@/app/services/authService';
import {
	agendaService,
	type ControlFrecuenteTurno,
	type MedicacionTurno,
	type RacTurnoData,
} from '@/app/services/agendaService';
import { indicacionesService } from '@/app/services/indicacionesService';
import type { AgendaSlot } from '@/app/services/agendaService';
import { formatIMC } from '@/app/utils/antropometria';
import styles from './RacEnfermeriaModal.module.css';

interface TriageNivel {
	id: number;
	color: string;
	colorInner: string;
	colorTexto: string;
	tiempo: string;
	titulo: string;
	descripcion: string;
}

const TRIAGE_NIVELES: TriageNivel[] = [
	{
		id: 1,
		color: '#ef4444',
		colorInner: '#b91c1c',
		colorTexto: '#fff',
		tiempo: 'Inmediato',
		titulo: 'EMERGENCIA',
		descripcion: 'Atención inmediata · Riesgo vital',
	},
	{
		id: 2,
		color: '#f97316',
		colorInner: '#c2410c',
		colorTexto: '#fff',
		tiempo: 'Hasta 10 min',
		titulo: 'MUY URGENTE',
		descripcion: 'Riesgo de deterioro grave',
	},
	{
		id: 3,
		color: '#facc15',
		colorInner: '#ca8a04',
		colorTexto: '#1e293b',
		tiempo: '1 a 3 horas',
		titulo: 'URGENCIA MENOR',
		descripcion: 'Poco grave · Descarta riesgo de muerte',
	},
	{
		id: 4,
		color: '#22c55e',
		colorInner: '#15803d',
		colorTexto: '#fff',
		tiempo: 'Hasta 4 horas',
		titulo: 'ESTÁNDAR',
		descripcion: 'No urgente',
	},
	{
		id: 5,
		color: '#1e293b',
		colorInner: '#0f172a',
		colorTexto: '#fff',
		tiempo: 'Hasta 24 horas',
		titulo: 'NO URGENTE',
		descripcion: 'Consulta diferible',
	},
];

function nowDate(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowTime(): string {
	const d = new Date();
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtFecha(iso: string | null | undefined): string {
	if (!iso) return '—';
	const p = iso.split('-');
	if (p.length !== 3) return iso;
	return `${p[2]}/${p[1]}/${p[0]}`;
}

function fmtHora(h: string | null | undefined): string {
	if (!h) return '—';
	return h.slice(0, 5);
}

function num(v: number | null | undefined): string {
	if (v == null || v === 0) return '—';
	return String(v);
}

function dec(v: number | null | undefined, digits = 1): string {
	if (v == null || v === 0) return '—';
	return Number(v).toFixed(digits);
}

interface Props {
	open: boolean;
	slot: AgendaSlot | null;
	fechaTurno: string;
	onClose: () => void;
}

const CONTROL_INICIAL = {
	fechaControl: nowDate(),
	horaControl: nowTime(),
	pulso: '' as number | '',
	presionMax: '' as number | '',
	presionMin: '' as number | '',
	presionMedia: '' as number | '',
	frecuenciaRespiratoria: '' as number | '',
	temperaturaAxilar: '' as number | '',
	temperaturaRectal: '' as number | '',
	glucemia: '' as number | '',
	saturacion: '' as number | '',
	peso: '' as number | '',
	talla: '' as number | '',
	observaciones: '',
};

const MED_INICIAL = {
	fechaControl: nowDate(),
	horaControl: nowTime(),
	cantidad: 1,
	tipoUnidad: '',
	observaciones: '',
};

export default function RacEnfermeriaModal({ open, slot, fechaTurno, onClose }: Props) {
	const { sectorSeleccionado } = useAppContext();
	const user = authService.getCurrentUser() as {
		codigoOperador?: number | string;
		idCodOperador?: number | string;
	} | null;

	const operadorId = useMemo(() => {
		const fromUser = Number(user?.codigoOperador ?? user?.idCodOperador);
		if (Number.isFinite(fromUser) && fromUser > 0) return fromUser;
		const fromSector = Number(sectorSeleccionado?.idPersonal);
		if (Number.isFinite(fromSector) && fromSector > 0) return fromSector;
		return 0;
	}, [user, sectorSeleccionado]);

	const [rac, setRac] = useState<RacTurnoData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [showControlForm, setShowControlForm] = useState(false);
	const [controlForm, setControlForm] = useState(CONTROL_INICIAL);

	const [showMedForm, setShowMedForm] = useState(false);
	const [medTerm, setMedTerm] = useState('');
	const [vademecum, setVademecum] = useState<
		{ Valor: number; Nombre: string; Descripcion?: string }[]
	>([]);
	const [unidades, setUnidades] = useState<{ Valor: string; Descripcion: string }[]>([]);
	const [medSel, setMedSel] = useState<{ troquel: number; nombre: string } | null>(null);
	const [medForm, setMedForm] = useState(MED_INICIAL);

	const [triageSel, setTriageSel] = useState<number | null>(null);
	const [triageVista, setTriageVista] = useState(1);

	const idTurno = slot?.idTurno ?? null;

	const cargar = useCallback(async () => {
		if (!idTurno) return;
		setLoading(true);
		setError(null);
		try {
			const data = await agendaService.getRacTurno(idTurno);
			setRac(data);
			const nivel = data.turno.idClasificacionTriage;
			setTriageSel(nivel);
			setTriageVista(nivel ?? 1);
		} catch (e: unknown) {
			const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
			setError(err?.response?.data?.mensaje || err?.message || 'Error al cargar RAC');
		} finally {
			setLoading(false);
		}
	}, [idTurno]);

	useEffect(() => {
		if (!open || !idTurno) {
			setRac(null);
			setShowControlForm(false);
			setShowMedForm(false);
			setMedSel(null);
			setMedTerm('');
			setControlForm(CONTROL_INICIAL);
			setMedForm(MED_INICIAL);
			setError(null);
			return;
		}
		cargar();
		indicacionesService.getFormularioDatos().then((d) => {
			if (!d) return;
			setVademecum(
				(d.vademecum || []).map(
					(v: { Valor: number; Nombre: string; Descripcion?: string }) => ({
						Valor: Number(v.Valor),
						Nombre: v.Nombre,
						Descripcion: v.Descripcion,
					}),
				),
			);
			setUnidades(
				(d.unidadesMedida || []).map(
					(u: { Valor: number; Descripcion: string }) => ({
						Valor: String(u.Valor),
						Descripcion: u.Descripcion,
					}),
				),
			);
		});
	}, [open, idTurno, cargar]);

	const medFiltrados = useMemo(() => {
		const t = medTerm.trim().toLowerCase();
		if (t.length < 2) return [];
		return vademecum
			.filter(
				(v) =>
					v.Nombre?.toLowerCase().includes(t) ||
					v.Descripcion?.toLowerCase().includes(t),
			)
			.slice(0, 25);
	}, [medTerm, vademecum]);

	useEffect(() => {
		return () => {
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		};
	}, []);

	const flash = (msg: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		const id = Date.now();
		setToast({ id, message: msg });
		toastTimerRef.current = setTimeout(() => setToast(null), 2800);
	};

	const guardarControl = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!idTurno) return;
		setSaving(true);
		setError(null);
		try {
			const toNum = (v: number | '') => (v === '' ? undefined : Number(v));
			await agendaService.crearControlRac(idTurno, {
				fechaControl: controlForm.fechaControl,
				horaControl: controlForm.horaControl,
				operadorCarga: operadorId,
				pulso: toNum(controlForm.pulso),
				presionMax: toNum(controlForm.presionMax),
				presionMin: toNum(controlForm.presionMin),
				presionMedia: toNum(controlForm.presionMedia),
				frecuenciaRespiratoria: toNum(controlForm.frecuenciaRespiratoria),
				temperaturaAxilar: toNum(controlForm.temperaturaAxilar),
				temperaturaRectal: toNum(controlForm.temperaturaRectal),
				glucemia: toNum(controlForm.glucemia),
				saturacion: toNum(controlForm.saturacion),
				peso: toNum(controlForm.peso),
				talla: toNum(controlForm.talla),
				observaciones: controlForm.observaciones || undefined,
				idSector: slot?.sector,
			});
			setShowControlForm(false);
			setControlForm(CONTROL_INICIAL);
			await cargar();
			flash('Control guardado');
		} catch (err: unknown) {
			const e2 = err as { response?: { data?: { mensaje?: string } }; message?: string };
			setError(e2?.response?.data?.mensaje || e2?.message || 'Error al guardar control');
		} finally {
			setSaving(false);
		}
	};

	const guardarMedicacion = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!idTurno || !medSel) return;
		setSaving(true);
		setError(null);
		try {
			await agendaService.crearMedicacionRac(idTurno, {
				troquel: medSel.troquel,
				cantidad: medForm.cantidad,
				cantidadIndicada: medForm.cantidad,
				tipoUnidad: medForm.tipoUnidad,
				fechaControl: medForm.fechaControl,
				horaControl: medForm.horaControl,
				operadorCarga: operadorId,
				profesional: operadorId,
				observaciones: medForm.observaciones || undefined,
				idSector: slot?.sector,
			});
			setShowMedForm(false);
			setMedSel(null);
			setMedTerm('');
			setMedForm({ ...MED_INICIAL, tipoUnidad: unidades[0]?.Valor || '' });
			await cargar();
			flash('Medicación registrada');
		} catch (err: unknown) {
			const e2 = err as { response?: { data?: { mensaje?: string } }; message?: string };
			setError(
				e2?.response?.data?.mensaje || e2?.message || 'Error al registrar medicación',
			);
		} finally {
			setSaving(false);
		}
	};

	const guardarTriage = async (nivel: number | null) => {
		if (!idTurno) return;
		setSaving(true);
		setError(null);
		try {
			const data = await agendaService.actualizarTriageRac(idTurno, {
				idClasificacionTriage: nivel,
			});
			setRac(data);
			setTriageSel(data.turno.idClasificacionTriage);
			flash('Triage guardado');
		} catch (err: unknown) {
			const e2 = err as { response?: { data?: { mensaje?: string } }; message?: string };
			setError(e2?.response?.data?.mensaje || e2?.message || 'Error al guardar triage');
		} finally {
			setSaving(false);
		}
	};

	const triageVisible =
		TRIAGE_NIVELES.find((n) => n.id === triageVista) ?? TRIAGE_NIVELES[0];

	const elegirTriage = (id: number) => {
		setTriageVista(id);
		if (triageSel !== id) guardarTriage(id);
	};

	const eliminarControl = async (c: ControlFrecuenteTurno) => {
		if (!idTurno || !confirm('¿Eliminar este control?')) return;
		try {
			await agendaService.eliminarControlRac(idTurno, c.Valor);
			await cargar();
		} catch {
			alert('No se pudo eliminar el control');
		}
	};

	const eliminarMed = async (m: MedicacionTurno) => {
		if (!idTurno || !confirm('¿Eliminar este registro de medicación?')) return;
		try {
			await agendaService.eliminarMedicacionRac(idTurno, m.IDCtrlMedica);
			await cargar();
		} catch {
			alert('No se pudo eliminar la medicación');
		}
	};

	if (!open || !slot?.idTurno) return null;

	const paciente =
		slot.pacienteNombre ||
		rac?.turno.pacienteNombre ||
		`Paciente #${slot.idPaciente || '—'}`;

	const setCF = <K extends keyof typeof CONTROL_INICIAL>(
		k: K,
		v: (typeof CONTROL_INICIAL)[K],
	) => setControlForm((p) => ({ ...p, [k]: v }));

	const numChange =
		(k: keyof typeof CONTROL_INICIAL) =>
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const v = e.target.value;
			setCF(k, (v === '' ? '' : Number(v)) as never);
		};

	const toastNode =
		toast && typeof document !== 'undefined'
			? createPortal(
					<div
						key={toast.id}
						className={styles.toast}
						role='status'
						aria-live='polite'
					>
						<span className={styles.toastIcon} aria-hidden>
							âœ“
						</span>
						<span className={styles.toastText}>{toast.message}</span>
					</div>,
					document.body,
				)
			: null;

	return (
		<>
			{toastNode}
			<div className={styles.overlay} onClick={onClose}>
			<div
				className={styles.modal}
				role='dialog'
				aria-modal='true'
				aria-label='RAC de enfermería'
				onClick={(e) => e.stopPropagation()}
			>
				<header className={styles.header}>
					<div className={styles.headerInfo}>
						<div className={styles.headerIcon} aria-hidden>
							🩺
						</div>
						<div>
							<h2>RAC de enfermería</h2>
							<p>
								<strong>{paciente}</strong>
								{slot.numeroDocumento ? ` · DNI ${slot.numeroDocumento}` : ''}
								{` · ${fmtFecha(fechaTurno)} · ${slot.hora}`}
								{slot.sector ? ` · Sector ${slot.sector}` : ''}
							</p>
						</div>
					</div>
					<button
						type='button'
						className={styles.closeBtn}
						onClick={onClose}
						aria-label='Cerrar'
					>
						×
					</button>
				</header>

				{error && (
					<div className={styles.alerts}>
						<div className={styles.error}>{error}</div>
					</div>
				)}

				<div className={styles.body}>
					{loading ? (
						<div className={styles.loading}>Cargando…</div>
					) : (
						<div className={styles.grid}>
							{/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Columna izquierda: tablas â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
							<div className={styles.left}>
								{/* Controles */}
								<section className={styles.panel}>
									<header className={styles.panelHeader}>
										<div>
											<h3>Controles de enfermería</h3>
											<span className={styles.badge}>
												{rac?.controles.length ?? 0}
											</span>
										</div>
										<div className={styles.panelActions}>
											<button
												type='button'
												className={styles.btnPrimary}
												onClick={() => setShowControlForm((v) => !v)}
											>
												{showControlForm ? 'Cancelar' : '+ Agregar'}
											</button>
										</div>
									</header>

									{showControlForm && (
										<form
											className={styles.form}
											onSubmit={guardarControl}
											key='form-control'
										>
											<div className={styles.formRow}>
												<div className={styles.field}>
													<label>Fecha</label>
													<input
														type='date'
														className={styles.input}
														value={controlForm.fechaControl}
														onChange={(e) =>
															setCF('fechaControl', e.target.value)
														}
														required
													/>
												</div>
												<div className={styles.field}>
													<label>Hora</label>
													<input
														type='time'
														className={styles.input}
														value={controlForm.horaControl}
														onChange={(e) =>
															setCF('horaControl', e.target.value)
														}
														required
													/>
												</div>
												<div className={styles.field}>
													<label>F.C. (lat/min)</label>
													<input
														type='number'
														className={styles.input}
														value={controlForm.pulso}
														onChange={numChange('pulso')}
													/>
												</div>
											</div>

											<fieldset className={styles.fieldset}>
												<legend>Presión arterial (mmHg)</legend>
												<div className={styles.formRow}>
													<div className={styles.field}>
														<label>Máximo</label>
														<input
															type='number'
															className={styles.input}
															value={controlForm.presionMax}
															onChange={numChange('presionMax')}
														/>
													</div>
													<div className={styles.field}>
														<label>Mínimo</label>
														<input
															type='number'
															className={styles.input}
															value={controlForm.presionMin}
															onChange={numChange('presionMin')}
														/>
													</div>
													<div className={styles.field}>
														<label>Media</label>
														<input
															type='number'
															className={styles.input}
															value={controlForm.presionMedia}
															onChange={numChange('presionMedia')}
														/>
													</div>
												</div>
											</fieldset>

											<fieldset className={styles.fieldset}>
												<legend>Temperatura (°C)</legend>
												<div className={styles.formRow}>
													<div className={styles.field}>
														<label>Axilar</label>
														<input
															type='number'
															step='0.1'
															className={styles.input}
															value={controlForm.temperaturaAxilar}
															onChange={numChange('temperaturaAxilar')}
														/>
													</div>
													<div className={styles.field}>
														<label>Rectal</label>
														<input
															type='number'
															step='0.1'
															className={styles.input}
															value={controlForm.temperaturaRectal}
															onChange={numChange('temperaturaRectal')}
														/>
													</div>
													<div className={styles.field}>
														<label>F.R. (rpm)</label>
														<input
															type='number'
															className={styles.input}
															value={controlForm.frecuenciaRespiratoria}
															onChange={numChange('frecuenciaRespiratoria')}
														/>
													</div>
												</div>
											</fieldset>

											<div className={styles.formRow}>
												<div className={styles.field}>
													<label>Glucemia (mg/dL)</label>
													<input
														type='number'
														className={styles.input}
														value={controlForm.glucemia}
														onChange={numChange('glucemia')}
													/>
												</div>
												<div className={styles.field}>
													<label>Sat. Oâ‚‚ (%)</label>
													<input
														type='number'
														className={styles.input}
														value={controlForm.saturacion}
														onChange={numChange('saturacion')}
													/>
												</div>
												<div className={styles.field}>
													<label>Peso (kg)</label>
													<input
														type='number'
														step='0.1'
														className={styles.input}
														value={controlForm.peso}
														onChange={numChange('peso')}
													/>
												</div>
												<div className={styles.field}>
													<label>Talla (cm)</label>
													<input
														type='number'
														className={styles.input}
														value={controlForm.talla}
														onChange={numChange('talla')}
													/>
												</div>
												<div className={styles.field}>
													<label>IMC (kg/m²)</label>
													<input
														type='text'
														className={styles.input}
														value={formatIMC(controlForm.peso, controlForm.talla)}
														readOnly
														tabIndex={-1}
													/>
												</div>
											</div>

											<div className={styles.field}>
												<label>Observaciones</label>
												<textarea
													className={styles.textarea}
													rows={2}
													value={controlForm.observaciones}
													onChange={(e) =>
														setCF('observaciones', e.target.value)
													}
												/>
											</div>

											<div className={styles.formActions}>
												<button
													type='button'
													className={styles.btnSecondary}
													onClick={() => setShowControlForm(false)}
												>
													Cancelar
												</button>
												<button
													type='submit'
													className={styles.btnPrimary}
													disabled={saving}
												>
													{saving ? 'Guardando…' : 'Guardar control'}
												</button>
											</div>
										</form>
									)}

									<div className={styles.tableScroll}>
										{(rac?.controles.length ?? 0) === 0 ? (
											<div className={styles.empty}>
												Sin controles cargados
											</div>
										) : (
											<table className={styles.table}>
												<thead>
													<tr>
														<th rowSpan={2}>Fecha</th>
														<th rowSpan={2}>Hora</th>
														<th rowSpan={2}>F.C.</th>
														<th colSpan={3}>Presión arterial</th>
														<th rowSpan={2}>F.R.</th>
														<th colSpan={2}>Temperatura</th>
														<th rowSpan={2}>Glucemia</th>
														<th rowSpan={2}>Sat</th>
														<th rowSpan={2}>Peso</th>
														<th rowSpan={2}>Talla</th>
														<th rowSpan={2}>IMC</th>
														<th rowSpan={2}></th>
													</tr>
													<tr>
														<th>Máx</th>
														<th>Mín</th>
														<th>Media</th>
														<th>Axilar</th>
														<th>Rectal</th>
													</tr>
												</thead>
												<tbody>
													{rac?.controles.map((c) => (
														<tr key={c.Valor}>
															<td>{fmtFecha(c.FechaControl)}</td>
															<td>{fmtHora(c.HoraControl)}</td>
															<td>{num(c.Pulso)}</td>
															<td>{num(c.Maximo)}</td>
															<td>{num(c.Minimo)}</td>
															<td>{num(c.PAMedia)}</td>
															<td>{num(c.FrecuenciaRespiratoria)}</td>
															<td>{dec(c.Axilar)}</td>
															<td>{dec(c.Rectal)}</td>
															<td>{c.Hgt && c.Hgt !== '0' ? c.Hgt : '—'}</td>
															<td>
																{c.Saturometria
																	? `${c.Saturometria}%`
																	: '—'}
															</td>
															<td>{dec(c.Peso)}</td>
															<td>{num(c.Talla)}</td>
															<td>{formatIMC(c.Peso, c.Talla, c.IMC)}</td>
															<td className={styles.cellAccion}>
																<button
																	type='button'
																	className={styles.btnIcon}
																	title='Borrar'
																	onClick={() => eliminarControl(c)}
																>
																	🗑
																</button>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										)}
									</div>
								</section>

								{/* Medicación aplicada */}
								<section className={styles.panel}>
									<header className={styles.panelHeader}>
										<div>
											<h3>Medicamentos aplicados</h3>
											<span className={styles.badge}>
												{rac?.medicacion.length ?? 0}
											</span>
										</div>
										<div className={styles.panelActions}>
											<button
												type='button'
												className={styles.btnPrimary}
												onClick={() => {
													setShowMedForm((v) => !v);
													if (!medForm.tipoUnidad && unidades[0]) {
														setMedForm((p) => ({
															...p,
															tipoUnidad: unidades[0].Valor,
														}));
													}
												}}
											>
												{showMedForm ? 'Cancelar' : '+ Agregar'}
											</button>
										</div>
									</header>

									{showMedForm && (
										<form
											className={styles.form}
											onSubmit={guardarMedicacion}
											key='form-med'
										>

											<div className={styles.formRow}>
												<div className={styles.field}>
													<label>Fecha</label>
													<input
														type='date'
														className={styles.input}
														value={medForm.fechaControl}
														onChange={(e) =>
															setMedForm((p) => ({
																...p,
																fechaControl: e.target.value,
															}))
														}
														required
													/>
												</div>
												<div className={styles.field}>
													<label>Hora</label>
													<input
														type='time'
														className={styles.input}
														value={medForm.horaControl}
														onChange={(e) =>
															setMedForm((p) => ({
																...p,
																horaControl: e.target.value,
															}))
														}
														required
													/>
												</div>
												<div className={styles.field}>
													<label>Cantidad</label>
													<input
														type='number'
														step='0.01'
														min={0}
														className={styles.input}
														value={medForm.cantidad}
														onChange={(e) =>
															setMedForm((p) => ({
																...p,
																cantidad: Number(e.target.value),
															}))
														}
														required
													/>
												</div>
												<div className={styles.field}>
													<label>Unidad</label>
													<select
														className={styles.select}
														value={medForm.tipoUnidad}
														onChange={(e) =>
															setMedForm((p) => ({
																...p,
																tipoUnidad: e.target.value,
															}))
														}
													>
														<option value=''>—</option>
														{unidades.map((u) => (
															<option key={u.Valor} value={u.Valor}>
																{u.Descripcion || u.Valor}
															</option>
														))}
													</select>
												</div>
											</div>
											<div className={styles.medSearch}>
												<label>Medicamento</label>
												<input
													className={styles.input}
													placeholder='Buscar en vademécum…'
													value={medSel ? medSel.nombre : medTerm}
													onChange={(e) => {
														setMedSel(null);
														setMedTerm(e.target.value);
													}}
												/>
												{!medSel && medFiltrados.length > 0 && (
													<div className={styles.medResults}>
														{medFiltrados.map((v) => (
															<button
																key={v.Valor}
																type='button'
																className={styles.medResultItem}
																onClick={() => {
																	setMedSel({
																		troquel: v.Valor,
																		nombre: v.Nombre,
																	});
																	setMedTerm(v.Nombre);
																}}
															>
																<strong>{v.Nombre}</strong>
																{v.Descripcion ? (
																	<span>{v.Descripcion}</span>
																) : null}
															</button>
														))}
													</div>
												)}
											</div>

											<div className={styles.field}>
												<label>Observaciones</label>
												<textarea
													className={styles.textarea}
													rows={2}
													value={medForm.observaciones}
													onChange={(e) =>
														setMedForm((p) => ({
															...p,
															observaciones: e.target.value,
														}))
													}
												/>
											</div>

											<div className={styles.formActions}>
												<button
													type='button'
													className={styles.btnSecondary}
													onClick={() => setShowMedForm(false)}
												>
													Cancelar
												</button>
												<button
													type='submit'
													className={styles.btnPrimary}
													disabled={saving || !medSel}
												>
													{saving
														? 'Guardando…'
														: 'Registrar como aplicado'}
												</button>
											</div>
										</form>
									)}

									<div className={styles.tableScroll}>
										{(rac?.medicacion.length ?? 0) === 0 ? (
											<div className={styles.empty}>
												Sin medicación aplicada
											</div>
										) : (
											<table className={styles.table}>
												<thead>
													<tr>
														<th>Fecha</th>
														<th>Hora</th>
														<th>Cantidad</th>
														<th>Unidad</th>
														<th>Troquel</th>
														<th>Medicamento</th>
														<th></th>
													</tr>
												</thead>
												<tbody>
													{rac?.medicacion.map((m) => (
														<tr key={m.IDCtrlMedica}>
															<td>{fmtFecha(m.FechaControl)}</td>
															<td>{fmtHora(m.HoraControl)}</td>
															<td>{m.Cantidad}</td>
															<td>{m.TipoUnidad || '—'}</td>
															<td>{m.Troquel || '—'}</td>
															<td className={styles.medName}>
																{m.NombreMedicamento ||
																	m.DescripcionMedicamento ||
																	'—'}
															</td>
															<td className={styles.cellAccion}>
																<button
																	type='button'
																	className={styles.btnIcon}
																	title='Borrar'
																	onClick={() => eliminarMed(m)}
																>
																	🗑
																</button>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										)}
									</div>
								</section>
							</div>

							{/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Columna derecha: triage â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
							<aside className={styles.right}>
								<section className={styles.panel}>
									<header className={styles.panelHeader}>
										<div>
											<h3>Triage de Manchester</h3>
										</div>
									</header>

									<div className={styles.triageBody}>
										<p className={styles.triageHint}>
											{triageSel
												? 'Nivel asignado · elegí otro número para cambiar'
												: 'Elegí un número para clasificar al paciente'}
										</p>

										<div className={styles.triageStage}>
											<article
												key={triageVisible.id}
												className={styles.triagePass}
												style={
													{
														'--pass-bg': triageVisible.color,
														'--pass-inner': triageVisible.colorInner,
														'--pass-fg': triageVisible.colorTexto,
													} as React.CSSProperties
												}
												aria-live='polite'
											>
												<div className={styles.triagePassHanger} aria-hidden>
													<span className={styles.triagePassHole} />
													<span className={styles.triagePassHole} />
												</div>
												<div className={styles.triagePassBody}>
													<span className={styles.triagePassTag}>
														Tag · Triage
													</span>
													<span className={styles.triagePassFieldLbl}>
														Paciente
													</span>
													<div className={styles.triagePassField}>
														{paciente}
													</div>
													<div className={styles.triagePassCore}>
														<span
															className={styles.triagePassNumWrap}
															data-num={triageVisible.id}
														>
															<span className={styles.triagePassNum}>
																{triageVisible.id}
															</span>
														</span>
														<span className={styles.triagePassStatus}>
															{triageVisible.titulo}
														</span>
														<span className={styles.triagePassWait}>
															{triageVisible.tiempo}
														</span>
													</div>
													<span className={styles.triagePassFieldLbl}>
														Detalle
													</span>
													<div className={styles.triagePassField}>
														{triageVisible.descripcion}
													</div>
												</div>
											</article>
										</div>

										<div
											className={styles.triageNums}
											role='group'
											aria-label='Nivel de triage'
										>
											{TRIAGE_NIVELES.map((n) => (
												<button
													key={n.id}
													type='button'
													className={`${styles.triageNumBtn} ${triageVista === n.id ? styles.triageNumBtnActive : ''} ${triageSel === n.id ? styles.triageNumBtnSaved : ''}`}
													style={
														{ '--num-color': n.color } as React.CSSProperties
													}
													onClick={() => elegirTriage(n.id)}
													disabled={saving}
													aria-pressed={triageVista === n.id}
													aria-label={`Nivel ${n.id}: ${n.titulo}`}
												>
													<span
														className={styles.triageNumGlyph}
														data-num={n.id}
													>
														{n.id}
													</span>
												</button>
											))}
										</div>
									</div>
								</section>
							</aside>
						</div>
					)}
				</div>

				<footer className={styles.footer}>
					<button
						type='button'
						className={styles.btnSecondary}
						onClick={onClose}
					>
						Cerrar
					</button>
				</footer>
			</div>
		</div>
		</>
	);
}
