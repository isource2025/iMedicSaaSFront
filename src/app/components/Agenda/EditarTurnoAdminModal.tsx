'use client';

import { useEffect, useMemo, useState } from 'react';
import { searchPatients } from '@/app/services/patientService';
import { agendaService } from '@/app/services/agendaService';
import type { TurnoAdminRow } from '@/app/services/turnosAdminService';
import AgregarPacienteEnAgenda from '@/app/components/Agenda/AgregarPacienteEnAgenda';
import styles from './AsignarTurnoModal.module.css';

interface PacienteRow {
	IDPaciente: number;
	ApellidoyNombre?: string;
	NumeroDocumento?: number | string | null;
	NumeroHC?: string | null;
}

interface Props {
	open: boolean;
	turno: TurnoAdminRow | null;
	onClose: () => void;
	onSaved: () => void;
}

export default function EditarTurnoAdminModal({ open, turno, onClose, onSaved }: Props) {
	const [term, setTerm] = useState('');
	const [results, setResults] = useState<PacienteRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [paciente, setPaciente] = useState<PacienteRow | null>(null);
	const [observaciones, setObservaciones] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const esReasignar = turno?.estado === 'CANCELADO' || !turno?.idPaciente;

	useEffect(() => {
		if (!open || !turno) return;
		setTerm('');
		setResults([]);
		setObservaciones(turno.observaciones || '');
		setError(null);
		if (turno.idPaciente) {
			setPaciente({
				IDPaciente: turno.idPaciente,
				ApellidoyNombre: turno.pacienteNombre || undefined,
				NumeroDocumento: turno.numeroDocumento,
			});
		} else {
			setPaciente(null);
		}
	}, [open, turno]);

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

	const puedeGuardar = useMemo(
		() => Boolean(turno && paciente && !submitting),
		[turno, paciente, submitting],
	);

	const submit = async () => {
		if (!turno || !paciente || !turno.profesional) return;
		setSubmitting(true);
		setError(null);
		try {
			await agendaService.actualizarTurno(turno.profesional, turno.idTurno, {
				idPaciente: paciente.IDPaciente,
				observaciones: observaciones.trim(),
			});
			onSaved();
			onClose();
		} catch (e: unknown) {
			const err = e as {
				response?: { data?: { mensaje?: string } };
				message?: string;
			};
			setError(
				err?.response?.data?.mensaje || err?.message || 'Error al actualizar el turno',
			);
		} finally {
			setSubmitting(false);
		}
	};

	if (!open || !turno) return null;

	return (
		<div className={styles.overlay} onClick={onClose} style={{ zIndex: 1050 }}>
			<div
				className={styles.modal}
				role='dialog'
				aria-modal='true'
				onClick={(e) => e.stopPropagation()}
			>
				<header className={styles.header}>
					<div>
						<h2>{esReasignar ? 'Asignar / reasignar paciente' : 'Editar turno'}</h2>
						<p>
							Turno #{turno.idTurno} · {turno.fecha ?? '—'} · <strong>{turno.hora}</strong>
							{turno.sector ? ` · ${turno.sector}` : ''}
							{turno.profesionalNombre ? ` · ${turno.profesionalNombre}` : ''}
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
						/>
						{paciente ? (
							<div className={styles.pacienteCard}>
								<div>
									<strong>{paciente.ApellidoyNombre}</strong>
									<div className={styles.pacienteMeta}>
										DNI {paciente.NumeroDocumento ?? '—'}
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
												DNI {p.NumeroDocumento ?? '—'}
											</span>
										</button>
									))}
							</div>
						)}
					</section>

					<section>
						<label>Observaciones / motivo de consulta</label>
						<textarea
							className={styles.textarea}
							rows={3}
							maxLength={1000}
							value={observaciones}
							onChange={(e) => setObservaciones(e.target.value)}
						/>
					</section>

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
						{submitting ? 'Guardando…' : 'Guardar'}
					</button>
				</footer>
			</div>
		</div>
	);
}
