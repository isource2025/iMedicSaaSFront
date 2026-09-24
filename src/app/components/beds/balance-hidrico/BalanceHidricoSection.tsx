'use client';

import React, { useMemo, useState } from 'react';
import type { BalanceHidrico, BalanceHidricoResumen } from '../../../types/balanceHidrico';
import {
	eliminarBalance,
	esFilaBalance,
	formatearHora,
	formatearMl,
	nombreProfesional,
} from '../../../services/balanceHidricoService';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import styles from '../indicaciones/IndicacionesSection.module.css';
import tableStyles from '../controles/ControlesFrecuentesSection.module.css';
import localStyles from './BalanceHidricoSection.module.css';
import BedSectionLoading from '../shared/BedSectionLoading';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import { IoEyeOutline, IoTrashOutline, IoPencilOutline } from 'react-icons/io5';
import NuevoBalanceHidricoModal from './NuevoBalanceHidricoModal';
import ModalBasePaciente from '../../modals/ModalBasePaciente';
import { useUsuarioActual, esRegistroPropio, esAdminClinico } from '../../../hooks/useUsuarioActual';
import { usePermiso } from '../../../hooks/usePermiso';

interface Props {
	numeroVisita: number | null;
	patientName?: string;
	patientLocation?: string;
	documentoPaciente?: string;
	fechaIngreso?: string;
	horaIngreso?: string;
	bedSector?: string | null;
}

