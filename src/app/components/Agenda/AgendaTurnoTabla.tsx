import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import {
	CeldaHoras,
	CeldaPaciente,
	CeldaRacPills,
	CeldaSexoNac,
	CeldaTriage,
	type FilaTurnoAgenda,
} from './AgendaTurnoTablaCeldas';
import cellStyles from './AgendaTurnoTablaCeldas.module.css';

export function AgendaTurnoTablaHead({ conMenu }: { conMenu?: boolean }) {
	return (
		<thead>
			<tr>
				<th>Triage</th>
				<th>Estado</th>
				<th>Horarios</th>
				<th>Paciente</th>
				<th>Edad</th>
				<th>Cobertura</th>
				<th>Sexo / Nac.</th>
				<th>Observaciones</th>
				<th>Sector</th>
				<th>RAC</th>
				{conMenu ? <th style={{ width: 40 }} aria-label='Acciones' /> : null}
			</tr>
		</thead>
	);
}

export function AgendaTurnoTablaRow({
	row,
	libre,
	cancelado,
	badgeEstado,
	menuCelda,
	trClassName,
	onTrClick,
	trStyle,
}: {
	row: FilaTurnoAgenda;
	libre: boolean;
	cancelado: boolean;
	badgeEstado: ReactNode;
	menuCelda?: ReactNode;
	trClassName?: string;
	onTrClick?: (e: MouseEvent<HTMLTableRowElement>) => void;
	trStyle?: CSSProperties;
}) {
	const conPaciente = !libre || cancelado;
	return (
		<tr className={trClassName} onClick={onTrClick} style={trStyle}>
			<td data-label='Triage'>
				<CeldaTriage nivel={row.idClasificacionTriage} />
			</td>
			<td data-label='Estado'>{badgeEstado}</td>
			<td data-label='Horarios'>
				<CeldaHoras
					horaTurno={row.hora}
					horaLlegada={row.horaLlegada}
					horaIngreso={row.horaIngreso}
					horaSalida={row.horaSalida}
					conPaciente={conPaciente}
					cancelado={cancelado}
				/>
			</td>
			<td data-label='Paciente' data-celda='ancha'>
				<CeldaPaciente
					libre={libre}
					cancelado={cancelado}
					idPaciente={row.idPaciente}
					pacienteNombre={row.pacienteNombre}
					numeroDocumento={row.numeroDocumento}
					numeroVisita={row.numeroVisita}
				/>
			</td>
			<td data-label='Edad'>{conPaciente && row.edad != null ? `${row.edad} años` : '—'}</td>
			<td data-label='Cobertura'>
				<span className={cellStyles.coberturaCol}>
					{conPaciente && row.cobertura ? row.cobertura : '—'}
				</span>
			</td>
			<td data-label='Sexo / Nac.'>
				{conPaciente ? (
					<CeldaSexoNac
						sexo={row.sexo}
						fechaNacimiento={row.fechaNacimiento}
						edad={row.edad}
					/>
				) : (
					<span className={cellStyles.muted}>—</span>
				)}
			</td>
			<td data-label='Observaciones' data-celda='ancha'>
				<span className={cellStyles.obsCol}>
					{conPaciente && row.observaciones?.trim()
						? row.observaciones.trim()
						: '—'}
				</span>
			</td>
			<td data-label='Sector'>{row.sector || '—'}</td>
			<td data-label='RAC' data-celda='ancha'>
				{conPaciente ? (
					<CeldaRacPills
						nivel={row.idClasificacionTriage}
						controles={row.racControles}
						medicacion={row.racMedicacion}
					/>
				) : (
					<span className={cellStyles.muted}>—</span>
				)}
			</td>
			{menuCelda != null ? <td data-celda='menu'>{menuCelda}</td> : null}
		</tr>
	);
}
