'use client';

import { useEffect, useState } from 'react';
import { searchPatients } from '@/app/services/patientService';
import AgregarPacienteEnAgenda from '@/app/components/Agenda/AgregarPacienteEnAgenda';
import { agendaService, type TurnoAsignado } from '@/app/services/agendaService';
import AgendaEmptyState from '@/app/components/Agenda/AgendaEmptyState';
import styles from './AgendaPacienteBusqueda.module.css';

interface PacienteRow {
	IDPaciente: number;
	ApellidoyNombre?: string;
	NumeroDocumento?: number | string | null;
	NumeroHC?: string | null;
}

function badgeEstado(estado: string, esSobreturno?: boolean): string {
	if (estado === 'CANCELADO') return `${styles.badge} ${styles.badgeCancelado}`;
	if (estado === 'ATENDIDO') return `${styles.badge} ${styles.badgeAtendido}`;
	if (esSobreturno) return `${styles.badge} ${styles.badgeSobreturno}`;
	if (estado === 'LIBRE') return `${styles.badge} ${styles.badgeLibre}`;
	return `${styles.badge} ${styles.badgeOcupado}`;
}

function formatFecha(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	if (!y || !m || !d) return iso;
	return new Date(y, m - 1, d)
		.toLocaleDateString('es-AR', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
		.replace(/^\w/, (c) => c.toUpperCase());
}

export default function AgendaPacienteBusqueda() {
	const [term, setTerm] = useState('');
	const [results, setResults] = useState<PacienteRow[]>([]);
	const [loadingSearch, setLoadingSearch] = useState(false);
	const [paciente, setPaciente] = useState<PacienteRow | null>(null);

	const [turnos, setTurnos] = useState<TurnoAsignado[]>([]);
	const [loadingTurnos, setLoadingTurnos] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const t = term.trim();
		if (t.length < 2) {
			setResults([]);
			return;
		}
		let cancel = false;
		setLoadingSearch(true);
		const handle = setTimeout(async () => {
			try {
				const rows = (await searchPatients(t)) as unknown as PacienteRow[];
				if (!cancel) setResults(rows.slice(0, 30));
			} catch {
				if (!cancel) setResults([]);
			} finally {
				if (!cancel) setLoadingSearch(false);
			}
		}, 250);
		return () => {
			cancel = true;
			clearTimeout(handle);
		};
	}, [term]);

	useEffect(() => {
		if (!paciente) {
			setTurnos([]);
			setError(null);
			return;
		}
		let cancel = false;
		setLoadingTurnos(true);
		setError(null);
		agendaService
			.getTurnosPorPaciente(paciente.IDPaciente)
			.then((rows) => {
				if (!cancel) setTurnos(rows);
			})
			.catch((e) => {
				if (!cancel) {
					setTurnos([]);
					setError(
						e?.response?.data?.mensaje || e?.message || 'Error al cargar turnos del paciente',
					);
				}
			})
			.finally(() => {
				if (!cancel) setLoadingTurnos(false);
			});
		return () => {
			cancel = true;
		};
	}, [paciente]);

	const limpiarPaciente = () => {
		setPaciente(null);
		setTerm('');
		setResults([]);
	};

	return (
		<section className={styles.wrap}>
			<div className={styles.header}>
				<label htmlFor='buscar-paciente-agenda'>Buscar turnos por paciente</label>
				<AgregarPacienteEnAgenda
					className={styles.linkBtn}
					onCreated={(p) => {
						setPaciente(p);
						setTerm(p.ApellidoyNombre || '');
						setResults([]);
					}}
				/>
			</div>
			<input
				id='buscar-paciente-agenda'
				type='text'
				className={styles.input}
				placeholder='DNI, nombre o nº de historia clínica…'
				value={term}
				onChange={(e) => setTerm(e.target.value)}
				disabled={Boolean(paciente)}
			/>

			{paciente ? (
				<div className={styles.pacienteCard}>
					<div>
						<strong>{paciente.ApellidoyNombre}</strong>
						<div className={styles.pacienteMeta}>
							DNI {paciente.NumeroDocumento ?? '—'}
							{paciente.NumeroHC ? ` · HC ${paciente.NumeroHC}` : ''}
						</div>
					</div>
					<button type='button' className={styles.linkBtn} onClick={limpiarPaciente}>
						Cambiar paciente
					</button>
				</div>
			) : (
				<div className={styles.results}>
					{loadingSearch && <div className={styles.empty}>Buscando…</div>}
					{!loadingSearch && term.trim().length >= 2 && results.length === 0 && (
						<div className={styles.empty}>Sin resultados.</div>
					)}
					{!loadingSearch &&
						results.map((p) => (
							<button
								key={p.IDPaciente}
								type='button'
								className={styles.resultItem}
								onClick={() => {
									setPaciente(p);
									setTerm(p.ApellidoyNombre || '');
									setResults([]);
								}}
							>
								<span className={styles.resultName}>{p.ApellidoyNombre}</span>
								<span className={styles.resultMeta}>
									DNI {p.NumeroDocumento ?? '—'}
									{p.NumeroHC ? ` · HC ${p.NumeroHC}` : ''}
								</span>
							</button>
						))}
				</div>
			)}

			{paciente && (
				<div
					className={`${styles.tableWrap} ${!loadingTurnos && turnos.length > 0 ? styles.tableWrapEnter : ''}`}
				>
					<header className={styles.tableHeader}>
						<span>
							Turnos de {paciente.ApellidoyNombre}
							{turnos.length > 0 && (
								<span className={styles.countBadge}>{turnos.length}</span>
							)}
						</span>
					</header>

					{error && <div className={styles.error}>{error}</div>}

					{loadingTurnos ? (
						<div className={styles.loading}>
							<span className={styles.spinner} aria-hidden /> Cargando turnos…
						</div>
					) : turnos.length === 0 && !error ? (
						<AgendaEmptyState
							icon='🔍'
							title='Sin turnos registrados'
							description='Este paciente no tiene turnos asignados en el sistema.'
						/>
					) : turnos.length > 0 ? (
						<div className={styles.tableScroll}>
							<table className={`${styles.table} ${styles.tableEnter}`}>
								<thead>
									<tr>
										<th>Fecha</th>
										<th>Hora</th>
										<th>Profesional</th>
										<th>Sector</th>
										<th>Observaciones</th>
										<th>Estado</th>
									</tr>
								</thead>
								<tbody>
									{turnos.map((t) => (
										<tr key={t.idTurno}>
											<td>{formatFecha(t.fecha)}</td>
											<td>{t.hora ?? '—'}</td>
											<td>
												{t.profesionalNombre ||
													(t.profesional ? `Mat. ${t.profesional}` : '—')}
											</td>
											<td>{t.sector || '—'}</td>
											<td>{t.observaciones || '—'}</td>
											<td>
												<span
													className={badgeEstado(
														t.estado,
														t.esSobreturno,
													)}
												>
													{t.estado}
													{t.esSobreturno ? ' · ST' : ''}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}
				</div>
			)}
		</section>
	);
}