function toISODate(d: Date | null | undefined): string | null {
	if (!d) return null;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const BalanceHidricoSection: React.FC<Props> = ({
	numeroVisita,
	patientName,
	patientLocation,
	documentoPaciente,
	fechaIngreso,
	horaIngreso,
	bedSector,
}) => {
	const { activeSection, selectedDate } = useBedDetail();
	const [selected, setSelected] = useState<BalanceHidrico | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<BalanceHidrico | null>(null);
	const [query, setQuery] = useState('');
	const usuarioActual = useUsuarioActual();
	const { puede } = usePermiso();
	const puedeCrear = puede('INTERNACION.BALANCE_HIDRICO.CREAR');
	const puedeEditar = puede('INTERNACION.BALANCE_HIDRICO.EDITAR');
	const puedeEliminar = puede('INTERNACION.BALANCE_HIDRICO.ELIMINAR');

	const puedeGestionarFila = (r: BalanceHidrico) => {
		if (esAdminClinico()) return true;
		return (
			esRegistroPropio(
				{ Profesional: r.Profesional, OperadorCarga: r.Profesional } as Record<string, unknown>,
				usuarioActual,
			) === true
		);
	};

	const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

	const path = useMemo(
		() => (numeroVisita ? `/balance-hidrico/${numeroVisita}/byDate` : undefined),
		[numeroVisita],
	);

	const { data, isLoading, error, refetch } = useBedSectionFetch<{
		success?: boolean;
		data?: BalanceHidrico[];
		resumen?: BalanceHidricoResumen;
	}>({
		enabled: !!path && activeSection === 'balance-hidrico',
		endpointOverride: path ? { 'balance-hidrico': path } : undefined,
		cacheTimeMs: 15000,
	});

	const registros: BalanceHidrico[] = useMemo(() => {
		if (Array.isArray(data)) return data as BalanceHidrico[];
		if (data && Array.isArray(data.data)) return data.data;
		return [];
	}, [data]);

	const resumen: BalanceHidricoResumen | null = useMemo(() => {
		if (data && !Array.isArray(data) && data.resumen) return data.resumen;
		return null;
	}, [data]);

	const filtrados = useMemo(() => {
		if (!query.trim()) return registros;
		const q = query.toLowerCase();
		return registros.filter((r) => {
			const med = (r.Medicacion || '').toLowerCase();
			const alim = (r.Ing_Aent_Alimento || '').toLowerCase();
			const op = `${r.ProfesionalApellido || ''} ${r.ProfesionalNombres || ''}`.toLowerCase();
			return med.includes(q) || alim.includes(q) || op.includes(q);
		});
	}, [registros, query]);

	const formatSelectedDate = () => {
		if (!selectedDate) return null;
		const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
		const meses = [
			'Enero',
			'Febrero',
			'Marzo',
			'Abril',
			'Mayo',
			'Junio',
			'Julio',
			'Agosto',
			'Septiembre',
			'Octubre',
			'Noviembre',
			'Diciembre',
		];
		return {
			diaSemana: dias[selectedDate.getDay()],
			diaMes: selectedDate.getDate(),
			mes: meses[selectedDate.getMonth()],
		};
	};
	const fechaFormateada = formatSelectedDate();

	const handleEliminar = async (r: BalanceHidrico) => {
		if (
			!confirm(
				`¿Eliminar este registro?\n\n${r.Medicacion || 'Sin descripción'}\nHora: ${formatearHora(r.Hora)}`,
			)
		)
			return;
		try {
			await eliminarBalance(r.IdBalanceHidrico);
			refetch();
		} catch {
			alert('Error al eliminar el registro');
		}
	};

	const handleExport = async (option: ExportOption) => {
		if (option !== 'pdf') return;
		const empresaInfo = await obtenerInfoEmpresa();
		const parts = filtrados.map((r, idx) => ({
			title: `Registro ${idx + 1}${esFilaBalance(r.Medicacion) ? ' (balance)' : ''}`,
			fields: [
				{ label: 'Hora', value: formatearHora(r.Hora) },
				{ label: 'Medicación', value: r.Medicacion || '—' },
				{ label: 'Parenteral paso', value: formatearMl(r.Ing_Par_Paso) },
				{ label: 'Enteral paso', value: formatearMl(r.Ing_Aent_Paso) },
				{ label: 'Diuresis', value: formatearMl(r.Egr_Diuresis) },
				{ label: 'Catarsis', value: formatearMl(r.Egr_Catarsis) },
				{ label: 'Total ingresos', value: formatearMl(r.TotalIngresos) },
				{ label: 'Total egresos', value: formatearMl(r.TotalEgresos) },
				{ label: 'Balance', value: formatearMl(r.Total) },
			],
			profesional: {
				nombre: nombreProfesional(r.ProfesionalApellido, r.ProfesionalNombres),
				matricula: r.Matricula ?? undefined,
				especialidad: 'Enfermería',
			},
		}));

		await exportToPDF({
			title: 'Balance Hídrico',
			subtitle: `Fecha: ${fechaISO}`,
			parts,
			fileName: `balance_hidrico_${fechaISO}.pdf`,
			orientation: 'portrait',
			empresaInfo,
			patientInfo: {
				numeroVisita: numeroVisita || undefined,
				nombre: patientName,
				numeroDocumento: documentoPaciente,
				ubicacion: patientLocation,
				fechaIngreso,
				horaIngreso,
			},
		});
	};

	if (activeSection !== 'balance-hidrico') return null;
	if (isLoading) return <BedSectionLoading />;

	const balMostrar = resumen?.ultimoBalance?.total ?? resumen?.acumuladoBalance ?? 0;

	return (
		<div className={styles.root}>
			{fechaFormateada && (
				<div className={styles.dateHeader}>
					<h2 className={styles.sectionTitle}>Balance Hídrico</h2>
					<span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
					<span className={styles.dateText}>
						{fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
					</span>
					<div className={styles.dateActions}>
						{puedeCrear && (
							<button
								className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
								onClick={() => {
									setEditing(null);
									setModalOpen(true);
								}}
							>
								<span className={styles.addIcon} aria-hidden>
									+
								</span>
								Registro
							</button>
						)}
						<ExportButton
							data={filtrados}
							fileName={`balance_hidrico_${fechaISO}.pdf`}
							onExport={handleExport}
							options={['pdf']}
						/>
					</div>
				</div>
			)}

			{resumen && (
				<div className={localStyles.summaryBar}>
					<div className={localStyles.summaryCard}>
						<span className={localStyles.summaryLabel}>Ingresos (paso)</span>
						<strong>{resumen.acumuladoIngresos} ml</strong>
					</div>
					<div className={localStyles.summaryCard}>
						<span className={localStyles.summaryLabel}>Egresos</span>
						<strong>{resumen.acumuladoEgresos} ml</strong>
					</div>
					<div
						className={`${localStyles.summaryCard} ${
							balMostrar < 0 ? localStyles.neg : localStyles.pos
						}`}
					>
						<span className={localStyles.summaryLabel}>
							{resumen.ultimoBalance
								? `Último ${String(resumen.ultimoBalance.medicacion || '').trim()}`
								: 'Balance del día'}
						</span>
						<strong>
							{resumen.ultimoBalance
								? `${resumen.ultimoBalance.total} ml`
								: `${resumen.acumuladoBalance} ml`}
						</strong>
					</div>
				</div>
			)}

			<div className={tableStyles.toolbar}>
				<div className={tableStyles.searchWrap}>
					<span className={tableStyles.searchIcon} aria-hidden>
						🔎
					</span>
					<input
						className={tableStyles.searchInput}
						type="text"
						placeholder="Buscar por medicación, alimento, profesional…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</div>

			<div className={tableStyles.content}>
				<div className={tableStyles.tableHolder}>
					{error && (
						<div className={tableStyles.errorBox}>Error al cargar: {error.message}</div>
					)}
					{!isLoading && !error && filtrados.length === 0 ? (
						<EmptyState
							variant="controles"
							text="No hay registros de balance hídrico"
							description="Cargá ingresos/egresos o un balance parcial/total del turno."
							actionLabel={puedeCrear ? 'Nuevo registro' : undefined}
							onAction={puedeCrear ? () => setModalOpen(true) : undefined}
						/>
					) : !isLoading && !error ? (
						<>
							<div className={tableStyles.tableContainer}>
								<table className={tableStyles.table}>
									<thead>
										<tr>
											<th>Hora</th>
											<th>Descripción</th>
											<th>Par. paso</th>
											<th>Ent. paso</th>
											<th>Diuresis</th>
											<th>Otros egr.</th>
											<th>Ingresos</th>
											<th>Egresos</th>
											<th>Balance</th>
											<th>Profesional</th>
											<th>Acciones</th>
										</tr>
									</thead>
									<tbody>
										{filtrados.map((r) => {
											const otrosEgr =
												Number(r.Egr_Catarsis || 0) +
												Number(r.Egr_SNG_Vomito || 0) +
												Number(r.Egr_Drenajes || 0);
											return (
												<tr
													key={r.IdBalanceHidrico}
													className={
														esFilaBalance(r.Medicacion) ? localStyles.rowBalance : undefined
													}
												>
													<td>{formatearHora(r.Hora)}</td>
													<td>
														{esFilaBalance(r.Medicacion) ? (
															<span className={localStyles.badgeBalance}>
																{r.Medicacion}
															</span>
														) : (
															r.Medicacion || '—'
														)}
													</td>
													<td>{formatearMl(r.Ing_Par_Paso)}</td>
													<td>{formatearMl(r.Ing_Aent_Paso)}</td>
													<td>{formatearMl(r.Egr_Diuresis)}</td>
													<td>{otrosEgr ? `${otrosEgr} ml` : '—'}</td>
													<td>{formatearMl(r.TotalIngresos)}</td>
													<td>{formatearMl(r.TotalEgresos)}</td>
													<td
														className={
															Number(r.Total || 0) < 0 ? localStyles.neg : undefined
														}
													>
														{formatearMl(r.Total)}
													</td>
													<td>
														{nombreProfesional(
															r.ProfesionalApellido,
															r.ProfesionalNombres,
														)}
													</td>
													<td className={tableStyles.cellAccion}>
														<div className={tableStyles.actionBtns}>
															<button
																className={tableStyles.btnAction}
																onClick={() => setSelected(r)}
																title="Ver detalle"
															>
																<IoEyeOutline color="#5BC0DE" size={18} />
															</button>
															{puedeEditar && puedeGestionarFila(r) && (
																<button
																	className={tableStyles.btnAction}
																	onClick={() => {
																		setEditing(r);
																		setModalOpen(true);
																	}}
																	title="Editar"
																>
																	<IoPencilOutline color="#5BC0DE" size={18} />
																</button>
															)}
															{puedeEliminar && puedeGestionarFila(r) && (
																<button
																	className={tableStyles.btnAction}
																	onClick={() => handleEliminar(r)}
																	title="Eliminar"
																>
																	<IoTrashOutline color="#5BC0DE" size={18} />
																</button>
															)}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							<div className={tableStyles.mobileCards}>
								{filtrados.map((r) => (
									<article
										key={`bh-m-${r.IdBalanceHidrico}`}
										className={tableStyles.mobileCard}
									>
										<div className={tableStyles.mobileCardHeader}>
											<span>{formatearHora(r.Hora)}</span>
											{esFilaBalance(r.Medicacion) && (
												<span className={localStyles.badgeBalance}>Balance</span>
											)}
										</div>
										<p className={tableStyles.mobileMeta}>
											{r.Medicacion || 'Sin descripción'} · Ing {formatearMl(r.TotalIngresos)} ·
											Egr {formatearMl(r.TotalEgresos)} · Bal {formatearMl(r.Total)}
										</p>
										<p className={tableStyles.mobileProfesional}>
											{nombreProfesional(r.ProfesionalApellido, r.ProfesionalNombres)}
										</p>
										<div className={tableStyles.actionBtns}>
											<button
												className={tableStyles.btnAction}
												onClick={() => setSelected(r)}
												title="Ver"
											>
												<IoEyeOutline color="#5BC0DE" size={18} />
											</button>
											{puedeEditar && puedeGestionarFila(r) && (
												<button
													className={tableStyles.btnAction}
													onClick={() => {
														setEditing(r);
														setModalOpen(true);
													}}
													title="Editar"
												>
													<IoPencilOutline color="#5BC0DE" size={18} />
												</button>
											)}
											{puedeEliminar && puedeGestionarFila(r) && (
												<button
													className={tableStyles.btnAction}
													onClick={() => handleEliminar(r)}
													title="Eliminar"
												>
													<IoTrashOutline color="#5BC0DE" size={18} />
												</button>
											)}
										</div>
									</article>
								))}
							</div>
						</>
					) : null}
				</div>
			</div>

			{selected && (
				<div className={tableStyles.modalOverlay} onClick={() => setSelected(null)}>
					<div className={tableStyles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={tableStyles.modalHeader}>
							<h3>Detalle balance hídrico</h3>
							<button className={tableStyles.btnCerrar} onClick={() => setSelected(null)}>
								×
							</button>
						</div>
						<div className={tableStyles.modalBody}>
							<div className={tableStyles.detailGrid}>
								{(
									[
										['Fecha', selected.Fecha],
										['Hora', formatearHora(selected.Hora)],
										['Medicación', selected.Medicacion || '—'],
										['Vía', selected.Via || '—'],
										['Par. ingreso', formatearMl(selected.Ing_Par_Ingreso)],
										['Par. paso', formatearMl(selected.Ing_Par_Paso)],
										['Alimento', selected.Ing_Aent_Alimento || '—'],
										['Ent. ingreso', formatearMl(selected.Ing_Aent_Ingreso)],
										['Ent. paso', formatearMl(selected.Ing_Aent_Paso)],
										['Solución', selected.Ing_Apar_Solucion || '—'],
										['Apar. ingreso', formatearMl(selected.Ing_Apar_Ingreso)],
										['Apar. paso', formatearMl(selected.Ing_Apar_paso)],
										['Transf. ingreso', formatearMl(selected.Ing_Tranf_Ingreso)],
										['Transf. paso', formatearMl(selected.Ing_Tranf_paso)],
										['Diuresis', formatearMl(selected.Egr_Diuresis)],
										['Catarsis', formatearMl(selected.Egr_Catarsis)],
										['SNG / vómito', formatearMl(selected.Egr_SNG_Vomito)],
										['Drenajes', formatearMl(selected.Egr_Drenajes)],
										['Total ingresos', formatearMl(selected.TotalIngresos)],
										['Total egresos', formatearMl(selected.TotalEgresos)],
										['Balance', formatearMl(selected.Total)],
										[
											'Profesional',
											nombreProfesional(
												selected.ProfesionalApellido,
												selected.ProfesionalNombres,
											),
										],
										['Sector', selected.Sector || '—'],
									] as [string, string][]
								).map(([label, value]) => (
									<div className={tableStyles.detailItem} key={label}>
										<span className={tableStyles.detailLabel}>{label}:</span>
										<span className={tableStyles.detailValue}>{value}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			<ModalBasePaciente
				numeroVisita={numeroVisita ? String(numeroVisita) : ''}
				onClose={() => {
					setModalOpen(false);
					setEditing(null);
				}}
				isOpen={modalOpen}
				titulo={editing ? 'Editar balance hídrico' : 'Nuevo registro de balance hídrico'}
				footerButtons={
					<button
						type="submit"
						form="nuevo-balance-hidrico-form"
						className={`${styles.btn} ${styles.btnPrimary}`}
					>
						Guardar
					</button>
				}
			>
				<NuevoBalanceHidricoModal
					defaultNumeroVisita={numeroVisita}
					defaultFecha={fechaISO}
					registroToEdit={editing}
					bedSector={bedSector}
					refetch={refetch}
					onClose={() => {
						setModalOpen(false);
						setEditing(null);
					}}
				/>
			</ModalBasePaciente>
		</div>
	);
};

export default BalanceHidricoSection;
