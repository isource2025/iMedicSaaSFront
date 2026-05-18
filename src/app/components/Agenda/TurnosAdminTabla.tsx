'use client';

import type { MouseEvent } from 'react';
import type { TurnoAdminRow } from '@/app/services/turnosAdminService';
import { opcionesMenuTurnoAdmin } from '@/app/components/Agenda/turnoAdminMenuOpciones';
import { CeldaPaciente } from '@/app/components/Agenda/AgendaTurnoTablaCeldas';
import cellStyles from '@/app/components/Agenda/AgendaTurnoTablaCeldas.module.css';
import agendaStyles from '@/app/dashboard/turnos/agenda/agenda.module.css';
import styles from './TurnosAdminTabla.module.css';

function fmtFecha(iso: string | null | undefined): string {
	if (!iso) return '—';
	const [y, m, d] = iso.slice(0, 10).split('-');
	if (!y || !m || !d) return iso;
	return `${d}/${m}/${y}`;
}

function fmtHora(h: string | null | undefined): string {
	if (!h) return '—';
	const [hh, mm] = h.split(':');
	if (!hh) return h;
	return `${hh.padStart(2, '0')}:${mm || '00'}`;
}

function badgeClass(estado: string, esSobreturno?: boolean): string {
	if (estado === 'LIBRE') return `${agendaStyles.badge} ${agendaStyles.badgeLibre}`;
	if (estado === 'CANCELADO') return `${agendaStyles.badge} ${agendaStyles.badgeCancelado}`;
	if (estado === 'ATENDIDO') return `${agendaStyles.badge} ${agendaStyles.badgeAtendido}`;
	if (esSobreturno) return `${agendaStyles.badge} ${agendaStyles.badgeSobreturno}`;
	return `${agendaStyles.badge} ${agendaStyles.badgeOcupado}`;
}

function badgeLabel(estado: string, esSobreturno?: boolean): string {
	if (esSobreturno && estado !== 'LIBRE' && estado !== 'CANCELADO') return 'SOBRETURNO';
	return estado;
}

interface PermisosMenu {
	puedeEditar: boolean;
	puedeEliminar: boolean;
	puedeRac: boolean;
}

interface Props {
	rows: TurnoAdminRow[];
	permisos: PermisosMenu;
	onRowClick: (e: MouseEvent<HTMLTableRowElement>, row: TurnoAdminRow) => void;
}

function HoraCelda({ label, valor }: { label: string; valor: string | null | undefined }) {
	return (
		<div className={styles.horaMini}>
			<span className={cellStyles.horasLbl}>{label}</span>
			<span className={styles.horaCell}>{valor ? fmtHora(valor) : '—'}</span>
		</div>
	);
}

export default function TurnosAdminTabla({ rows, permisos, onRowClick }: Props) {
	return (
		<table
			className={`${agendaStyles.table} ${styles.tableWide} ${agendaStyles.tableEnter}`}
		>
			<thead>
				<tr className={styles.headGroup}>
					<th rowSpan={2}>Día</th>
					<th colSpan={2}>Turno asignado</th>
					<th colSpan={2}>Paciente</th>
					<th colSpan={2}>Profesional</th>
					<th rowSpan={2}>Diagnóstico</th>
					<th rowSpan={2}>Sector</th>
					<th colSpan={3}>Horarios</th>
					<th rowSpan={2}>Estado</th>
					<th rowSpan={2}>Motivo cancelación</th>
					<th rowSpan={2}>Personal atendió</th>
					<th rowSpan={2}>Observaciones</th>
				</tr>
				<tr className={styles.headSub}>
					<th>Fecha</th>
					<th>Hora</th>
					<th>ID</th>
					<th>Apellido y nombre</th>
					<th>Matrícula</th>
					<th>Apellido nombre</th>
					<th>Llegada</th>
					<th>Ingreso</th>
					<th>Salida</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => {
					const libre = row.estado === 'LIBRE';
					const cancelado = row.estado === 'CANCELADO';
					const esSt = row.tipoTurno === 1 || row.tipoTurnoLabel === 'SOBRETURNO';
					const conPaciente = !libre || cancelado;
					const puedeMenu =
						opcionesMenuTurnoAdmin(row, permisos).length > 0;
					const rowClass = libre
						? agendaStyles.rowLibre
						: cancelado
							? agendaStyles.rowCancelado
							: esSt
								? agendaStyles.rowSobreturno
								: agendaStyles.rowOcupado;

					return (
						<tr
							key={row.idTurno}
							className={rowClass}
							onClick={(e) => {
								if (puedeMenu) onRowClick(e, row);
							}}
							style={{ cursor: puedeMenu ? 'pointer' : 'default' }}
						>
							<td className={styles.diaCell}>{row.dia || '—'}</td>
							<td className={styles.fechaCell}>{fmtFecha(row.fecha)}</td>
							<td className={styles.horaCell}>{fmtHora(row.hora)}</td>
							<td>
								{conPaciente && row.idPaciente ? (
									<span className={cellStyles.muted}>{row.idPaciente}</span>
								) : (
									<span className={cellStyles.muted}>—</span>
								)}
							</td>
							<td>
								<CeldaPaciente
									libre={libre}
									cancelado={cancelado}
									idPaciente={row.idPaciente}
									pacienteNombre={row.pacienteNombre}
									numeroDocumento={row.numeroDocumento}
								/>
							</td>
							<td>
								<span className={cellStyles.muted}>
									{row.profesional || '—'}
								</span>
							</td>
							<td>
								<div className={styles.profCol}>
									<span className={styles.profNombre}>
										{row.profesionalNombre || '—'}
									</span>
								</div>
							</td>
							<td>
								<span className={cellStyles.muted}>
									{row.diagnostico || '—'}
								</span>
							</td>
							<td>
								<strong>{row.sector || '—'}</strong>
							</td>
							<td>
								<HoraCelda label='Llegada' valor={row.horallegada} />
							</td>
							<td>
								<HoraCelda label='Ingreso' valor={row.horaIngreso} />
							</td>
							<td>
								{conPaciente && !row.horaSalida && !row.horaAtencion ? (
									<div className={styles.horaMini}>
										<span className={cellStyles.horasLbl}>Salida</span>
										<span className={cellStyles.noAtendido}>No atendido</span>
									</div>
								) : (
									<HoraCelda label='Salida' valor={row.horaSalida} />
								)}
							</td>
							<td>
								<span className={badgeClass(row.estado, esSt)}>
									{badgeLabel(row.estado, esSt)}
								</span>
							</td>
							<td>
								<span className={cellStyles.obsCol}>
									{cancelado && row.motivoCancelacion
										? row.motivoCancelacion
										: '—'}
								</span>
							</td>
							<td>
								<div className={styles.profCol}>
									<span className={styles.profNombre}>
										{row.personalAtendio || '—'}
									</span>
								</div>
							</td>
							<td>
								<span className={cellStyles.obsCol}>
									{row.observaciones?.trim() ? row.observaciones.trim() : '—'}
								</span>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
