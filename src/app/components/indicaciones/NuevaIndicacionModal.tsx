'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './NuevaIndicacionModal.module.css';
import { NuevaIndicacionPayload } from '../../types/indicaciones';

interface IndicacionFormProps {
	onClose: () => void;
	onSave: (data: NuevaIndicacionPayload) => Promise<void> | void;
	defaultNumeroVisita: number | null;
}

const emptyPayload = (numeroVisita: number | null): NuevaIndicacionPayload => ({
	NumeroVisita: numeroVisita,
	NroAdicional: null,
	FechaCarga: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
	HoraCarga: new Date().toTimeString().slice(0, 8), // HH:mm:ss
	OperadorCarga: null,
	ProfesionalAsiste: null,
	FechaCumplido: null,
	HoraCumplido: null,
	FechaProximo: null,
	HoraProximo: null,
	FechaRevision: null,
	HoraRevision: null,
	TipoIndicacion: null,
	Codigo: null,
	Cantidad: null,
	TipoUnidad: null,
	Frecuencia: null,
	Observaciones: null,
	FechaExpiro: null,
	HoraExpiro: null,
	CantidadIndicada: null,
	Orden: null,
	Estado: 'A',
	CantidadPorTurno: null,
	CantidadEntregada: null,
	ParaFechaEntrega: null,
	FormaAdicional: null,
	NroIndicacionAnterior: null,
	IdSector: null,
	AliasMedicamento: null,
	ExcluidoDeEntrega: null,
});

