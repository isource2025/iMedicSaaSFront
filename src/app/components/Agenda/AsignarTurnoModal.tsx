'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { searchPatients } from '@/app/services/patientService';
import AgregarPacienteEnAgenda from '@/app/components/Agenda/AgregarPacienteEnAgenda';
import {
	agendaService,
	TIPO_TURNO_GRILLA,
	TIPO_TURNO_SOBRETURNO,
	type AgendaProfesionalMeta,
	type AgendaSlot,
} from '@/app/services/agendaService';
import { agendaConfigService } from '@/app/services/agendaConfigService';
import { esFechaPasada, toIsoLocal } from '@/app/utils/agendaFecha';
import { horaWallArgentina, fechaCalendarioArgentina } from '@/app/utils/dateUtils';
import { useModalLayer } from '@/app/hooks/useModalLayer';
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
	const mounted = useModalLayer(open);
	const [term, setTerm] = useState('');
	const [results, setResults] = useState<PacienteRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [paciente, setPaciente] = useState<PacienteRow | null>(null);

	const [observaciones, setObservaciones] = useState('');
	const [sectorEdit, setSectorEdit] = useState<string>('');
	const [tipoTurno, setTipoTurno] = useState<number>(TIPO_TURNO_GRILLA);
	const [tiposTurno, setTiposTurno] = useState<{ valor: number; label: string }[]>([]);
	const [especialidades, setEspecialidades] = useState<{ valor: number; descripcion: string }[]>(
		[],
	);

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [fechaSt, setFechaSt] = useState(fecha);
	const [horaSt, setHoraSt] = useState('08:00');

	useEffect(() => {
		if (!open) return;
		setTerm('');
		setResults([]);
		setPaciente(null);
		setObservaciones('');
		setSectorEdit(profesional?.sector || slot?.sector || '');
		setTipoTurno(esSobreturno ? TIPO_TURNO_SOBRETURNO : TIPO_TURNO_GRILLA);
		setError(null);
		if (esSobreturno) {
			setFechaSt(fechaCalendarioArgentina());
			setHoraSt(horaWallArgentina(false));
		} else {
			setFechaSt(fecha);
			setHoraSt(slot?.hora?.replace(/\s*·\s*ST$/i, '') || '08:00');
		}
	}, [open, slot, profesional, esSobreturno, fecha]);

	useEffect(() => {
		if (!open) return;
		let cancel = false;
		agendaConfigService
			.getCatalogos()
			.then((cat) => {
				if (cancel) return;
				const tipos = Object.entries(cat.tipoTurno || {})
					.map(([k, v]) => ({ valor: Number(k), label: String(v) }))
					.filter((t) => Number.isFinite(t.valor))
					.sort((a, b) => a.valor - b.valor);
				setTiposTurno(tipos);
				setEspecialidades(cat.especialidades ?? []);
			})
			.catch(() => {
				if (!cancel) {
					setTiposTurno([
						{ valor: TIPO_TURNO_GRILLA, label: 'Grilla' },
						{ valor: TIPO_TURNO_SOBRETURNO, label: 'Sobreturno' },
					]);
				}
			});
		return () => {
			cancel = true;
		};
	}, [open]);

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

	const horaLabel = esSobreturno ? horaSt : slot?.hora || '—';
	const fechaEnvio = esSobreturno ? fechaSt : fecha;

	const fechaInvalida = esFechaPasada(fechaEnvio);

	const tipoTurnoEnvio = esSobreturno ? TIPO_TURNO_SOBRETURNO : tipoTurno;

	const submit = async () => {
		if (!slot || !paciente || fechaInvalida) return;
		setSubmitting(true);
		setError(null);
		try {
			await agendaService.asignarTurno(matricula, {
				fecha: fechaEnvio,
				hora: esSobreturno ? horaSt : slot.hora.replace(/\s*·\s*ST$/i, ''),
				horaClarion: esSobreturno ? undefined : slot.horaClarion,
				sector: (profesional?.sector || slot?.sector || sectorEdit || '').trim(),
				idPaciente: paciente.IDPaciente,
				observaciones: observaciones.trim() || undefined,
				tipoTurno: tipoTurnoEnvio,
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

	const especialidadLabel = useMemo(() => {
		const val = profesional?.especialidad;
		if (val == null || val === 0) return '—';
		return (
			especialidades.find((e) => e.valor === val)?.descripcion?.trim() || String(val)
		);
	}, [profesional?.especialidad, especialidades]);

	const puedeGuardar = useMemo(
		() => Boolean(slot && paciente && !submitting && !fechaInvalida),
		[slot, paciente, submitting, fechaInvalida],
	);

	if (!open || !mounted) return null;

	const modal = (
		<div className={styles.overlay}>
			<div
				className={styles.modal}
				role='dialog'
				aria-modal='true'
				aria-label={esSobreturno ? 'Agregar sobreturno' : 'Asignar turno'}
			>
				<header className={styles.header}>
					<div>
						<h2>{esSobreturno ? 'Agregar sobreturno' : 'Asignar turno'}</h2>
						<p>
							{fechaEnvio} · <strong>{horaLabel}</strong>
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
						{esSobreturno ? (
							<>
								<div>
									<label>Fecha del sobreturno</label>
									<input
										type='date'
										className={styles.input}
										value={fechaSt}
										onChange={(e) => setFechaSt(e.target.value)}
									/>
								</div>
								<div>
									<label>Hora del sobreturno</label>
									<input
										type='time'
										className={styles.input}
										value={horaSt}
										onChange={(e) => setHoraSt(e.target.value)}
									/>
								</div>
							</>
						) : null}
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
						{!esSobreturno ? (
							<div>
								<label>Tipo de turno</label>
								<select
									className={styles.input}
									value={tipoTurno}
									onChange={(e) => setTipoTurno(Number(e.target.value))}
								>
									{tiposTurno.map((t) => (
										<option key={t.valor} value={t.valor}>
											{t.label}
										</option>
									))}
								</select>
							</div>
						) : (
							<div>
								<label>Tipo de turno</label>
								<input
									type='text'
									className={styles.input}
									value='Sobreturno'
									readOnly
									tabIndex={-1}
								/>
							</div>
						)}
						<div>
							<label>Especialidad del profesional</label>
							<input
								type='text'
								className={styles.input}
								value={especialidadLabel}
								readOnly
								tabIndex={-1}
								title='Código de especialidad del médico titular'
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
						{submitting
							? esSobreturno
								? 'Agregando…'
								: 'Asignando…'
							: esSobreturno
								? 'Agregar sobreturno'
								: 'Asignar turno'}
					</button>
				</footer>
			</div>
		</div>
	);

	return createPortal(modal, document.body);
}
