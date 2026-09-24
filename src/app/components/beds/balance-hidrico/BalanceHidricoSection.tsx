'use client';

import React, { useMemo, useState } from 'react';
import type { BalanceHidrico, BalanceHidricoResumen } from '../../../types/balanceHidrico';
import {
	eliminarBalance,
	formatearFechaCorta,
	formatearHora,
	formatearMl,
	formatearNum,
	nombreProfesional,
	sumarTotales,
} from '../../../services/balanceHidricoService';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import styles from '../indicaciones/IndicacionesSection.module.css';
import tableStyles from '../controles/ControlesFrecuentesSection.module.css';
import bh from './BalanceHidricoSection.module.css';
import BedSectionLoading from '../shared/BedSectionLoading';
import EmptyState from '../shared/EmptyState';
import ConfirmationModal from '../shared/ConfirmationModal';
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

const signo = (n: number) => (n > 0 ? '+' : '');

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
	const [aEliminar, setAEliminar] = useState<BalanceHidrico | null>(null);
	const [query, setQuery] = useState('');
	const [soloDia, setSoloDia] = useState(true);
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

	// Clarion: "Mostrar sólo el día seleccionado" → byDate; destildado → toda la internación
	const path = useMemo(() => {
		if (!numeroVisita) return undefined;
		return soloDia
			? `/balance-hidrico/${numeroVisita}/byDate`
			: `/balance-hidrico/${numeroVisita}/all`;
	}, [numeroVisita, soloDia]);

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

	const filtrados = useMemo(() => {
		let list = registros;
		if (query.trim()) {
			const q = query.toLowerCase();
			list = list.filter((r) => {
				const txt = [
					r.Medicacion,
					r.Via,
					r.Ing_Aent_Alimento,
					r.Ing_Apar_Solucion,
					r.Sector,
					r.ProfesionalApellido,
					r.ProfesionalNombres,
				]
					.map((s) => String(s || '').toLowerCase())
					.join(' ');
				return txt.includes(q);
			});
		}
		return list;
	}, [registros, query]);

	const totales = useMemo(() => sumarTotales(filtrados), [filtrados]);

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

	const abrirNuevo = () => {
		setEditing(null);
		setModalOpen(true);
	};
	const abrirEditar = (r: BalanceHidrico) => {
		setEditing(r);
		setModalOpen(true);
	};
	const cerrarModal = () => {
		setModalOpen(false);
		setEditing(null);
	};

	const confirmarEliminar = async () => {
		if (!aEliminar) return;
		const r = aEliminar;
		setAEliminar(null);
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
		const ml = (v: number | null | undefined) => formatearMl(v);
		const parts = filtrados.map((r, idx) => ({
			title: `${formatearFechaCorta(r.Fecha)} ${formatearHora(r.Hora)} · ${r.Sector || '—'}  (registro ${idx + 1})`,
			fields: [
				{ label: 'Parenteral · Medicación', value: r.Medicacion || '—' },
				{ label: 'Parenteral · Vía', value: r.Via || '—' },
				{ label: 'Parenteral · Ingreso', value: ml(r.Ing_Par_Ingreso) },
				{ label: 'Parenteral · Paso', value: ml(r.Ing_Par_Paso) },
				{ label: 'Alim. enteral · Alimento', value: r.Ing_Aent_Alimento || '—' },
				{ label: 'Alim. enteral · Ingreso', value: ml(r.Ing_Aent_Ingreso) },
				{ label: 'Alim. enteral · Paso', value: ml(r.Ing_Aent_Paso) },
				{ label: 'Alim. parenteral · Solución', value: r.Ing_Apar_Solucion || '—' },
				{ label: 'Alim. parenteral · Ingreso', value: ml(r.Ing_Apar_Ingreso) },
				{ label: 'Alim. parenteral · Paso', value: ml(r.Ing_Apar_paso) },
				{ label: 'Transfusión · Ingreso', value: ml(r.Ing_Tranf_Ingreso) },
				{ label: 'Transfusión · Paso', value: ml(r.Ing_Tranf_paso) },
				{ label: 'Egreso · Diuresis', value: ml(r.Egr_Diuresis) },
				{ label: 'Egreso · Catarsis', value: ml(r.Egr_Catarsis) },
				{ label: 'Egreso · SNG / Vómito', value: ml(r.Egr_SNG_Vomito) },
				{ label: 'Egreso · Drenajes', value: ml(r.Egr_Drenajes) },
				{ label: 'Total ingresos', value: ml(r.TotalIngresos) },
				{ label: 'Total egresos', value: ml(r.TotalEgresos) },
				{ label: 'Balance', value: ml(r.Total) },
			],
			profesional: {
				nombre: nombreProfesional(r.ProfesionalApellido, r.ProfesionalNombres),
				matricula: r.Matricula ?? undefined,
				especialidad: 'Enfermería',
			},
		}));
		parts.push({
			title: 'TOTALES',
			fields: [
				{ label: 'Ingresos', value: `${totales.ingresos} ml` },
				{ label: 'Egresos', value: `${totales.egresos} ml` },
				{ label: 'Total balance', value: `${signo(totales.balance)}${totales.balance} ml` },
			],
			profesional: { nombre: '', matricula: undefined, especialidad: '' },
		});

		await exportToPDF({
			title: 'Balance Hídrico',
			subtitle: soloDia ? `Fecha: ${fechaISO}` : 'Toda la internación',
			parts,
			fileName: `balance_hidrico_${soloDia ? fechaISO : 'internacion'}.pdf`,
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

	const balanceClase =
		totales.balance < 0 ? bh.kpiNeg : totales.balance > 0 ? bh.kpiPos : bh.kpiNeutro;

	const celdaNum = (v: number | null | undefined, extra?: string) => (
		<td className={`${bh.num} ${extra || ''}`}>{formatearNum(v)}</td>
	);

	return (
		<div className={styles.root}>
			{fechaFormateada && (
				<div className={styles.dateHeader}>
					<h2 className={styles.sectionTitle}>Balance Hídrico</h2>
					<span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
					<span className={styles.dateText}>
						{fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
						{!soloDia && <span className={bh.scopeTag}>Toda la internación</span>}
					</span>
					<div className={styles.dateActions}>
						{puedeCrear && (
							<button
								className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
								onClick={abrirNuevo}
							>
								<span className={styles.addIcon} aria-hidden>
									+
								</span>
								Agregar
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

			{/* KPIs — Clarion: Ingresos / Egresos / Total Balance */}
			<div className={bh.kpis}>
				<div className={`${bh.kpi} ${bh.kpiIng}`}>
					<span className={bh.kpiLabel}>Ingresos</span>
					<strong className={bh.kpiValue}>
						{totales.ingresos}
						<small>ml</small>
					</strong>
					<span className={bh.kpiHint}>
						Par {totales.porColumna.Ing_Par_Paso} · Ent {totales.porColumna.Ing_Aent_Paso} · Apar{' '}
						{totales.porColumna.Ing_Apar_paso} · Tranf {totales.porColumna.Ing_Tranf_paso}
					</span>
				</div>
				<div className={`${bh.kpi} ${bh.kpiEgr}`}>
					<span className={bh.kpiLabel}>Egresos</span>
					<strong className={bh.kpiValue}>
						{totales.egresos}
						<small>ml</small>
					</strong>
					<span className={bh.kpiHint}>
						Diur {totales.porColumna.Egr_Diuresis} · Cat {totales.porColumna.Egr_Catarsis} · SNG{' '}
						{totales.porColumna.Egr_SNG_Vomito} · Dren {totales.porColumna.Egr_Drenajes}
					</span>
				</div>
				<div className={`${bh.kpi} ${bh.kpiBal} ${balanceClase}`}>
					<span className={bh.kpiLabel}>Total balance</span>
					<strong className={bh.kpiValue}>
						{signo(totales.balance)}
						{totales.balance}
						<small>ml</small>
					</strong>
					<span className={bh.kpiHint}>
						{filtrados.length} {filtrados.length === 1 ? 'registro' : 'registros'}
					</span>
				</div>
			</div>

			{/* Toolbar: búsqueda · sólo el día */}
			<div className={bh.toolbar}>
				<div className={`${styles.searchWrap} ${bh.search}`}>
					<span className={styles.searchIcon} aria-hidden>
						🔎
					</span>
					<input
						className={styles.searchInput}
						type="text"
						placeholder="Buscar medicación, alimento, solución, sector, profesional…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>

				<label className={bh.switch}>
					<input
						type="checkbox"
						checked={soloDia}
						onChange={(e) => setSoloDia(e.target.checked)}
					/>
					<span className={bh.switchTrack} aria-hidden>
						<span className={bh.switchThumb} />
					</span>
					<span className={bh.switchText}>Sólo el día seleccionado</span>
				</label>
			</div>

			<div className={styles.content}>
				<div className={styles.tableHolder}>
					{error && (
						<div className={tableStyles.errorBox}>Error al cargar: {error.message}</div>
					)}
					{!error && filtrados.length === 0 ? (
						<EmptyState
							variant="controles"
							text={
								registros.length
									? 'Sin registros para esta búsqueda'
									: soloDia
										? 'No hay registros de balance hídrico para esta fecha'
										: 'No hay registros de balance hídrico en la internación'
							}
							description={
								registros.length
									? 'Limpiá la búsqueda para ver todos los registros.'
									: 'Cargá ingresos (parenteral, enteral, transfusión) y egresos (diuresis, catarsis, SNG, drenajes) con el botón Agregar.'
							}
							actionLabel={puedeCrear && !registros.length ? 'Agregar registro' : undefined}
							onAction={puedeCrear && !registros.length ? abrirNuevo : undefined}
						/>
					) : !error ? (
						<>
							<div className={bh.gridWrap}>
								<table className={bh.grid}>
									<thead>
										<tr className={bh.headGroup}>
											<th rowSpan={2} className={bh.colSector}>
												Sector
											</th>
											{!soloDia && (
												<th rowSpan={2} className={bh.colFecha}>
													Fecha
												</th>
											)}
											<th rowSpan={2} className={bh.colHora}>
												Hora
											</th>
											<th colSpan={3} className={bh.grpIng}>
												Ingresos parenteral
											</th>
											<th colSpan={3} className={bh.grpIng}>
												Alimentación enteral
											</th>
											<th colSpan={3} className={bh.grpIng}>
												Alimentación parenteral
											</th>
											<th colSpan={2} className={bh.grpIng}>
												Transfusión
											</th>
											<th colSpan={4} className={bh.grpEgr}>
												Egresos
											</th>
											<th rowSpan={2} className={`${bh.num} ${bh.colTot}`}>
												Total Ingresos
											</th>
											<th rowSpan={2} className={`${bh.num} ${bh.colTot}`}>
												Total Egresos
											</th>
											<th rowSpan={2} className={`${bh.num} ${bh.colTot} ${bh.sepDer}`}>
												Total
											</th>
											<th rowSpan={2} className={bh.colProf}>
												Profesional
											</th>
											<th rowSpan={2} className={bh.colAcc}>
												Acciones
											</th>
										</tr>
										<tr className={bh.headSub}>
											<th className={bh.colTexto}>Medicación</th>
											<th className={bh.num}>Ingreso</th>
											<th className={`${bh.num} ${bh.sepDer}`}>Paso</th>
											<th className={bh.colTexto}>Alimento</th>
											<th className={bh.num}>Ingreso</th>
											<th className={`${bh.num} ${bh.sepDer}`}>Paso</th>
											<th className={bh.colTexto}>Solución</th>
											<th className={bh.num}>Ingreso</th>
											<th className={`${bh.num} ${bh.sepDer}`}>Paso</th>
											<th className={bh.num}>Ingreso</th>
											<th className={`${bh.num} ${bh.sepDer}`}>Paso</th>
											<th className={bh.num}>Diuresis</th>
											<th className={bh.num}>Catarsis</th>
											<th className={bh.num}>SNG / Vómito</th>
											<th className={`${bh.num} ${bh.sepDer}`}>Drenajes</th>
										</tr>
									</thead>
									<tbody>
										{filtrados.map((r) => {
											const bal = Number(r.Total || 0);
											return (
												<tr key={r.IdBalanceHidrico}>
													<td className={bh.colSector}>
														<span className={bh.sectorBadge}>{r.Sector || '—'}</span>
													</td>
													{!soloDia && (
														<td className={bh.colFecha}>{formatearFechaCorta(r.Fecha)}</td>
													)}
													<td className={bh.colHora}>
														<span className={bh.hora}>{formatearHora(r.Hora)}</span>
													</td>
													<td className={bh.colTexto} title={r.Medicacion || ''}>
														<span className={bh.texto}>{r.Medicacion || ''}</span>
														{r.Via && <span className={bh.via}>{r.Via}</span>}
													</td>
													{celdaNum(r.Ing_Par_Ingreso)}
													{celdaNum(r.Ing_Par_Paso, `${bh.paso} ${bh.sepDer}`)}
													<td className={bh.colTexto} title={r.Ing_Aent_Alimento || ''}>
														<span className={bh.texto}>{r.Ing_Aent_Alimento || ''}</span>
													</td>
													{celdaNum(r.Ing_Aent_Ingreso)}
													{celdaNum(r.Ing_Aent_Paso, `${bh.paso} ${bh.sepDer}`)}
													<td className={bh.colTexto} title={r.Ing_Apar_Solucion || ''}>
														<span className={bh.texto}>{r.Ing_Apar_Solucion || ''}</span>
													</td>
													{celdaNum(r.Ing_Apar_Ingreso)}
													{celdaNum(r.Ing_Apar_paso, `${bh.paso} ${bh.sepDer}`)}
													{celdaNum(r.Ing_Tranf_Ingreso)}
													{celdaNum(r.Ing_Tranf_paso, `${bh.paso} ${bh.sepDer}`)}
													{celdaNum(r.Egr_Diuresis, bh.egr)}
													{celdaNum(r.Egr_Catarsis, bh.egr)}
													{celdaNum(r.Egr_SNG_Vomito, bh.egr)}
													{celdaNum(r.Egr_Drenajes, `${bh.egr} ${bh.sepDer}`)}
													<td className={`${bh.num} ${bh.tot} ${bh.colTot}`}>{formatearNum(r.TotalIngresos)}</td>
													<td className={`${bh.num} ${bh.tot} ${bh.colTot}`}>{formatearNum(r.TotalEgresos)}</td>
													<td
														className={`${bh.num} ${bh.tot} ${bh.colTot} ${bh.sepDer} ${
															bal < 0 ? bh.neg : bal > 0 ? bh.pos : ''
														}`}
													>
														{bal === 0 ? '0' : `${signo(bal)}${formatearNum(bal)}`}
													</td>
													<td className={bh.colProf} title={nombreProfesional(r.ProfesionalApellido, r.ProfesionalNombres)}>
														<span className={bh.texto}>
															{nombreProfesional(r.ProfesionalApellido, r.ProfesionalNombres)}
														</span>
													</td>
													<td className={bh.colAcc}>
														<div className={bh.acciones}>
															<button
																className={tableStyles.btnAction}
																onClick={() => setSelected(r)}
																title="Ver detalle"
															>
																<IoEyeOutline color="#5BC0DE" size={17} />
															</button>
															{puedeEditar && puedeGestionarFila(r) && (
																<button
																	className={tableStyles.btnAction}
																	onClick={() => abrirEditar(r)}
																	title="Cambiar"
																>
																	<IoPencilOutline color="#5BC0DE" size={17} />
																</button>
															)}
															{puedeEliminar && puedeGestionarFila(r) && (
																<button
																	className={tableStyles.btnAction}
																	onClick={() => setAEliminar(r)}
																	title="Borrar"
																>
																	<IoTrashOutline color="#5BC0DE" size={17} />
																</button>
															)}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
									<tfoot>
										<tr>
											<td colSpan={soloDia ? 2 : 3} className={bh.footLabel}>
												Totales
											</td>
											<td />
											<td className={bh.num}>{formatearNum(totales.porColumna.Ing_Par_Ingreso)}</td>
											<td className={`${bh.num} ${bh.sepDer}`}>{formatearNum(totales.porColumna.Ing_Par_Paso)}</td>
											<td />
											<td className={bh.num}>{formatearNum(totales.porColumna.Ing_Aent_Ingreso)}</td>
											<td className={`${bh.num} ${bh.sepDer}`}>{formatearNum(totales.porColumna.Ing_Aent_Paso)}</td>
											<td />
											<td className={bh.num}>{formatearNum(totales.porColumna.Ing_Apar_Ingreso)}</td>
											<td className={`${bh.num} ${bh.sepDer}`}>{formatearNum(totales.porColumna.Ing_Apar_paso)}</td>
											<td className={bh.num}>{formatearNum(totales.porColumna.Ing_Tranf_Ingreso)}</td>
											<td className={`${bh.num} ${bh.sepDer}`}>{formatearNum(totales.porColumna.Ing_Tranf_paso)}</td>
											<td className={bh.num}>{formatearNum(totales.porColumna.Egr_Diuresis)}</td>
											<td className={bh.num}>{formatearNum(totales.porColumna.Egr_Catarsis)}</td>
											<td className={bh.num}>{formatearNum(totales.porColumna.Egr_SNG_Vomito)}</td>
											<td className={`${bh.num} ${bh.sepDer}`}>{formatearNum(totales.porColumna.Egr_Drenajes)}</td>
											<td className={bh.num}>{totales.ingresos}</td>
											<td className={bh.num}>{totales.egresos}</td>
											<td
												className={`${bh.num} ${bh.sepDer} ${
													totales.balance < 0 ? bh.neg : totales.balance > 0 ? bh.pos : ''
												}`}
											>
												{signo(totales.balance)}
												{totales.balance}
											</td>
											<td />
											<td className={bh.colAcc} />
										</tr>
									</tfoot>
								</table>
							</div>

							{/* Mobile */}
							<div className={bh.cards}>
								{filtrados.map((r) => {
									const bal = Number(r.Total || 0);
									return (
										<article key={`bh-m-${r.IdBalanceHidrico}`} className={bh.card}>
											<header className={bh.cardHead}>
												<span className={bh.sectorBadge}>{r.Sector || '—'}</span>
												<span className={bh.cardHora}>
													{!soloDia && `${formatearFechaCorta(r.Fecha)} · `}
													{formatearHora(r.Hora)}
												</span>
												<strong className={`${bh.cardBal} ${bal < 0 ? bh.neg : bal > 0 ? bh.pos : ''}`}>
													{signo(bal)}
													{bal} ml
												</strong>
											</header>
											<dl className={bh.cardGrid}>
												{r.Medicacion && (
													<>
														<dt>Medicación</dt>
														<dd>
															{r.Medicacion} {r.Via ? `(${r.Via})` : ''} · {formatearMl(r.Ing_Par_Paso)}
														</dd>
													</>
												)}
												{Boolean(r.Ing_Aent_Alimento || Number(r.Ing_Aent_Paso)) && (
													<>
														<dt>Enteral</dt>
														<dd>
															{r.Ing_Aent_Alimento || '—'} · {formatearMl(r.Ing_Aent_Paso)}
														</dd>
													</>
												)}
												{Boolean(r.Ing_Apar_Solucion || Number(r.Ing_Apar_paso)) && (
													<>
														<dt>Alim. parenteral</dt>
														<dd>
															{r.Ing_Apar_Solucion || '—'} · {formatearMl(r.Ing_Apar_paso)}
														</dd>
													</>
												)}
												{Number(r.Ing_Tranf_paso) > 0 && (
													<>
														<dt>Transfusión</dt>
														<dd>{formatearMl(r.Ing_Tranf_paso)}</dd>
													</>
												)}
												<dt>Egresos</dt>
												<dd>
													Diur {formatearNum(r.Egr_Diuresis) || 0} · Cat {formatearNum(r.Egr_Catarsis) || 0} · SNG{' '}
													{formatearNum(r.Egr_SNG_Vomito) || 0} · Dren {formatearNum(r.Egr_Drenajes) || 0}
												</dd>
											</dl>
											<footer className={bh.cardFoot}>
												<span className={bh.cardProf}>
													{nombreProfesional(r.ProfesionalApellido, r.ProfesionalNombres)}
												</span>
												<div className={bh.acciones}>
													<button className={tableStyles.btnAction} onClick={() => setSelected(r)} title="Ver">
														<IoEyeOutline color="#5BC0DE" size={18} />
													</button>
													{puedeEditar && puedeGestionarFila(r) && (
														<button className={tableStyles.btnAction} onClick={() => abrirEditar(r)} title="Cambiar">
															<IoPencilOutline color="#5BC0DE" size={18} />
														</button>
													)}
													{puedeEliminar && puedeGestionarFila(r) && (
														<button className={tableStyles.btnAction} onClick={() => setAEliminar(r)} title="Borrar">
															<IoTrashOutline color="#5BC0DE" size={18} />
														</button>
													)}
												</div>
											</footer>
										</article>
									);
								})}
							</div>
						</>
					) : null}
				</div>
			</div>

			{/* Detalle */}
			{selected && (
				<div className={tableStyles.modalOverlay} onClick={() => setSelected(null)}>
					<div className={tableStyles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={tableStyles.modalHeader}>
							<h3>
								Balance hídrico · {formatearFechaCorta(selected.Fecha)} {formatearHora(selected.Hora)}
							</h3>
							<button className={tableStyles.btnCerrar} onClick={() => setSelected(null)}>
								×
							</button>
						</div>
						<div className={tableStyles.modalBody}>
							<div className={bh.detalle}>
								{(
									[
										[
											'Ingresos parenteral',
											[
												['Medicación', selected.Medicacion || '—'],
												['Vía', selected.Via || '—'],
												['Ingreso', formatearMl(selected.Ing_Par_Ingreso)],
												['Paso', formatearMl(selected.Ing_Par_Paso)],
											],
										],
										[
											'Alimentación enteral',
											[
												['Alimento', selected.Ing_Aent_Alimento || '—'],
												['Ingreso', formatearMl(selected.Ing_Aent_Ingreso)],
												['Paso', formatearMl(selected.Ing_Aent_Paso)],
											],
										],
										[
											'Alimentación parenteral',
											[
												['Solución', selected.Ing_Apar_Solucion || '—'],
												['Ingreso', formatearMl(selected.Ing_Apar_Ingreso)],
												['Paso', formatearMl(selected.Ing_Apar_paso)],
											],
										],
										[
											'Transfusión',
											[
												['Ingreso', formatearMl(selected.Ing_Tranf_Ingreso)],
												['Paso', formatearMl(selected.Ing_Tranf_paso)],
											],
										],
										[
											'Egresos',
											[
												['Diuresis', formatearMl(selected.Egr_Diuresis)],
												['Catarsis', formatearMl(selected.Egr_Catarsis)],
												['SNG / Vómito', formatearMl(selected.Egr_SNG_Vomito)],
												['Drenajes', formatearMl(selected.Egr_Drenajes)],
											],
										],
										[
											'Registro',
											[
												['Sector', selected.Sector || '—'],
												[
													'Profesional',
													nombreProfesional(selected.ProfesionalApellido, selected.ProfesionalNombres),
												],
												['Total ingresos', formatearMl(selected.TotalIngresos)],
												['Total egresos', formatearMl(selected.TotalEgresos)],
												['Balance', `${signo(Number(selected.Total || 0))}${Number(selected.Total || 0)} ml`],
											],
										],
									] as [string, [string, string][]][]
								).map(([grupo, items]) => (
									<section key={grupo} className={bh.detalleGrupo}>
										<h4>{grupo}</h4>
										{items.map(([label, value]) => (
											<div className={bh.detalleItem} key={label}>
												<span>{label}</span>
												<strong>{value}</strong>
											</div>
										))}
									</section>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			<ConfirmationModal
				isOpen={!!aEliminar}
				onClose={() => setAEliminar(null)}
				onConfirm={confirmarEliminar}
				title="Borrar registro de balance hídrico"
				message={
					aEliminar
						? `${formatearFechaCorta(aEliminar.Fecha)} ${formatearHora(aEliminar.Hora)} · ${aEliminar.Sector || ''}\n${
								aEliminar.Medicacion || aEliminar.Ing_Aent_Alimento || aEliminar.Ing_Apar_Solucion || 'Sin descripción'
							}\nBalance: ${Number(aEliminar.Total || 0)} ml\n\nEsta acción no se puede deshacer.`
						: ''
				}
				confirmText="Borrar"
				cancelText="Cancelar"
			/>

			<ModalBasePaciente
				numeroVisita={numeroVisita ? String(numeroVisita) : ''}
				onClose={cerrarModal}
				isOpen={modalOpen}
				titulo={editing ? 'Cambiar registro de balance hídrico' : 'Agregar registro de balance hídrico'}
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
					onClose={cerrarModal}
				/>
			</ModalBasePaciente>
		</div>
	);
};

export default BalanceHidricoSection;
