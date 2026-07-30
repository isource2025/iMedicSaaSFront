"use client";

import { useState } from 'react';
import styles from '../evoluciones/EvolucionesTable.module.css';
import EmptyState from '../shared/EmptyState';
import { IoPencilOutline, IoTrashOutline, IoEyeOutline } from 'react-icons/io5';
import { epicrisisService } from '../../../services/epicrisisService';
import ConfirmationModal from '../shared/ConfirmationModal';
import { formatSqlDate } from '../../../utils/dateUtils';
import {
	useUsuarioActual,
	esRegistroPropio,
	esAdminClinico,
} from '../../../hooks/useUsuarioActual';
import { Epicrisis } from '../../../types/epicrisis';

export type EpicrisisRow = Epicrisis & { id: number };

type Props = {
	rows: EpicrisisRow[];
	onSelectRow?: (id: number) => void;
	selectedId?: number | null;
	refetch: () => Promise<void>;
};

export default function EpicrisisTable({
	rows,
	onSelectRow,
	selectedId,
	refetch,
}: Props) {
	const hasRows = rows && rows.length > 0;
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [viewing, setViewing] = useState<EpicrisisRow | null>(null);
	const usuarioActual = useUsuarioActual();
	const esAdmin = esAdminClinico();
	const puedeModificar = (row: EpicrisisRow) =>
		esAdmin ||
		esRegistroPropio(row as unknown as Record<string, unknown>, usuarioActual) !== false;

	const handleDelete = async (id: number) => {
		try {
			await epicrisisService.eliminar(id);
			await refetch();
		} catch (error) {
			console.error('Error deleting epicrisis:', error);
			alert(error instanceof Error ? error.message : 'No se pudo eliminar');
		}
	};

	return (
		<>
			<div className={styles.tableWrap}>
				<div className={styles.scrollArea}>
					<table className={styles.table} role="grid">
						<thead className={styles.thead}>
							<tr>
								<th className={styles.colFecha}>Fecha</th>
								<th className={styles.colHora}>Hora</th>
								<th className={styles.colEvolucion}>Epicrisis</th>
								<th className={styles.colProfesional}>Profesional</th>
								<th className={styles.colSector}>Sector</th>
								<th className={styles.colAccion}>Acciones</th>
							</tr>
						</thead>
						<tbody className={styles.tbody}>
							{hasRows
								? rows.map((r, index) => (
										<tr
											key={`epicrisis-${r.id}-${index}`}
											className={styles.row}
										>
											<td className={styles.cellFecha}>
												{r.fecha
													? formatSqlDate(r.fecha, {
															showTime: false,
															showDate: true,
															showYear: true,
														})
													: '-'}
											</td>
											<td className={styles.cellHora}>{r.hora || '-'}</td>
											<td className={styles.cellEvolucion}>
												<div className={styles.evolucionPreview}>
													{(r.diagnostico || r.diagnosticoText) && (
														<strong>
															{[r.diagnostico, r.diagnosticoText]
																.filter(Boolean)
																.join(' — ')
																.slice(0, 60)}
															<br />
														</strong>
													)}
													{r.epicrisis
														? r.epicrisis.substring(0, 120) +
															(r.epicrisis.length > 120 ? '...' : '')
														: '-'}
												</div>
											</td>
											<td className={styles.cellProfesional}>
												{r.profesionalNombreCompleto ||
													(r.profesional
														? `Profesional ${r.profesional}`
														: '-')}
											</td>
											<td className={styles.cellSector}>{r.idSector || '-'}</td>
											<td className={styles.cellAccion}>
												<div className={styles.actionBtns}>
													<button
														className={styles.btnAction}
														title="Ver epicrisis"
														onClick={(e) => {
															e.stopPropagation();
															setViewing(r);
														}}
													>
														<IoEyeOutline color="#5BC0DE" size="18px" />
													</button>
													{puedeModificar(r) && (
														<>
															<button
																className={styles.btnAction}
																title="Editar"
																onClick={(e) => {
																	e.stopPropagation();
																	onSelectRow?.(r.id);
																}}
															>
																<IoPencilOutline color="#5BC0DE" size="18px" />
															</button>
															<button
																className={styles.btnAction}
																title="Eliminar"
																onClick={(e) => {
																	e.stopPropagation();
																	setDeletingId(r.id);
																}}
															>
																<IoTrashOutline color="#5BC0DE" size="18px" />
															</button>
														</>
													)}
												</div>
											</td>
										</tr>
									))
								: null}
						</tbody>
					</table>

					{!hasRows && (
						<div className={styles.emptyOverlay}>
							<EmptyState text="No hay epicrisis registradas para esta internación." />
						</div>
					)}
				</div>
			</div>

			<ConfirmationModal
				isOpen={deletingId != null}
				title="Eliminar epicrisis"
				message="¿Confirma eliminar esta epicrisis?"
				onConfirm={() => {
					if (deletingId != null) handleDelete(deletingId);
					setDeletingId(null);
				}}
				onClose={() => setDeletingId(null)}
			/>

			{viewing && (
				<div className={styles.modalOverlay} onClick={() => setViewing(null)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>
								Epicrisis — {viewing.fecha} {viewing.hora}
							</h3>
							<button
								type="button"
								className={styles.btnClose}
								onClick={() => setViewing(null)}
							>
								✕
							</button>
						</div>
						<div className={styles.modalBody}>
							<p>
								<strong>Profesional:</strong>{' '}
								{viewing.profesionalNombreCompleto || viewing.profesional || '-'}
							</p>
							{(viewing.diagnostico || viewing.diagnosticoText) && (
								<p>
									<strong>Diagnóstico:</strong>{' '}
									{[viewing.diagnostico, viewing.diagnosticoText]
										.filter(Boolean)
										.join(' — ')}
								</p>
							)}
							<div className={styles.evolucionFull}>{viewing.epicrisis}</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
