'use client';

import { useEffect, useMemo, useState } from 'react';
import { searchPatients } from '@/app/services/patientService';
import AgregarPacienteEnAgenda from '@/app/components/Agenda/AgregarPacienteEnAgenda';
import {
	agendaService,
	TIPO_TURNO_GRILLA,
	TIPO_TURNO_SOBRETURNO,
	type AgendaProfesionalMeta,
	type AgendaSlot,
} from '@/app/services/agendaService';
import { esFechaPasada } from '@/app/utils/agendaFecha';
import styles from './AsignarTurnoModal.module.css';

interface PacienteRow {
	IDPaciente: number;
	ApellidoyNombre?: string;
	NumeroDocumento?: number | string | null;
	NumeroHC?: string | null;
	FechaNacimiento?: string | null;
	Cobertura?: string | null;
}

export type ModalAsignarModo = 'asignar' | 'sobreturno';

interface Props {
	open: boolean;
	modo?: ModalAsignarModo;
	matricula: number;
	fecha: string; // ISO YYYY-MM-DD
	slot: AgendaSlot | null;
	profesional?: AgendaProfesionalMeta | null;
	onClose: () => void;
	onAssigned: () => void;
}

export default function AsignarTurnoModal({
	open,
	modo = 'asignar',
	matricula,
	fecha,
	slot,
	profesional,
	onClose,
	onAssigned,
}: Props) {
	const esSobreturno = modo === 'sobreturno';
	const [term, setTerm] = useState('');
	const [results, setResults] = useState<PacienteRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [paciente, setPaciente] = useState<PacienteRow | null>(null);

	const [observaciones, setObservaciones] = useState('');
	const [sectorEdit, setSectorEdit] = useState<string>('');

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTerm('');
		setResults([]);
		setPaciente(null);
		setObservaciones('');
		setSectorEdit(profesional?.sector || slot?.sector || '');
		setError(null);
	}, [open, slot, profesional]);

	useEffect(() => {
		if (!open) return;
		const t = term.trim();
		if (t.length < 2) {
			setResults([]);
			return;
		}
		let cancel = false;
		setLoading(true);
		const handle = setTimeout(async () => {
			try {
				const rows = (await searchPatients(t)) as unknown as PacienteRow[];
				if (!cancel) setResults(rows.slice(0, 30));
			} catch {
				if (!cancel) setResults([]);
			} finally {
				if (!cancel) setLoading(false);
			}
		}, 250);
		return () => {
			cancel = true;
			clearTimeout(handle);
		};
	}, [term, open]);

	const horaLabel = slot?.hora || '—';

	const fechaInvalida = esFechaPasada(fecha);

	const submit = async () => {
		if (!slot || !paciente || fechaInvalida) return;
		setSubmitting(true);
		setError(null);
		try {
			await agendaService.asignarTurno(matricula, {
				fecha,
				hora: slot.hora.replace(/\s*·\s*ST$/i, ''),
				horaClarion: slot.horaClarion,
				sector: (profesional?.sector || slot?.sector || sectorEdit || '').trim(),
				idPaciente: paciente.IDPaciente,
				observaciones: observaciones.trim() || undefined,
				tipoTurno: esSobreturno ? TIPO_TURNO_SOBRETURNO : TIPO_TURNO_GRILLA,
			});
			onAssigned();
			onClose();
		} catch (e: unknown) {
			const err = e as {
				response?: { data?: { mensaje?: string } };
				message?: string;
			};
			setError(
				err?.response?.data?.mensaje || err?.message || 'Error al asignar el turno',
			);
		} finally {
			setSubmitting(false);
		}
	};

	const puedeGuardar = useMemo(
		() => Boolean(slot && paciente && !submitting && !fechaInvalida),
		[slot, paciente, submitting, fechaInvalida],
	);

	if (!open) return null;

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div
				className={styles.modal}
				role='dialog'
				aria-modal='true'
				onClick={(e) => e.stopPropagation()}
			>
				<header className={styles.header}>
					<div>
						<h2>{esSobreturno ? 'Agregar sobreturno' : 'Asignar turno'}</h2>
						<p>
							{fecha} · <strong>{horaLabel}</strong>
							{(profesional?.sector || slot?.sector)
								? ` · Sector ${profesional?.sector || slot?.sector}`
								: ''}
							{profesional?.nombre ? ` · ${profesional.nombre}` : ''}
						</p>
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

				<div className={styles.body}>
					<section className={styles.section}>
						<div className={styles.sectionHeader}>
							<label>Paciente</label>
							<AgregarPacienteEnAgenda
								className={styles.linkBtn}
								stackOnTop
								onCreated={(p) => {
									setPaciente(p);
									setTerm(p.ApellidoyNombre || '');
									setResults([]);
								}}
							/>
						</div>
						<input
							type='text'
							className={styles.input}
							placeholder='Buscar por DNI, nombre o nº historia…'
							value={term}
							onChange={(e) => setTerm(e.target.value)}
							autoFocus
						/>

						{paciente ? (
							<div className={styles.pacienteCard}>
								<div>
									<strong>{paciente.ApellidoyNombre}</strong>
									<div className={styles.pacienteMeta}>
										DNI {paciente.NumeroDocumento ?? '—'} · HC{' '}
										{paciente.NumeroHC || '—'}
										{paciente.Cobertura ? ` · ${paciente.Cobertura}` : ''}
									</div>
								</div>
								<button
									type='button'
									className={styles.linkBtn}
									onClick={() => setPaciente(null)}
								>
									Cambiar
								</button>
							</div>
						) : (
							<div className={styles.results}>
								{loading && <div className={styles.empty}>Buscando…</div>}
								{!loading && term.trim().length >= 2 && results.length === 0 && (
									<div className={styles.empty}>Sin resultados.</div>
								)}
								{!loading &&
									results.map((p) => (
										<button
											key={p.IDPaciente}
											type='button'
											className={styles.resultItem}
											onClick={() => setPaciente(p)}
										>
											<span className={styles.resultName}>
												{p.ApellidoyNombre}
											</span>
											<span className={styles.resultMeta}>
												DNI {p.NumeroDocumento ?? '—'} · HC{' '}
												{p.NumeroHC || '—'}
											</span>
										</button>
									))}
							</div>
						)}
					</section>

					<section className={styles.grid}>
						<div>
							<label>Sector</label>
							<input
								type='text'
								className={styles.input}
								value={sectorEdit}
								maxLength={4}
								readOnly
								title='Sector del horario (IdServicio)'
							/>
						</div>
						<div>
							<label>Tipo de turno</label>
							<input
								type='text'
								className={styles.input}
								value='Reserva (1)'
								readOnly
								title='TipoTurno = 1 — reserva legacy'
							/>
						</div>
						<div>
							<label>Especialidad del profesional</label>
							<input
								type='text'
								className={styles.input}
								value={
									profesional?.especialidad
										? String(profesional.especialidad)
										: '—'
								}
								readOnly
								title='ValorEspecialidad del médico titular (imPersonal)'
							/>
						</div>
					</section>

					<section>
						<label>Observaciones / motivo de consulta</label>
						<textarea
							className={styles.textarea}
							rows={3}
							maxLength={1000}
							value={observaciones}
							onChange={(e) => setObservaciones(e.target.value)}
							placeholder='Ej: dolor lumbar, control postoperatorio…'
						/>
					</section>

					{fechaInvalida && (
						<div className={styles.error}>
							No se pueden asignar turnos en fechas anteriores al día de hoy.
						</div>
					)}
					{error && <div className={styles.error}>{error}</div>}
				</div>

				<footer className={styles.footer}>
					<button type='button' className={styles.btnGhost} onClick={onClose}>
						Cancelar
					</button>
					<button
						type='button'
						className={styles.btnPrimary}
						disabled={!puedeGuardar}
						onClick={submit}
					>
						{submitting ? 'Asignando…' : 'Asignar turno'}
					</button>
				</footer>
			</div>
		</div>
	);
}
