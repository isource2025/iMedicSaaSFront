'use client';

import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react';
import styles from './AgendaTab.module.css';
import { agendaConfigService } from '../../../services/agendaConfigService';
import {
	DIAS_SEMANA,
	type DiaSemana,
	type HorariosResponse,
	type NoHorario,
} from '../../../types/agenda';

interface AgendaTabProps {
	matricula: number | null | undefined;
	readOnly?: boolean;
	/** Oculta el botón local; el modal padre llama guardar() por ref. */
	hideActions?: boolean;
	onDirtyChange?: (dirty: boolean) => void;
}

export type AgendaTabHandle = {
	guardar: () => Promise<boolean>;
	isDirty: () => boolean;
};

type Mode = 'simple' | 'doble';

interface DiaState {
	enabled: boolean;
	mode: Mode;
	rango1: { inicio: string; fin: string };
	rango2: { inicio: string; fin: string };
}

const EMPTY_DIA: DiaState = {
	enabled: false,
	mode: 'simple',
	rango1: { inicio: '08:00', fin: '12:00' },
	rango2: { inicio: '15:00', fin: '19:00' },
};

/** 0 = a demanda (horarios sin grilla de slots) */
const INTERVALOS = [0, 5, 10, 15, 20, 30, 45, 60];
const aDemanda = (intervalo: number) => intervalo === 0;

function diffMin(inicio: string, fin: string): number {
	const [hi, mi] = inicio.split(':').map(Number);
	const [hf, mf] = fin.split(':').map(Number);
	if ([hi, mi, hf, mf].some((n) => Number.isNaN(n))) return 0;
	return hf * 60 + mf - (hi * 60 + mi);
}

function buildEstadoDesdeHorarios(h: HorariosResponse): Record<DiaSemana, DiaState> {
	const out = {} as Record<DiaSemana, DiaState>;
	for (const d of DIAS_SEMANA) {
		const found = h.dias.find((x) => x.dia === d);
		if (!found || found.rangos.length === 0) {
			out[d] = { ...EMPTY_DIA };
			continue;
		}
		const rangos = [...found.rangos].sort((a, b) =>
			a.inicio.localeCompare(b.inicio),
		);
		out[d] = {
			enabled: true,
			mode: rangos.length >= 2 ? 'doble' : 'simple',
			rango1: { inicio: rangos[0].inicio || '08:00', fin: rangos[0].fin || '12:00' },
			rango2: rangos[1]
				? { inicio: rangos[1].inicio || '15:00', fin: rangos[1].fin || '19:00' }
				: EMPTY_DIA.rango2,
		};
	}
	return out;
}

