'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './NuevaIndicacionModal.module.css';
import {
	NuevaIndicacionPayload,
	OpcionFormulario,
	FormularioDatosResponse,
} from '../../types/indicaciones';
import { indicacionesService } from '../../services/indicacionesService';
import LoadingSelect from '../Patients/AddPatient/LoadingSelect';

interface NuevaIndicacionModalProps {
	open: boolean;
	onClose: () => void;
	onSave: (data: NuevaIndicacionPayload) => Promise<void> | void;
	defaultNumeroVisita: number | null;
	patientName?: string;
	patientLocation?: string;
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

export default function NuevaIndicacionModal({
	open,
	onClose,
	onSave,
	defaultNumeroVisita,
	patientName,
	patientLocation,
}: NuevaIndicacionModalProps) {
	const [saving, setSaving] = useState(false);
	const initial = useMemo(() => emptyPayload(defaultNumeroVisita), [defaultNumeroVisita]);
	const [form, setForm] = useState<NuevaIndicacionPayload>(initial);

	// Estados para campos del formulario simplificado
	const [tipoIndicacion, setTipoIndicacion] = useState<string>('');
	const [profesional, setProfesional] = useState<string>('');
	const [medicamento, setMedicamento] = useState<string>('');
	const [cantidad, setCantidad] = useState<string>('');
	const [frecuencia, setFrecuencia] = useState<string>('');
	const [observaciones, setObservaciones] = useState<string>('');
	const [fechaAplicacion, setFechaAplicacion] = useState<string>('');

	// Estados para datos del formulario desde el backend
	const [formularioDatos, setFormularioDatos] = useState<FormularioDatosResponse | null>(
		null,
	);
	const [loadingDatos, setLoadingDatos] = useState(false);

	// Cargar datos del formulario al abrir el modal
	useEffect(() => {
		const cargarDatos = async () => {
			if (!open) return;
			setLoadingDatos(true);
			try {
				const datos = await indicacionesService.getFormularioDatos();
				setFormularioDatos(datos);
			} catch (error) {
				console.error('Error al cargar datos del formulario:', error);
			} finally {
				setLoadingDatos(false);
			}
		};
		cargarDatos();
	}, [open]);

	// Calcular cantidad en 24 horas
	const cantidadEn24hs = useMemo(() => {
		const cant = parseFloat(cantidad);
		const frec = parseFloat(frecuencia);
		if (isNaN(cant) || isNaN(frec) || frec === 0) return '';
		return ((24 / frec) * cant).toFixed(2);
	}, [cantidad, frecuencia]);

	useEffect(() => {
		if (open) {
			setForm(emptyPayload(defaultNumeroVisita));
			setTipoIndicacion('');
			setProfesional('');
			setMedicamento('');
			setCantidad('');
			setFrecuencia('');
			setObservaciones('');
			setFechaAplicacion('');
		}
	}, [open, defaultNumeroVisita]);

	if (!open) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSaving(true);

			// Construir el payload con los datos del formulario simplificado
			const payload: NuevaIndicacionPayload = {
				...form,
				TipoIndicacion: tipoIndicacion ? Number(tipoIndicacion) : null,
				ProfesionalAsiste: profesional ? Number(profesional) : null,
				Codigo: medicamento ? Number(medicamento) : null,
				Cantidad: cantidad ? parseFloat(cantidad) : null,
				Frecuencia: frecuencia || null,
				Observaciones: observaciones || null,
				FechaProximo: fechaAplicacion || null,
			};

			await onSave(payload);
			onClose();
		} finally {
			setSaving(false);
		}
	};

	// Determinar qué opciones mostrar según el tipo de indicación
	const opcionesPorTipo = useMemo(() => {
		if (!tipoIndicacion || !formularioDatos) return [];

		switch (tipoIndicacion) {
			case 'M': // Medicamento
				return formularioDatos.vademecum || [];
			case 'D': // Dieta
				return formularioDatos.tiposDieta || [];
			case 'A': // Alimentación (usar controles asistenciales)
				return formularioDatos.controlesAsistenciales || [];
			case 'C': // Cuidados (usar tipos de controles)
				return formularioDatos.tiposControles || [];
			default:
				return [];
		}
	}, [tipoIndicacion, formularioDatos]);

	const mostrarMedicamentos = tipoIndicacion && opcionesPorTipo.length > 0;

	return (
		<div className={styles.backdrop}>
			<div className={styles.modal}>
				<div className={styles.header}>
					<div className={styles.title}>Nueva Indicación</div>
					<button onClick={onClose} className={styles.closeBtn} aria-label='Cerrar'>
						×
					</button>
				</div>

				<form onSubmit={handleSubmit} className={styles.content}>
					{/* Información del paciente */}
					{(patientName || patientLocation || defaultNumeroVisita) && (
						<div className={styles.patientInfo}>
							{patientName && (
								<div className={styles.patientName}>{patientName}</div>
							)}
							<div className={styles.patientDetails}>
								{defaultNumeroVisita && (
									<span>
										Nro Visita: <strong>{defaultNumeroVisita}</strong>
									</span>
								)}
								{patientLocation && (
									<span>
										Ubicación: <strong>{patientLocation}</strong>
									</span>
								)}
							</div>
						</div>
					)}

					<div className={styles.formGrid}>
						{/* COLUMNA 1: Fecha Solicitado */}
						<div className={styles.field}>
							<label className={styles.label}>Fecha Solicitado *</label>
							<input
								className={styles.input}
								type='date'
								value={form.FechaCarga ?? ''}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										FechaCarga: e.target.value || null,
									}))
								}
								required
							/>
						</div>

						{/* COLUMNA 2: Profesional */}
						<div className={styles.fieldSelect}>
							<LoadingSelect
								label='Profesional *'
								name='profesional'
								value={profesional}
								onChange={(val: string | number) =>
									setProfesional(String(val))
								}
								isLoading={loadingDatos}
								options={[]} // TODO: Agregar endpoint para profesionales
							/>
						</div>

						{/* COLUMNA 1: Hora Solicitado */}
						<div className={styles.field}>
							<label className={styles.label}>Hora Solicitado *</label>
							<input
								className={styles.input}
								type='time'
								value={form.HoraCarga ?? ''}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										HoraCarga: e.target.value || null,
									}))
								}
								required
							/>
						</div>

						{/* COLUMNA 2: Tipo de Indicación */}
						<div className={styles.fieldSelect}>
							<LoadingSelect
								label='Tipo de Indicación *'
								name='tipoIndicacion'
								value={tipoIndicacion}
								onChange={(val) => {
									setTipoIndicacion(String(val));
									setMedicamento(''); // Limpiar medicamento al cambiar tipo
								}}
								isLoading={loadingDatos}
								options={formularioDatos?.tiposIndicacion || []}
							/>
						</div>

						{/* Medicamento/Ítem (condicional según tipo) */}
						{mostrarMedicamentos && (
							<div
								className={styles.fieldSelect}
								style={{ gridColumn: '1 / -1' }}
							>
								<LoadingSelect
									label={`${
										tipoIndicacion === 'M'
											? 'Medicamento'
											: tipoIndicacion === 'A'
											? 'Alimento'
											: tipoIndicacion === 'D'
											? 'Dieta'
											: 'Cuidado'
									} *`}
									name='medicamento'
									value={medicamento}
									onChange={(val: string | number) =>
										setMedicamento(String(val))
									}
									isLoading={loadingDatos}
									options={opcionesPorTipo}
								/>
							</div>
						)}

						{/* Cantidad */}
						<div className={styles.field}>
							<label className={styles.label}>Cantidad *</label>
							<input
								className={styles.input}
								type='number'
								step='0.01'
								min='0'
								value={cantidad}
								onChange={(e) => setCantidad(e.target.value)}
								placeholder='Ej: 1, 2.5'
								required
							/>
						</div>

						{/* Frecuencia */}
						<div className={styles.fieldSelect}>
							<LoadingSelect
								label='Frecuencia (horas) *'
								name='frecuencia'
								value={frecuencia}
								onChange={(val) => setFrecuencia(String(val))}
								isLoading={loadingDatos}
								options={formularioDatos?.frecuenciasAdmin || []}
							/>
						</div>

						{/* Fecha de Aplicación */}
						<div className={styles.field}>
							<label className={styles.label}>Fecha de Aplicación *</label>
							<input
								className={styles.input}
								type='date'
								value={fechaAplicacion}
								onChange={(e) => setFechaAplicacion(e.target.value)}
								required
							/>
						</div>

						{/* Cantidad en 24hs (calculado automáticamente) */}
						<div className={styles.field}>
							<label className={styles.label}>Cantidad en 24hs</label>
							<input
								className={`${styles.input} ${styles.inputReadonly}`}
								type='text'
								value={cantidadEn24hs}
								readOnly
								placeholder='Se calcula automáticamente'
							/>
							<small className={styles.helpText}>
								Calculado: (24 / frecuencia) × cantidad
							</small>
						</div>

						{/* Observaciones */}
						<div className={styles.field} style={{ gridColumn: '1 / -1' }}>
							<label className={styles.label}>Observaciones</label>
							<textarea
								className={styles.textarea}
								value={observaciones}
								onChange={(e) => setObservaciones(e.target.value)}
								rows={4}
								placeholder='Ingrese observaciones adicionales...'
							/>
						</div>
					</div>

					<div className={styles.footer}>
						<button
							type='button'
							className={`${styles.btn} ${styles.btnCancel}`}
							onClick={onClose}
							disabled={saving}
						>
							Cancelar
						</button>
						<button
							type='submit'
							className={`${styles.btn} ${styles.btnPrimary}`}
							disabled={saving}
						>
							{saving ? 'Guardando...' : 'Guardar Indicación'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
