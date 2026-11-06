'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { MedicacionControl } from '../../../types/medicacionControl';
import {
	actualizarMedicacion,
	type ActualizarMedicacionData,
} from '../../../services/medicacionControlService';
import styles from './EditarMedicacionModal.module.css';

function toDateInput(fecha: string | null | undefined): string {
	if (!fecha) return '';
	const s = String(fecha).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (m) {
		const [, dd, mm, yyyy] = m;
		return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
	}
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return '';
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInput(hora: string | null | undefined): string {
	if (!hora) return '';
	const parts = String(hora).trim().split(':');
	if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
	return '';
}

export type EditarMedicacionForm = {
	fechaControl: string;
	horaControl: string;
	cantidad: string;
	cantidadIndicada: string;
	tipoUnidad: string;
	observaciones: string;
};

interface Props {
	medicacion: MedicacionControl;
	onClose: () => void;
	onSaved?: () => void | Promise<void>;
}

export default function EditarMedicacionModal({ medicacion, onClose, onSaved }: Props) {
	const initial = useMemo<EditarMedicacionForm>(
		() => ({
			fechaControl: toDateInput(medicacion.FechaControl),
			horaControl: toTimeInput(medicacion.HoraControl),
			cantidad: medicacion.Cantidad != null ? String(medicacion.Cantidad) : '',
			cantidadIndicada:
				medicacion.CantidadIndicada != null ? String(medicacion.CantidadIndicada) : '',
			tipoUnidad: medicacion.TipoUnidad || '',
			observaciones: medicacion.Observaciones || '',
		}),
		[medicacion],
	);

	const [form, setForm] = useState<EditarMedicacionForm>(initial);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setForm(initial);
		setError(null);
	}, [initial]);

	const set =
		(k: keyof EditarMedicacionForm) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			setForm((p) => ({ ...p, [k]: e.target.value }));

	const nombreMed =
		medicacion.NombreMedicamento ||
		medicacion.DescripcionMedicamento ||
		(medicacion.Troquel != null ? `Troquel ${medicacion.Troquel}` : 'Medicamento');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.fechaControl || !form.horaControl) {
			setError('Indicá fecha y hora del suministro');
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const payload: ActualizarMedicacionData = {
				fechaControl: form.fechaControl,
				horaControl: form.horaControl,
				cantidad: form.cantidad === '' ? undefined : Number(form.cantidad),
				cantidadIndicada:
					form.cantidadIndicada === '' ? undefined : Number(form.cantidadIndicada),
				tipoUnidad: form.tipoUnidad,
				observaciones: form.observaciones,
			};
			await actualizarMedicacion(medicacion.IDCtrlMedica, payload);
			await onSaved?.();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	return (
		<form id="editar-medicacion-form" onSubmit={handleSubmit} className={styles.form}>
			{error && <div className={styles.errorMsg}>{error}</div>}

			<p className={styles.medName}>{nombreMed}</p>

			<div className={styles.grid2}>
				<div className={styles.field}>
					<label className={styles.label}>
						Fecha <span className={styles.required}>*</span>
					</label>
					<input
						className={styles.input}
						type="date"
						value={form.fechaControl}
						onChange={set('fechaControl')}
						required
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label}>
						Hora <span className={styles.required}>*</span>
					</label>
					<input
						className={styles.input}
						type="time"
						value={form.horaControl}
						onChange={set('horaControl')}
						required
					/>
				</div>
			</div>

			<div className={styles.grid3}>
				<div className={styles.field}>
					<label className={styles.label}>Cantidad aplicada</label>
					<input
						className={styles.input}
						type="number"
						step="any"
						min={0}
						value={form.cantidad}
						onChange={set('cantidad')}
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label}>Cantidad indicada</label>
					<input
						className={styles.input}
						type="number"
						step="any"
						min={0}
						value={form.cantidadIndicada}
						onChange={set('cantidadIndicada')}
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label}>Unidad</label>
					<input
						className={styles.input}
						type="text"
						maxLength={5}
						value={form.tipoUnidad}
						onChange={set('tipoUnidad')}
						placeholder="AMP, ML…"
					/>
				</div>
			</div>

			<div className={styles.field}>
				<label className={styles.label}>Observaciones</label>
				<textarea
					className={styles.textarea}
					rows={3}
					value={form.observaciones}
					onChange={set('observaciones')}
					placeholder="Observaciones del suministro…"
				/>
			</div>

			<div className={styles.footer}>
				<button
					type="button"
					className={styles.btnSecondary}
					onClick={onClose}
					disabled={saving}
				>
					Cancelar
				</button>
				<button type="submit" className={styles.btnPrimary} disabled={saving}>
					{saving ? 'Guardando…' : 'Guardar cambios'}
				</button>
			</div>
		</form>
	);
}