const AgendaTab = forwardRef<AgendaTabHandle, AgendaTabProps>(function AgendaTab(
	{ matricula, readOnly = false, hideActions = false, onDirtyChange },
	ref,
) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [info, setInfo] = useState<string | null>(null);

	const [intervaloMin, setIntervaloMin] = useState<number>(30);
	const [consultorio, setConsultorio] = useState<string>('');
	const [servicio, setServicio] = useState<string>('');
	const [estado, setEstado] = useState<Record<DiaSemana, DiaState>>(
		Object.fromEntries(DIAS_SEMANA.map((d) => [d, { ...EMPTY_DIA }])) as Record<
			DiaSemana,
			DiaState
		>,
	);
	const [permanentesCount, setPermanentesCount] = useState(0);
	const baselineRef = useRef('');

	// No-horarios
	const [noHorarios, setNoHorarios] = useState<NoHorario[]>([]);
	const [showNoH, setShowNoH] = useState(false);
	const [nuevaAusencia, setNuevaAusencia] = useState({
		desdeFecha: '',
		hastaFecha: '',
		diaCompleto: true,
		horaDesde: '08:00',
		horaHasta: '12:00',
		motivo: 1,
	});

	const cargar = async (mat: number) => {
		setLoading(true);
		setError(null);
		try {
			const [h, nh] = await Promise.all([
				agendaConfigService.getHorarios(mat),
				agendaConfigService.getNoHorarios(mat),
			]);
			const nextIntervalo = h.intervaloMin != null ? h.intervaloMin : 30;
			const nextConsultorio = h.consultorio || '';
			const nextServicio = h.servicio || '';
			const nextEstado = buildEstadoDesdeHorarios(h);
			if (h.intervaloMin != null) setIntervaloMin(nextIntervalo);
			setConsultorio(nextConsultorio);
			setServicio(nextServicio);
			setEstado(nextEstado);
			setPermanentesCount(h.permanentes?.length || 0);
			setNoHorarios(nh);
			baselineRef.current = JSON.stringify({
				intervaloMin: nextIntervalo,
				consultorio: nextConsultorio,
				servicio: nextServicio,
				estado: nextEstado,
			});
		} catch (e: any) {
			setError(e?.response?.data?.mensaje || e?.message || 'Error cargando agenda');
		} finally {
			setLoading(false);
		}
	};

	const snapshot = () =>
		JSON.stringify({ intervaloMin, consultorio, servicio, estado });

	const isDirty = () => Boolean(baselineRef.current) && snapshot() !== baselineRef.current;

	useEffect(() => {
		onDirtyChange?.(isDirty());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [intervaloMin, consultorio, servicio, estado]);

	useEffect(() => {
		if (!matricula || matricula <= 0) {
			setLoading(false);
			return;
		}
		cargar(matricula);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [matricula]);

	const total = useMemo(() => {
		if (aDemanda(intervaloMin)) return 0;
		let t = 0;
		for (const d of DIAS_SEMANA) {
			const s = estado[d];
			if (!s?.enabled) continue;
			t += Math.max(0, Math.floor(diffMin(s.rango1.inicio, s.rango1.fin) / intervaloMin));
			if (s.mode === 'doble')
				t += Math.max(0, Math.floor(diffMin(s.rango2.inicio, s.rango2.fin) / intervaloMin));
		}
		return t;
	}, [estado, intervaloMin]);

	const updateDia = (d: DiaSemana, patch: Partial<DiaState>) =>
		setEstado((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));

	const updateRango = (
		d: DiaSemana,
		idx: 1 | 2,
		field: 'inicio' | 'fin',
		value: string,
	) =>
		setEstado((prev) => ({
			...prev,
			[d]: {
				...prev[d],
				[`rango${idx}`]: { ...prev[d][`rango${idx}` as 'rango1' | 'rango2'], [field]: value },
			},
		}));

	const validar = (): string | null => {
		for (const d of DIAS_SEMANA) {
			const s = estado[d];
			if (!s.enabled) continue;
			const rangos: { inicio: string; fin: string }[] = [s.rango1];
			if (s.mode === 'doble') rangos.push(s.rango2);
			for (const r of rangos) {
				const min = diffMin(r.inicio, r.fin);
				if (min <= 0) return `${d}: el rango ${r.inicio}-${r.fin} es inválido`;
				if (!aDemanda(intervaloMin) && min % intervaloMin !== 0)
					return `${d}: el rango ${r.inicio}-${r.fin} no es múltiplo de ${intervaloMin} min`;
			}
			if (s.mode === 'doble' && s.rango2.inicio < s.rango1.fin)
				return `${d}: los rangos se solapan`;
		}
		return null;
	};

	const guardar = async (): Promise<boolean> => {
		if (!matricula || matricula <= 0) return false;
		const err = validar();
		if (err) {
			setError(err);
			return false;
		}
		setError(null);
		setInfo(null);
		setSaving(true);
		try {
			const dias = DIAS_SEMANA.map((d) => {
				const s = estado[d];
				if (!s.enabled) return { dia: d, rangos: [] };
				const rangos = [{ inicio: s.rango1.inicio, fin: s.rango1.fin }];
				if (s.mode === 'doble')
					rangos.push({ inicio: s.rango2.inicio, fin: s.rango2.fin });
				return { dia: d, rangos };
			});
			const r = await agendaConfigService.putHorarios(matricula, {
				intervaloMin,
				consultorio: consultorio || null,
				servicio: servicio || null,
				dias,
			});
			const nextEstado = buildEstadoDesdeHorarios(r);
			setEstado(nextEstado);
			baselineRef.current = JSON.stringify({
				intervaloMin,
				consultorio,
				servicio,
				estado: nextEstado,
			});
			onDirtyChange?.(false);
			setInfo('Configuración guardada');
			return true;
		} catch (e: any) {
			setError(e?.response?.data?.mensaje || e?.message || 'Error guardando');
			return false;
		} finally {
			setSaving(false);
		}
	};

	useImperativeHandle(ref, () => ({
		guardar,
		isDirty,
	}));

	const crearAusencia = async () => {
		if (!matricula) return;
		if (!nuevaAusencia.desdeFecha) {
			setError('La fecha desde es obligatoria');
			return;
		}
		setError(null);
		try {
			await agendaConfigService.createNoHorario(matricula, {
				desdeFecha: nuevaAusencia.desdeFecha,
				hastaFecha: nuevaAusencia.hastaFecha || nuevaAusencia.desdeFecha,
				diaCompleto: nuevaAusencia.diaCompleto,
				horaDesde: nuevaAusencia.diaCompleto ? undefined : nuevaAusencia.horaDesde,
				horaHasta: nuevaAusencia.diaCompleto ? undefined : nuevaAusencia.horaHasta,
				motivo: nuevaAusencia.motivo,
			});
			setNuevaAusencia({
				desdeFecha: '',
				hastaFecha: '',
				diaCompleto: true,
				horaDesde: '08:00',
				horaHasta: '12:00',
				motivo: 1,
			});
			const nh = await agendaConfigService.getNoHorarios(matricula);
			setNoHorarios(nh);
			setInfo('Ausencia agregada');
		} catch (e: any) {
			setError(e?.response?.data?.mensaje || e?.message || 'Error creando ausencia');
		}
	};

	const borrarAusencia = async (n: NoHorario) => {
		if (!matricula || !n.desdeFecha) return;
		if (!confirm('¿Eliminar esta ausencia?')) return;
		try {
			await agendaConfigService.deleteNoHorario(matricula, {
				desdeFecha: n.desdeFecha,
				horaDesde: n.horaDesde || undefined,
				motivo: n.motivo,
			});
			const nh = await agendaConfigService.getNoHorarios(matricula);
			setNoHorarios(nh);
		} catch (e: any) {
			setError(e?.response?.data?.mensaje || e?.message || 'Error eliminando');
		}
	};

	if (!matricula || matricula <= 0) {
		return (
			<div className={styles.warning}>
				Para configurar la agenda, este profesional debe tener cargada la
				<strong> Matrícula Provincial</strong> en la solapa &quot;Datos Profesionales&quot;.
			</div>
		);
	}

	return (
		<div className={styles.wrapper}>
			{loading ? <p className={styles.dayCount} style={{ margin: 0 }}>Cargando agenda…</p> : null}
			{error && <div className={styles.error}>{error}</div>}
			{info && <div className={styles.totalRow} style={{ background: '#ecfdf5', borderColor: '#bbf7d0', color: '#065f46' }}>{info}</div>}
			{permanentesCount > 0 && (
				<div className={styles.warning}>
					Este profesional tiene {permanentesCount} horario{permanentesCount > 1 ? 's' : ''} de
					guardia continua (legacy, sin día específico). No se modifican desde acá.
				</div>
			)}

			<div className={styles.header}>
				<div className={styles.field}>
					<label>Intervalo de consulta</label>
					<select
						value={intervaloMin}
						onChange={(e) => setIntervaloMin(Number(e.target.value))}
						disabled={readOnly}
					>
						{INTERVALOS.map((n) => (
							<option key={n} value={n}>
								{n === 0 ? 'A demanda (sin slots)' : `${n} min`}
							</option>
						))}
					</select>
				</div>
				<div className={styles.field}>
					<label>Consultorio</label>
					<input
						type='text'
						maxLength={4}
						value={consultorio}
						onChange={(e) => setConsultorio(e.target.value.toUpperCase())}
						disabled={readOnly}
					/>
				</div>
				<div className={styles.field}>
					<label>Servicio</label>
					<input
						type='text'
						maxLength={4}
						value={servicio}
						onChange={(e) => setServicio(e.target.value.toUpperCase())}
						disabled={readOnly}
					/>
				</div>
				<div className={styles.field}>
					<label>Total semanal</label>
					<div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0083A9' }}>
						{aDemanda(intervaloMin) ? 'A demanda' : `${total} turnos`}
					</div>
				</div>
			</div>

			<div className={styles.daysList}>
				{DIAS_SEMANA.map((d) => {
					const s = estado[d];
					const esAd = aDemanda(intervaloMin);
					const cnt1 =
						s.enabled && !esAd
							? Math.max(0, Math.floor(diffMin(s.rango1.inicio, s.rango1.fin) / intervaloMin))
							: 0;
					const cnt2 =
						s.enabled && !esAd && s.mode === 'doble'
							? Math.max(0, Math.floor(diffMin(s.rango2.inicio, s.rango2.fin) / intervaloMin))
							: 0;
					return (
						<div
							key={d}
							className={`${styles.dayCard} ${s.enabled ? styles.dayCardActive : ''}`}
						>
							<div className={styles.dayHeader}>
								<label className={styles.dayCheckbox}>
									<input
										type='checkbox'
										checked={s.enabled}
										onChange={(e) => updateDia(d, { enabled: e.target.checked })}
										disabled={readOnly}
									/>
									{d}
								</label>
								{s.enabled && (
									<div className={styles.modeButtons}>
										<button
											type='button'
											className={`${styles.modeButton} ${s.mode === 'simple' ? styles.modeButtonActive : ''}`}
											onClick={() => updateDia(d, { mode: 'simple' })}
											disabled={readOnly}
										>
											Jornada simple
										</button>
										<button
											type='button'
											className={`${styles.modeButton} ${s.mode === 'doble' ? styles.modeButtonActive : ''}`}
											onClick={() => updateDia(d, { mode: 'doble' })}
											disabled={readOnly}
										>
											Doble jornada
										</button>
									</div>
								)}
								{s.enabled && (
									<div className={styles.dayCount}>
										{esAd ? (
											<strong>A demanda</strong>
										) : (
											<>
												<strong>{cnt1 + cnt2}</strong> turnos / día
											</>
										)}
									</div>
								)}
							</div>

							{s.enabled && (
								<div className={styles.rangos}>
									<div className={styles.rango}>
										<span className={styles.rangoLabel}>Rango 1:</span>
										<input
											type='time'
											aria-label={`${d} · Rango 1 desde`}
											value={s.rango1.inicio}
											onChange={(e) => updateRango(d, 1, 'inicio', e.target.value)}
											disabled={readOnly}
										/>
										<span>–</span>
										<input
											type='time'
											aria-label={`${d} · Rango 1 hasta`}
											value={s.rango1.fin}
											onChange={(e) => updateRango(d, 1, 'fin', e.target.value)}
											disabled={readOnly}
										/>
										<span className={styles.rangoCount}>
											{esAd ? '→ sin slots' : `→ ${cnt1} turnos`}
										</span>
									</div>
									{s.mode === 'doble' && (
										<div className={styles.rango}>
											<span className={styles.rangoLabel}>Rango 2:</span>
											<input
												type='time'
												aria-label={`${d} · Rango 2 desde`}
												value={s.rango2.inicio}
												onChange={(e) => updateRango(d, 2, 'inicio', e.target.value)}
												disabled={readOnly}
											/>
											<span>–</span>
											<input
												type='time'
												aria-label={`${d} · Rango 2 hasta`}
												value={s.rango2.fin}
												onChange={(e) => updateRango(d, 2, 'fin', e.target.value)}
												disabled={readOnly}
											/>
											<span className={styles.rangoCount}>
												{esAd ? '→ sin slots' : `→ ${cnt2} turnos`}
											</span>
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{!readOnly && !hideActions && (
				<div className={styles.actions}>
					<button
						type='button'
						className={`${styles.btn} ${styles.btnPrimary}`}
						onClick={() => void guardar()}
						disabled={saving}
					>
						{saving ? 'Guardando…' : 'Guardar configuración'}
					</button>
				</div>
			)}

			{/* Ausencias */}
			<div className={styles.section}>
				<div
					className={styles.sectionHeader}
					onClick={() => setShowNoH((v) => !v)}
				>
					<span>Ausencias / No-horarios ({noHorarios.length})</span>
					<span>{showNoH ? '▲' : '▼'}</span>
				</div>
				{showNoH && (
					<div className={styles.sectionBody}>
						<table className={styles.tableSimple}>
							<thead>
								<tr>
									<th>Desde</th>
									<th>Hasta</th>
									<th>Horario</th>
									<th>Motivo</th>
									{!readOnly && <th></th>}
								</tr>
							</thead>
							<tbody>
								{noHorarios.length === 0 && (
									<tr>
										<td colSpan={5} style={{ color: '#64748b', textAlign: 'center' }}>
											Sin ausencias registradas
										</td>
									</tr>
								)}
								{noHorarios.map((n, i) => (
									<tr key={`${n.desdeFecha}-${n.horaDesde || ''}-${n.motivo}-${i}`}>
										<td>{n.desdeFecha}</td>
										<td>{n.hastaFecha}</td>
										<td>
											{n.diaCompleto
												? 'Día completo'
												: `${n.horaDesde || '—'} – ${n.horaHasta || '—'}`}
										</td>
										<td>{n.motivoLabel}</td>
										{!readOnly && (
											<td>
												<button
													type='button'
													className={styles.iconBtn}
													onClick={() => borrarAusencia(n)}
													title='Eliminar'
												>
													✕
												</button>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>

						{!readOnly && (
							<>
								<div className={styles.formNoHorario}>
									<div className={styles.field}>
										<label>Desde</label>
										<input
											type='date'
											value={nuevaAusencia.desdeFecha}
											onChange={(e) =>
												setNuevaAusencia((p) => ({ ...p, desdeFecha: e.target.value }))
											}
										/>
									</div>
									<div className={styles.field}>
										<label>Hasta</label>
										<input
											type='date'
											value={nuevaAusencia.hastaFecha}
											onChange={(e) =>
												setNuevaAusencia((p) => ({ ...p, hastaFecha: e.target.value }))
											}
										/>
									</div>
									<div className={styles.field}>
										<label>Motivo</label>
										<select
											value={nuevaAusencia.motivo}
											onChange={(e) =>
												setNuevaAusencia((p) => ({
													...p,
													motivo: Number(e.target.value),
												}))
											}
										>
											<option value={1}>Enfermedad</option>
											<option value={2}>Viaje</option>
											<option value={3}>Licencia</option>
											<option value={4}>Otro</option>
										</select>
									</div>
									<div className={styles.field}>
										<label>
											<input
												type='checkbox'
												checked={nuevaAusencia.diaCompleto}
												onChange={(e) =>
													setNuevaAusencia((p) => ({
														...p,
														diaCompleto: e.target.checked,
													}))
												}
											/>{' '}
											Día completo
										</label>
									</div>
									{!nuevaAusencia.diaCompleto && (
										<>
											<div className={styles.field}>
												<label>Hora desde</label>
												<input
													type='time'
													value={nuevaAusencia.horaDesde}
													onChange={(e) =>
														setNuevaAusencia((p) => ({
															...p,
															horaDesde: e.target.value,
														}))
													}
												/>
											</div>
											<div className={styles.field}>
												<label>Hora hasta</label>
												<input
													type='time'
													value={nuevaAusencia.horaHasta}
													onChange={(e) =>
														setNuevaAusencia((p) => ({
															...p,
															horaHasta: e.target.value,
														}))
													}
												/>
											</div>
										</>
									)}
								</div>
								<div className={styles.actions} style={{ marginTop: '0.6rem' }}>
									<button
										type='button'
										className={`${styles.btn} ${styles.btnPrimary}`}
										onClick={crearAusencia}
									>
										Agregar ausencia
									</button>
								</div>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
});

AgendaTab.displayName = 'AgendaTab';

export default AgendaTab;
