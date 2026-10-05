'use client';

import React, { useEffect, useState } from 'react';
import type { DietaControl, TipoDieta } from '../../../types/dietaControl';
import {
	actualizarDieta,
	crearDieta,
	fechaEfectiva,
	horaEfectiva,
	obtenerTiposDieta,
} from '../../../services/dietaControlService';
import styles from './DietaSection.module.css';

const OBS_MAX = 255;

const getLocalDate = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const getLocalTime = (d: Date) =>
	`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

interface Props {
	formId: string;
	numeroVisita: number | null;
	defaultFecha?: string | null;
	registroToEdit?: DietaControl | null;
	refetch?: () => Promise<void>;
	onClose: () => void;
}

export default function NuevaDietaModal({
	formId,
	numeroVisita,
	defaultFecha,
	registroToEdit = null,
	refetch,
	onClose,
}: Props) {
	const isEdit = !!registroToEdit;
	const [tipos, setTipos] = useState<TipoDieta[]>([]);
	const [cargandoTipos, setCargandoTipos] = useState(true);
	const [tipoDieta, setTipoDieta] = useState('');
	const [fecha, setFecha] = useState('');
	const [hora, setHora] = useState('');
	const [observaciones, setObservaciones] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const now = new Date();
		setTipoDieta(registroToEdit?.TipoDieta != null ? String(registroToEdit.TipoDieta) : '');
		setFecha(
			(registroToEdit && fechaEfectiva(registroToEdit)) || defaultFecha || getLocalDate(now),
		);
		setHora(
			(registroToEdit && String(horaEfectiva(registroToEdit) || '').slice(0, 5)) ||
				getLocalTime(now),
		);
		setObservaciones(registroToEdit?.Observaciones || '');
		setError(null);
	}, [registroToEdit, defaultFecha]);

	useEffect(() => {
		let vigente = true;
		setCargandoTipos(true);
		obtenerTiposDieta()
			.then((t) => vigente && setTipos(t))
			.catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudieron cargar los tipos de dieta'))
			.finally(() => vigente && setCargandoTipos(false));
		return () => {
			vigente = false;
		};
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (saving) return;
		if (!numeroVisita) return setError('Falta número de visita');
		if (!tipoDieta) return setError('Seleccioná el tipo de dieta');
		if (!fecha || !hora) return setError('Fecha y hora son obligatorias');

		setSaving(true);
		setError(null);
		try {
			const payload = {
				numeroVisita,
				tipoDieta: Number(tipoDieta),
				fechaDieta: fecha,
				horaDieta: hora,
				observaciones: observaciones.trim(),
			};
			if (registroToEdit) await actualizarDieta(registroToEdit.IdCtrlDieta, payload);
			else await crearDieta(payload);
			await refetch?.();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	return (
		<form id={formId} onSubmit={handleSubmit} className={styles.form} noValidate>
			{error && (
				<div className={styles.errorMsg} role="alert">
					{error}
				</div>
			)}

			<div className={styles.grid}>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="dieta-tipo">
						Tipo de dieta <span className={styles.required}>*</span>
					</label>
					<select
						id="dieta-tipo"
						className={styles.input}
						value={tipoDieta}
						onChange={(e) => setTipoDieta(e.target.value)}
						disabled={cargandoTipos}
						autoFocus
					>
						<option value="">{cargandoTipos ? 'Cargando…' : 'Seleccionar…'}</option>
						{tipos.map((t) => (
							<option key={t.Valor} value={String(t.Valor)}>
								{t.Descripcion}
							</option>
						))}
					</select>
				</div>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="dieta-fecha">
						Fecha <span className={styles.required}>*</span>
					</label>
					<input
						id="dieta-fecha"
						className={styles.input}
						type="date"
						value={fecha}
						onChange={(e) => setFecha(e.target.value)}
						required
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="dieta-hora">
						Hora <span className={styles.required}>*</span>
					</label>
					<div className={styles.horaRow}>
						<input
							id="dieta-hora"
							className={styles.input}
							type="time"
							value={hora}
							onChange={(e) => setHora(e.target.value)}
							required
						/>
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={() => {
								const now = new Date();
								setHora(getLocalTime(now));
								if (!isEdit) setFecha(getLocalDate(now));
							}}
						>
							Ahora
						</button>
					</div>
				</div>
			</div>

			<div className={styles.field}>
				<label className={styles.label} htmlFor="dieta-obs">
					Observaciones
				</label>
				<textarea
					id="dieta-obs"
					className={styles.textarea}
					value={observaciones}
					maxLength={OBS_MAX}
					onChange={(e) => setObservaciones(e.target.value)}
					placeholder="Tolerancia, cantidad ingerida, ayuno, etc."
				/>
				<span className={styles.charCount}>
					{observaciones.length}/{OBS_MAX}
				</span>
			</div>
		</form>
	);
}
