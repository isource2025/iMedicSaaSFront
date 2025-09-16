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
};

export default function IndicacionesTable({ rows, onSelectRow, selectedId }: Props) {
	return (
		<div className={styles.tableWrap}>
			<table className={styles.table}>
				<thead>
					<tr>
						<th>Cantidad</th>
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
						<th>Nro Indicación</th>
						<th>Id Sector</th>
						<th>Medicamento</th>
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 ? (
						<tr>
							<td colSpan={7} className={styles.emptyTd}>
								<EmptyState text='No hay indicaciones registradas para esta visita.' />
							</td>
						</tr>
					) : (
						rows.map((r) => (
							<tr
								key={r.id}
								className={selectedId === r.id ? styles.activeRow : ''}
								onClick={() => onSelectRow?.(r.id)}
							>
								<td>{r.cantidad ?? ''}</td>
								<td>
									<div className={styles.desc}>
										<div className={styles.primary}>
											{r.descripcion ?? '-'}
										</div>
										<div className={styles.sub}>{r.profesional ?? ''}</div>
									</div>
								</td>
								<td>
									<div className={styles.primary}>{r.frecuencia ?? '-'}</div>
									<div className={styles.sub}>{r.observaciones ?? ''}</div>
								</td>
								<td>
									<div className={styles.primary}>
										{[r.proximo, r.anterior].filter(Boolean).join(' · ') ||
											'-'}
									</div>
									<div className={styles.sub}>{r.vigenteDesde ?? ''}</div>
								</td>
								<td>{r.nro ?? ''}</td>
								<td>{r.idSector ?? ''}</td>
								<td>{r.medicamento ?? ''}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
