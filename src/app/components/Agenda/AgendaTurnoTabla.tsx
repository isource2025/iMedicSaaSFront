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
			<td>
				<CeldaTriage nivel={row.idClasificacionTriage} />
			</td>
			<td>{badgeEstado}</td>
			<td>
				<CeldaHoras
					horaTurno={row.hora}
					horaAtencion={row.horaAtencion}
					conPaciente={conPaciente}
				/>
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
			<td>{conPaciente && row.edad != null ? `${row.edad} años` : '—'}</td>
			<td>
				<span className={cellStyles.coberturaCol}>
					{conPaciente && row.cobertura ? row.cobertura : '—'}
				</span>
			</td>
			<td>
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
			<td>
				<span className={cellStyles.obsCol}>
					{conPaciente && row.observaciones?.trim()
						? row.observaciones.trim()
						: '—'}
				</span>
			</td>
			<td>{row.sector || '—'}</td>
			<td>
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
			{menuCelda != null ? <td>{menuCelda}</td> : null}
		</tr>
	);
}
