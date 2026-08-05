'use client';

import React, { useEffect, useState } from 'react';
import styles from '../Personal/AgendaTab/AgendaTab.module.css';
import { agendaService } from '@/app/services/agendaService';
import { DIAS_SEMANA, type DiaSemana } from '@/app/types/agenda';

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

const INTERVALOS = [5, 10, 15, 20, 30, 45, 60];

type Props = {
	tipo: 'SECTOR' | 'SERVICIO' | '';
	valor: string;
	readOnly?: boolean;
};

export default function AgendaRecursoTab({ tipo, valor, readOnly = false }: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [info, setInfo] = useState<string | null>(null);
	const [intervaloMin, setIntervaloMin] = useState(30);
	const [consultorio, setConsultorio] = useState('');
	const [servicio, setServicio] = useState('');
	const [estado, setEstado] = useState<Record<DiaSemana, DiaState>>(
		Object.fromEntries(DIAS_SEMANA.map((d) => [d, { ...EMPTY_DIA }])) as Record<
			DiaSemana,
			DiaState
		>,
	);

	useEffect(() => {
		if (!tipo || !valor.trim()) return;
		let cancel = false;
		setLoading(true);
		setError(null);
		void agendaService
			.getHorariosRecurso(tipo, valor.trim())
			.then((h: any) => {
				if (cancel) return;
				setIntervaloMin(Number(h?.intervaloMin) || 30);
				setConsultorio(String(h?.consultorio || ''));
				setServicio(String(h?.servicio || ''));
				const out = {} as Record<DiaSemana, DiaState>;
				for (const d of DIAS_SEMANA) {
					const found = (h?.dias || []).find((x: any) => x.dia === d);
					if (!found || !found.rangos?.length) {
						out[d] = { ...EMPTY_DIA };
						continue;
					}
					const rangos = [...found.rangos].sort((a: any, b: any) =>
						String(a.inicio).localeCompare(String(b.inicio)),
					);
					out[d] = {
						enabled: true,
						mode: rangos.length >= 2 ? 'doble' : 'simple',
						rango1: {
							inicio: rangos[0].inicio || '08:00',
							fin: rangos[0].fin || '12:00',
						},
						rango2: rangos[1]
							? {
									inicio: rangos[1].inicio || '15:00',
									fin: rangos[1].fin || '19:00',
								}
							: EMPTY_DIA.rango2,
					};
				}
				setEstado(out);
			})
			.catch((e: unknown) => {
				if (!cancel) setError(e instanceof Error ? e.message : 'Error al cargar horarios');
			})
			.finally(() => {
				if (!cancel) setLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [tipo, valor]);

	const guardar = async () => {
		if (!tipo || !valor.trim()) return;
		setSaving(true);
		setError(null);
		setInfo(null);
		try {
			const dias = DIAS_SEMANA.map((d) => {
				const st = estado[d];
				if (!st.enabled) return { dia: d, rangos: [] as { inicio: string; fin: string }[] };
				const rangos = [{ inicio: st.rango1.inicio, fin: st.rango1.fin }];
				if (st.mode === 'doble') rangos.push({ inicio: st.rango2.inicio, fin: st.rango2.fin });
				return { dia: d, rangos };
			});
			await agendaService.putHorariosRecurso(tipo, valor.trim(), {
				intervaloMin,
				consultorio: consultorio.trim() || undefined,
				servicio: servicio.trim() || undefined,
				dias,
			});
			setInfo('Horarios del recurso guardados');
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	if (!tipo || !valor.trim()) {
		return <p className={styles.error}>Elegí tipo (sector/servicio) y código para configurar.</p>;
	}

	if (loading) return <p className={styles.error}>Cargando horarios…</p>;

	return (
		<div className={styles.wrapper}>
			{error && <div className={styles.error}>{error}</div>}
			{info && <div className={styles.error} style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}>{info}</div>}
			<div className={styles.header}>
				<div className={styles.field}>
					<label>Intervalo (min)</label>
					<select
						value={intervaloMin}
						disabled={readOnly}
						onChange={(e) => setIntervaloMin(Number(e.target.value))}
					>
						{INTERVALOS.map((n) => (
							<option key={n} value={n}>
								{n}
							</option>
						))}
					</select>
				</div>
				<div className={styles.field}>
					<label>Consultorio</label>
					<input
						value={consultorio}
						disabled={readOnly}
						onChange={(e) => setConsultorio(e.target.value)}
						maxLength={4}
					/>
				</div>
				<div className={styles.field}>
					<label>Servicio</label>
					<input
						value={servicio}
						disabled={readOnly}
						onChange={(e) => setServicio(e.target.value)}
						maxLength={4}
					/>
				</div>
				{!readOnly && (
					<div className={styles.field}>
						<label>&nbsp;</label>
						<button
							type="button"
							className={styles.btnPrimary}
							onClick={() => void guardar()}
							disabled={saving}
						>
							{saving ? 'Guardando…' : 'Guardar'}
						</button>
					</div>
				)}
			</div>
			<div className={styles.daysList}>
				{DIAS_SEMANA.map((d) => {
					const st = estado[d];
					return (
						<div
							key={d}
							className={`${styles.dayCard} ${st.enabled ? styles.dayCardActive : ''}`}
						>
							<div className={styles.dayHeader}>
								<label className={styles.dayCheckbox}>
									<input
										type="checkbox"
										checked={st.enabled}
										disabled={readOnly}
										onChange={(e) =>
											setEstado((prev) => ({
												...prev,
												[d]: { ...prev[d], enabled: e.target.checked },
											}))
										}
									/>
									{d}
								</label>
								{st.enabled && (
									<select
										value={st.mode}
										disabled={readOnly}
										onChange={(e) =>
											setEstado((prev) => ({
												...prev,
												[d]: { ...prev[d], mode: e.target.value as Mode },
											}))
										}
									>
										<option value="simple">Simple</option>
										<option value="doble">Doble</option>
									</select>
								)}
							</div>
							{st.enabled && (
								<div className={styles.rangos}>
									<div className={styles.rango}>
										<input
											type="time"
											value={st.rango1.inicio}
											disabled={readOnly}
											onChange={(e) =>
												setEstado((prev) => ({
													...prev,
													[d]: {
														...prev[d],
														rango1: { ...prev[d].rango1, inicio: e.target.value },
													},
												}))
											}
										/>
										<span>a</span>
										<input
											type="time"
											value={st.rango1.fin}
											disabled={readOnly}
											onChange={(e) =>
												setEstado((prev) => ({
													...prev,
													[d]: {
														...prev[d],
														rango1: { ...prev[d].rango1, fin: e.target.value },
													},
												}))
											}
										/>
									</div>
									{st.mode === 'doble' && (
										<div className={styles.rango}>
											<input
												type="time"
												value={st.rango2.inicio}
												disabled={readOnly}
												onChange={(e) =>
													setEstado((prev) => ({
														...prev,
														[d]: {
															...prev[d],
															rango2: { ...prev[d].rango2, inicio: e.target.value },
														},
													}))
												}
											/>
											<span>a</span>
											<input
												type="time"
												value={st.rango2.fin}
												disabled={readOnly}
												onChange={(e) =>
													setEstado((prev) => ({
														...prev,
														[d]: {
															...prev[d],
															rango2: { ...prev[d].rango2, fin: e.target.value },
														},
													}))
												}
											/>
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
