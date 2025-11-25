import { Rendicion } from '../../types/RendicionInterface';
import styles from './RendicionList.module.css';
import Pagination from '../UI/Pagination';
import { IoPencil, IoTrashOutline, IoEyeOutline, IoLockClosedOutline } from 'react-icons/io5';
import { formatDate as formatClarionDate } from '../../utils/dateUtils';

interface RendicionListProps {
	rendiciones: Rendicion[];
	loading: boolean;
	error: string | null;
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onEdit: (rendicion: Rendicion) => void;
	onDelete: (rendicion: Rendicion) => void;
	onView: (rendicion: Rendicion) => void;
	onClose?: (rendicion: Rendicion) => void;
}

export default function RendicionList({
	rendiciones,
	loading,
	error,
	currentPage,
	totalPages,
	onPageChange,
	onEdit,
	onDelete,
	onView,
	onClose,
}: RendicionListProps) {
	const formatDate = (dateString?: string | null) => {
		if (!dateString) return '-';

		const date = new Date(dateString);
		if (isNaN(date.getTime())) return '-';

		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();

		return `${day}/${month}/${year}`;
	};

	const formatMoney = (amount?: number | null) => {
		if (amount === null || amount === undefined) return '-';
		return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	const formatPeriodo = (periodo: number) => {
		// El período es una fecha en formato Clarion
		return formatClarionDate(periodo, { isClarionDate: true });
	};

	return (
		<div className={styles.container}>
			{error && (
				<div className={styles.errorContainer} role='alert'>
					<strong className={styles.errorTitle}>Error!</strong>
					<span className={styles.errorMessage}> {error}</span>
				</div>
			)}

			<div className={styles.tableContainer}>
				<table className={styles.table} aria-label='Lista de rendiciones'>
					<thead className={styles.tableHeader}>
						<tr>
							<th scope='col'>ID</th>
							<th scope='col'>Cliente</th>
							<th scope='col'>Convenio</th>
							<th scope='col'>Período</th>
							<th scope='col'>Honorarios</th>
							<th scope='col'>Gastos</th>
							<th scope='col'>Total</th>
							<th scope='col'>Fecha Grabación</th>
							<th scope='col'>Estado</th>
							<th scope='col'>Acciones</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={10} className={styles.loadingContainer}>
									<div className={styles.loadingContent}>
										<div className={styles.loadingSpinner}></div>
										<span className={styles.loadingText}>Cargando...</span>
									</div>
								</td>
							</tr>
						) : rendiciones.length === 0 ? (
							<tr>
								<td colSpan={10} className={styles.noResults}>
									No se encontraron rendiciones
								</td>
							</tr>
						) : (
							rendiciones.map((rendicion) => {
								const total =
									(rendicion.Honorarios || 0) +
									(rendicion.Gastos || 0) +
									(rendicion.Medicamentos || 0) +
									(rendicion.OtrosServicios || 0);

								return (
									<tr key={rendicion.IdRendicion} className={styles.tableRow}>
										<td>{rendicion.IdRendicion}</td>
										<td className={styles.clientColumn}>
											<div className={styles.clientName}>{rendicion.ClienteRazonSocial || '-'}</div>
										</td>
										<td>
											<div className={styles.convenioColumn}>
												<div className={styles.convenioNumber}>ID {rendicion.idCliente}</div>
												<div className={styles.convenioDesc}>{rendicion.ConvenioDescripcion || '-'}</div>
											</div>
										</td>
										<td>{formatPeriodo(rendicion.Periodo)}</td>
										<td className={styles.moneyColumn}>{formatMoney(rendicion.Honorarios)}</td>
										<td className={styles.moneyColumn}>{formatMoney(rendicion.Gastos)}</td>
										<td className={styles.moneyColumn}>
											<strong>{formatMoney(total)}</strong>
										</td>
										<td>{formatDate(rendicion.FechaGraba)}</td>
										<td>
											{rendicion.FechaCierre ? (
												<span className={styles.statusClosed}>Cerrada</span>
											) : (
												<span className={styles.statusOpen}>Abierta</span>
											)}
										</td>
										<td>
											<div className={styles.actionButtons}>
												<button
													onClick={() => onView(rendicion)}
													className={styles.viewButton}
													title='Ver detalles'
													aria-label={`Ver detalles de rendición ${rendicion.IdRendicion}`}
												>
													<IoEyeOutline size={20} />
												</button>
												<button
													onClick={() => onEdit(rendicion)}
													className={styles.editButton}
													title='Editar'
													aria-label={`Editar rendición ${rendicion.IdRendicion}`}
												>
													<IoPencil size={20} />
												</button>
												{onClose && !rendicion.FechaCierre && (
													<button
														onClick={() => onClose(rendicion)}
														className={styles.closeButton}
														title='Cerrar rendición'
														aria-label={`Cerrar rendición ${rendicion.IdRendicion}`}
													>
														<IoLockClosedOutline size={20} />
													</button>
												)}
												<button
													onClick={() => onDelete(rendicion)}
													className={styles.deleteButton}
													title='Eliminar'
													aria-label={`Eliminar rendición ${rendicion.IdRendicion}`}
												>
													<IoTrashOutline size={20} />
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
		</div>
	);
}