export default function IndicacionForm({
	onClose,
	onSave,
	defaultNumeroVisita,
}: IndicacionFormProps) {
	const [saving, setSaving] = useState(false);
	const initial = useMemo(() => emptyPayload(defaultNumeroVisita), [defaultNumeroVisita]);
	const [form, setForm] = useState<NuevaIndicacionPayload>(initial);

	useEffect(() => {
		setForm(emptyPayload(defaultNumeroVisita));
	}, [defaultNumeroVisita]);

	const set = (field: keyof NuevaIndicacionPayload, value: any) =>
		setForm((prev) => ({ ...prev, [field]: value }));

	const n = (v: string) => (v === '' ? null : Number(v));
	const s = (v: string) => (v === '' ? null : v);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSaving(true);
			await onSave(form);
			onClose();
		} finally {
			setSaving(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className={styles.wrap}>
			{/* FILA 1: Profesional que indica + Fecha/Hora que indica + Solicitado para el día */}

			<div className={styles.rowHeader}>
				<div className={styles.row}>
					<div className={styles.inlineField}>
						<label>Profesional que indica</label>
						<div className={styles.inlineInputs}>
							<input
								type='number'
								className={styles.inputXs}
								placeholder='Código'
								value={form.ProfesionalAsiste ?? ''}
								onChange={(e) => set('ProfesionalAsiste', n(e.target.value))}
							/>
							<div className={styles.badge}>ADMINISTRADOR</div>
						</div>
					</div>
				</div>

				<div className={styles.inlineField}>
					<label>Fecha / Hora que indica</label>
					<div className={styles.inlineInputs}>
						<input
							type='date'
							className={styles.inputSm}
							value={form.FechaCarga ?? ''}
							onChange={(e) => set('FechaCarga', s(e.target.value))}
						/>
						<input
							type='time'
							className={styles.inputSm}
							value={form.HoraCarga ?? ''}
							onChange={(e) => set('HoraCarga', s(e.target.value))}
						/>
					</div>
				</div>

				<div className={styles.inlineFieldRight}>
					<label>Solicitado para el día</label>
					<input
						type='date'
						className={styles.inputSm}
						value={form.ParaFechaEntrega ?? ''}
						onChange={(e) => set('ParaFechaEntrega', s(e.target.value))}
					/>
				</div>
			</div>

			{/* FILA 2: Tipo de indicación / Medicación / Descripción */}
			<div className={styles.rowTmd}>
				<div className={styles.hField}>
					<label className={styles.hLabel}>Tipo de indicación</label>
					<select
						className={styles.select}
						value={form.TipoIndicacion ?? ''}
						onChange={(e) => set('TipoIndicacion', n(e.target.value))}
					>
						<option value=''>Seleccione…</option>
						<option value='1'>Enfermería</option>
						<option value='2'>Medicamento</option>
						<option value='3'>Procedimiento</option>
					</select>
				</div>

				<div className={styles.hField}>
					<label className={styles.hLabel}>Medicación</label>
					<select
						className={styles.select}
						value={form.Codigo ?? ''}
						onChange={(e) => set('Codigo', n(e.target.value))}
					>
						<option value=''>Seleccione…</option>
						{/* opciones reales */}
					</select>
				</div>

				<div className={styles.hField}>
					<label className={styles.hLabel}>Descripción</label>
					<input
						className={styles.input}
						type='text'
						value={form.AliasMedicamento ?? ''}
						onChange={(e) => set('AliasMedicamento', s(e.target.value))}
						disabled
						placeholder='Se completa al elegir medicación'
						aria-disabled='true'
					/>
				</div>
			</div>

			{/* FILA 3: Cantidad + Unidad + Frecuencia + Cant. x turno + Acciones */}
			<div className={styles.rowQty}>
				<div className={styles.qtyGroup}>
					<label>Cantidad</label>
					<input
						type='number'
						step='0.01'
						className={styles.inputNum}
						value={form.Cantidad ?? ''}
						onChange={(e) => set('Cantidad', n(e.target.value))}
					/>
				</div>

				<div className={styles.qtyGroup}>
					<label>Tipo unidad</label>
					<input
						type='text'
						className={styles.inputNum}
						value={form.TipoUnidad ?? ''}
						onChange={(e) => set('TipoUnidad', s(e.target.value))}
					/>
				</div>

				<div className={styles.qtyGroupWide}>
					<label>Frecuencia</label>
					<input
						type='text'
						className={styles.input}
						value={form.Frecuencia ?? ''}
						onChange={(e) => set('Frecuencia', s(e.target.value))}
					/>
				</div>

				<div className={styles.qtyGroup}>
					<label>Cantidad</label>
					<input
						type='number'
						step='0.01'
						className={styles.inputNum}
						value={form.CantidadIndicada ?? ''}
						onChange={(e) => set('CantidadIndicada', n(e.target.value))}
					/>
				</div>

				<div className={styles.actionGroup}>
					<button type='button' className={styles.btnGhost}>
						Agregar
					</button>
					<button type='button' className={styles.btnGhost}>
						Cambiar
					</button>
					<button type='button' className={styles.btnGhostDanger}>
						Borrar
					</button>
				</div>
			</div>

			{/* FILA 4: Tabla (Operación / Medicamento / …) */}
			<div className={styles.tableCard}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Operación</th>
							<th>Medicamento</th>
							<th>Observaciones</th>
							<th>Cantidad</th>
							<th>Tipo unidad</th>
							<th>Frecuencia</th>
						</tr>
					</thead>
					<tbody>
						{/* Renderiza items agregados (si los manejas en tu estado) */}
						<tr className={styles.emptyRow}>
							<td colSpan={6}>Sin ítems agregados</td>
						</tr>
					</tbody>
				</table>
			</div>

			{/* FILA 5: Observaciones */}
			<div className={styles.row}>
				<div className={styles.fieldFull}>
					<label>Observaciones</label>
					<textarea
						className={styles.textarea}
						value={form.Observaciones ?? ''}
						onChange={(e) => set('Observaciones', s(e.target.value))}
					/>
				</div>
			</div>

			{/* FILA 6: Última / Próxima administración */}
			<div className={styles.rowCols3}>
				<div className={styles.inlineField}>
					<label>Última administración</label>
					<div className={styles.inlineInputs}>
						<input
							type='date'
							className={styles.inputSm}
							value={form.FechaCumplido ?? ''}
							onChange={(e) => set('FechaCumplido', s(e.target.value))}
						/>
						<input
							type='time'
							className={styles.inputSm}
							value={form.HoraCumplido ?? ''}
							onChange={(e) => set('HoraCumplido', s(e.target.value))}
						/>
					</div>
				</div>

				<div className={styles.inlineField}>
					<label>Próxima administración</label>
					<div className={styles.inlineInputs}>
						<input
							type='date'
							className={styles.inputSm}
							value={form.FechaProximo ?? ''}
							onChange={(e) => set('FechaProximo', s(e.target.value))}
						/>
						<input
							type='time'
							className={styles.inputSm}
							value={form.HoraProximo ?? ''}
							onChange={(e) => set('HoraProximo', s(e.target.value))}
						/>
					</div>
				</div>

				<div className={styles.inlineField}>
					<label>Estado</label>
					<select
						className={styles.select}
						value={form.Estado ?? ''}
						onChange={(e) => set('Estado', s(e.target.value))}
					>
						<option value=''>(sin estado)</option>
						<option value='A'>Activo</option>
						<option value='C'>Cumplido</option>
						<option value='P'>Pendiente</option>
						<option value='S'>Suspendido</option>
					</select>
				</div>
			</div>
		</form>
	);
}
