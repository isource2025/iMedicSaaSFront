'use client';

import tStyles from './MovimientosSection.module.css';
import {
	clasificarEstadoMovimiento,
	diagnosticoTexto,
	disposicionTexto,
	etiquetaCama,
	etiquetaSector,
	fechaHoraEgreso,
	fechaHoraIngreso,
	nombreOperador,
	ordenarMovimientos,
	type MovimientoEstadoUi,
	type MovimientoRowLike,
} from './movimientosDisplay';

type Props = {
	movimientos: MovimientoRowLike[];
	dispCatalogo?: Map<number, string>;
	compact?: boolean;
};

const BADGE_CLASS: Record<MovimientoEstadoUi, string> = {
	Actual: tStyles.badgeActual,
	Traslado: tStyles.badgeTraslado,
	Internado: tStyles.badgeInternado,
	Egreso: tStyles.badgeEgreso,
};

const ROW_CLASS: Record<MovimientoEstadoUi, string | undefined> = {
	Actual: tStyles.rowActual,
	Traslado: undefined,
	Internado: undefined,
	Egreso: tStyles.rowEgreso,
};

export default function MovimientosTimelineTable({ movimientos, dispCatalogo, compact }: Props) {
	const rows = ordenarMovimientos(movimientos);
	const catalogo = dispCatalogo || new Map<number, string>();

	return (
		<div className={`${tStyles.tableWrap} ${compact ? tStyles.tableWrapCompact : ''}`.trim()}>
			<table className={tStyles.table}>
				<thead>
					<tr>
						<th>Estado</th>
						<th>Cama</th>
						<th>Sector</th>
						<th>Fecha/Hora Ingreso</th>
						<th>Fecha/Hora Egreso</th>
						<th>Diagnóstico</th>
						<th>Operador</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((m, idx) => {
						const estado = clasificarEstadoMovimiento(m, idx, rows);
						const disp = disposicionTexto(m, catalogo);
						const diag = diagnosticoTexto(m);
						return (
							<tr key={`${fechaHoraIngreso(m)}-${etiquetaCama(m)}-${idx}`} className={ROW_CLASS[estado]}>
								<td>
									<span className={`${tStyles.badgeEstado} ${BADGE_CLASS[estado]}`}>{estado}</span>
									{estado === 'Egreso' && disp !== '—' ? (
										<span className={tStyles.estadoHint}>{disp}</span>
									) : null}
								</td>
								<td className={tStyles.cellCama}>{etiquetaCama(m)}</td>
								<td>{etiquetaSector(m)}</td>
								<td className={tStyles.cellFecha}>{fechaHoraIngreso(m)}</td>
								<td className={tStyles.cellFecha}>{fechaHoraEgreso(m)}</td>
								<td className={tStyles.cellDiag}>{diag}</td>
								<td className={tStyles.cellOperador}>{nombreOperador(m)}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
