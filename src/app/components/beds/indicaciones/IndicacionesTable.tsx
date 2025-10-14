'use client';
import styles from './IndicacionesTable.module.css';
import EmptyState from '../shared/EmptyState';

export type IndicacionRow = {
	id: string;
	cantidad?: string | number;
	descripcion?: string;
	profesional?: string;
	frecuencia?: string;
	observaciones?: string;
	proximo?: string;
	anterior?: string;
	vigenteDesde?: string;
	nro?: string | number;
	idSector?: string;
	medicamento?: string;
};

type Props = {
	rows: IndicacionRow[];
	onSelectRow?: (id: string) => void;
	selectedId?: string | null;
	/** Alto máximo disponible del contenedor (opcional). Por defecto llena el parent. */
	maxHeight?: number | string;
};

export default function IndicacionesTable({ rows, onSelectRow, selectedId }: Props) {
	const hasRows = rows && rows.length > 0;

	return (
		<div className={styles.tableWrap}>
			<div className={styles.scrollArea}>
				<table className={styles.table} role='grid'>
					<thead className={styles.thead}>
						<tr>
							<th className={styles.colCant}>Cantidad</th>
							<th className={styles.colInd}>
								Indicación
								<br />
								<span>Descripción · Profesional que Indica</span>
							</th>
							<th className={styles.colFreq}>
								Frecuencia
								<br />
								<span>Observaciones</span>
							</th>
							<th className={styles.colProx}>
								Próximo · Anterior
								<br />
								<span>Vigente desde</span>
							</th>
							<th className={styles.colNro}>Nro Indicación</th>
							<th className={styles.colSector}>Id Sector</th>
							<th className={styles.colMed}>Medicamento</th>
						</tr>
					</thead>

					<tbody className={styles.tbody}>
						{hasRows
							? rows.map((r) => (
									<tr
										key={r.id}
										className={[
											styles.row,
											selectedId === r.id ? styles.activeRow : '',
										].join(' ')}
										onClick={() => onSelectRow?.(r.id)}
									>
										<td className={styles.cellTight}>
											<div className={styles.cantidad}>
												{r.cantidad ?? ''}
											</div>
										</td>

										<td>
											<div className={styles.desc}>
												<div className={styles.primary}>
													{r.descripcion ?? '-'}
												</div>
												<div className={styles.sub}>
													{r.profesional ?? ''}
												</div>
											</div>
										</td>

										<td>
											<div className={styles.primary}>
												{r.frecuencia ?? '-'}
											</div>
											<div className={styles.sub}>
												{r.observaciones ?? ''}
											</div>
										</td>

										<td>
											<div className={styles.primary}>
												{[r.proximo, r.anterior]
													.filter(Boolean)
													.join(' · ') || '-'}
											</div>
											<div className={styles.sub}>
												{r.vigenteDesde ?? ''}
											</div>
										</td>

										<td className={styles.cellNum}>{r.nro ?? ''}</td>
										<td className={styles.cellMono}>{r.idSector ?? ''}</td>
										<td>{r.medicamento ?? ''}</td>
									</tr>
							  ))
							: null}
					</tbody>
				</table>

				{!hasRows && (
					<div className={styles.emptyOverlay}>
						<EmptyState text='No hay indicaciones registradas para esta visita.' />
					</div>
				)}
			</div>
		</div>
	);
}
