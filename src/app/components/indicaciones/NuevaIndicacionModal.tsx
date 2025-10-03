'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './NuevaIndicacionModal.module.css';
import { FormularioDatosResponse, NuevaIndicacionPayload } from '../../types/indicaciones';
import { indicacionesService } from '../../services/indicacionesService';
import CustomSelect from '../Patients/AddPatient/LoadingSelect';

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
	Medicaion: null,
});

export default function IndicacionForm({
	onClose,
	onSave,
	defaultNumeroVisita,
}: IndicacionFormProps) {
	const [saving, setSaving] = useState(false);
	const initial = useMemo(() => emptyPayload(defaultNumeroVisita), [defaultNumeroVisita]);
	const [form, setForm] = useState<NuevaIndicacionPayload>(initial);
	const [dataLoading, setDataLoading] = useState(false);
	const [dataForm, setDataForm] = useState<FormularioDatosResponse | null>(null);

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

	useEffect(() => {
		(async () => {
			setDataLoading(true);
			try {
				const data = await indicacionesService.getFormularioDatos();

				if (data === null) {
					return;
				}
				setDataForm(data);
			} catch (err) {
				console.error(err);
			} finally {
				setDataLoading(false);
			}
		})();
	}, []);
	const tipoIndicacion = useMemo(() => {
		if (!dataForm || form.TipoIndicacion == null) return undefined;
		return dataForm.tiposIndicacion.find(
			(t) => Number(t.Valor) === Number(form.TipoIndicacion),
		)?.Tipo as 'M' | 'D' | 'C' | 'A' | undefined;
	}, [dataForm, form.TipoIndicacion]);

	const medicaCionData = useMemo(() => {
		if (!dataForm || !tipoIndicacion) return [];
		switch (tipoIndicacion) {
			case 'M':
				return dataForm.vademecum.map((v) => ({
					value: Number(v.Valor),
					label: v.Nombre,
				}));
			case 'D':
				return dataForm.tiposDieta.map((d) => ({
					value: Number(d.Valor),
					label: d.Descripcion,
				}));
			case 'C':
				return dataForm.tiposControles.map((c) => ({
					value: Number(c.Valor),
					label: c.Descripcion,
				}));
			case 'A':
				return dataForm.controlesAsistenciales.map((a) => ({
					value: Number(a.Valor),
					label: a.Descripcion,
				}));
			default:
				return [];
		}
	}, [dataForm, tipoIndicacion]);

	useEffect(() => {
		set('Medicaion', null);
		set('AliasMedicamento', null);
	}, [tipoIndicacion]);

	useEffect(() => {
		if (!dataForm || form.Medicaion == null || !tipoIndicacion) {
			set('AliasMedicamento', null);
			return;
		}

		const id = Number(form.Medicaion);
		let desc: string | null = null;

		if (tipoIndicacion === 'M') {
			const found = dataForm.vademecum.find((v) => Number(v.Valor) === id);
			// Usa descripción si existe; si no, como fallback el nombre
			desc = found ? found.Descripcion?.trim() || found.Nombre : null;
		} else if (tipoIndicacion === 'D') {
			const found = dataForm.tiposDieta.find((d) => Number(d.Valor) === id);
			desc = found?.Descripcion ?? null;
		} else if (tipoIndicacion === 'C') {
			const found = dataForm.tiposControles.find((c) => Number(c.Valor) === id);
			desc = found?.Descripcion ?? null;
		} else if (tipoIndicacion === 'A') {
			const found = dataForm.controlesAsistenciales.find((a) => Number(a.Valor) === id);
			desc = found?.Descripcion ?? null;
		}

		set('AliasMedicamento', desc);
	}, [dataForm, form.Medicaion, tipoIndicacion]);

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
					<label htmlFor='TipoIndicacion'>Tipo de Indicación</label>
					<CustomSelect
						label=''
						name='TipoIndicacion'
						isLoading={dataLoading}
						onChange={(val) => set('TipoIndicacion', Number(val))}
						value={form.TipoIndicacion || ''}
						tabIndex={5}
						options={
							dataForm?.tiposIndicacion.map((item) => {
								return { value: Number(item.Valor), label: item.Descripcion };
							}) || []
						}
					/>
				</div>

				<div className={styles.hField}>
					<label className={styles.hLabel}>Medicación</label>
					<CustomSelect
						label=''
						name='Medicaion'
						isLoading={dataLoading || !tipoIndicacion}
						value={form.Medicaion ?? ''}
						onChange={(val) => set('Medicaion', Number(val))}
						options={medicaCionData}
						tabIndex={6}
					/>
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
						tabIndex={7}
					/>
				</div>

				<div className={styles.qtyGroup}>
					<label>Tipo unidad</label>
					<CustomSelect
						label=''
						name='TipoUnidad'
						isLoading={dataLoading}
						onChange={(val) => set('TipoUnidad', val)}
						options={
							dataForm?.unidadesMedida.map((item) => {
								return {
									value: item.Valor,
									label: item.Descripcion,
								};
							}) || []
						}
						value={form.TipoUnidad || ''}
						tabIndex={8}
					/>
				</div>

				<div className={styles.qtyGroupWide}>
					<label>Frecuencia</label>
					<CustomSelect
						label=''
						name='Frecuencia'
						isLoading={dataLoading}
						onChange={(val) => set('Frecuencia', val)}
						value={form.Frecuencia || ''}
						options={
							dataForm?.frecuenciasAdmin.map((item) => {
								return {
									value: item.Valor,
									label: item.Valor,
								};
							}) || []
						}
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
