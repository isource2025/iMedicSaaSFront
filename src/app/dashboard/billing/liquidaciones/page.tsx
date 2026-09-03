'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	BadgeCheck,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	FileSpreadsheet,
	Filter,
	History,
	Receipt,
	RefreshCw,
	RotateCcw,
	Upload,
} from 'lucide-react';
import Loader from '@/app/components/Loader/Loader';
import { usePermiso } from '@/app/hooks/usePermiso';
import { mensajeDeError } from '@/app/utils/apiError';
import {
	liquidacionImportService,
	type EstadoFilaLiquidacion,
	type FilaLiquidacion,
	type ImportacionResumen,
	type PreviewLiquidacion,
} from '@/app/services/liquidacionImportService';
import ui from '../../profile/profile.module.css';
import styles from './liquidaciones.module.css';

type TabId = 'importar' | 'historial';

const ETIQUETA_ESTADO: Record<EstadoFilaLiquidacion, string> = {
	APLICADO: 'Coincide',
	SIN_CAMBIO: 'Ya estaba',
	AMBIGUA: 'Ambigua',
	SIN_MATCH: 'Sin coincidencia',
	DUPLICADA_EXCEL: 'Repetida',
};

const FILAS_POR_PAGINA = 50;

function formatImporte(n: number | null | undefined) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatFechaHora(valor: string | null | undefined) {
	if (!valor) return '—';
	const d = new Date(valor);
	if (Number.isNaN(d.getTime())) return String(valor);
	return d.toLocaleString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function claseEstado(estado: EstadoFilaLiquidacion) {
	if (estado === 'APLICADO') return ui.amountStrong;
	if (estado === 'SIN_CAMBIO') return ui.badgePending;
	if (estado === 'AMBIGUA' || estado === 'DUPLICADA_EXCEL') return ui.badgePending;
	return ui.badgeNoFact;
}

export default function LiquidacionesPage() {
	const { puede, loaded } = usePermiso();
	const puedeVer = puede('FACTURACION.LIQUIDACIONES.VER');
	const puedeImportar = puede('FACTURACION.LIQUIDACIONES.GESTIONAR');

	const inputRef = useRef<HTMLInputElement | null>(null);
	const [tab, setTab] = useState<TabId>('importar');
	const [archivo, setArchivo] = useState<File | null>(null);
	const [preview, setPreview] = useState<PreviewLiquidacion | null>(null);
	const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoFilaLiquidacion>('TODOS');
	const [confirmarParcial, setConfirmarParcial] = useState(false);
	const [cargando, setCargando] = useState(false);
	const [aplicando, setAplicando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [aviso, setAviso] = useState<string | null>(null);
	const [historial, setHistorial] = useState<ImportacionResumen[]>([]);
	const [revirtiendo, setRevirtiendo] = useState<number | null>(null);
	const [paginaActual, setPaginaActual] = useState(1);

	const aplicado = preview?.aplicado ?? null;

	const cargarHistorial = useCallback(async () => {
		if (!puedeVer) return;
		try {
			setHistorial(await liquidacionImportService.listarImportaciones(20));
		} catch (e) {
			console.error('[liquidaciones] historial:', e);
		}
	}, [puedeVer]);

	useEffect(() => {
		void cargarHistorial();
	}, [cargarHistorial]);

	const limpiar = () => {
		setArchivo(null);
		setPreview(null);
		setFiltroEstado('TODOS');
		setConfirmarParcial(false);
		setError(null);
		setAviso(null);
		setPaginaActual(1);
		if (inputRef.current) inputRef.current.value = '';
	};

	const elegirArchivo = async (file: File | null) => {
		setPreview(null);
		setConfirmarParcial(false);
		setError(null);
		setAviso(null);
		setPaginaActual(1);
		setArchivo(file);
		if (!file) return;

		setCargando(true);
		try {
			setPreview(await liquidacionImportService.previsualizar(file));
		} catch (e) {
			setError(mensajeDeError(e, 'No pude leer el archivo'));
		} finally {
			setCargando(false);
		}
	};

	const aplicar = async () => {
		if (!archivo) return;
		setAplicando(true);
		setError(null);
		setAviso(null);
		try {
			const resultado = await liquidacionImportService.aplicar(archivo, confirmarParcial);
			setPreview(resultado);
			setAviso(
				`Se actualizaron ${resultado.aplicado?.filasAplicadas ?? 0} prestaciones por ` +
					`$${formatImporte(resultado.aplicado?.importeAplicado ?? 0)}.`,
			);
			await cargarHistorial();
		} catch (e) {
			setError(mensajeDeError(e, 'No pude aplicar la liquidación'));
		} finally {
			setAplicando(false);
		}
	};

	const revertir = async (idImport: number) => {
		setRevirtiendo(idImport);
		setError(null);
		setAviso(null);
		try {
			const r = await liquidacionImportService.revertir(idImport);
			setAviso(
				`Importación ${idImport} revertida: ${r.revertidas} prestaciones volvieron al importe anterior` +
					(r.omitidas > 0
						? `, ${r.omitidas} quedaron como estaban por tener un valor más nuevo`
						: '') +
					'.',
			);
			await cargarHistorial();
		} catch (e) {
			setError(mensajeDeError(e, 'No pude revertir la importación'));
		} finally {
			setRevirtiendo(null);
		}
	};

	const filasVisibles = useMemo(() => {
		if (!preview) return [];
		if (filtroEstado === 'TODOS') return preview.filas;
		return preview.filas.filter((f) => f.estado === filtroEstado);
	}, [preview, filtroEstado]);

	const totalPaginas = Math.max(1, Math.ceil(filasVisibles.length / FILAS_POR_PAGINA));
	const filasPaginadas = useMemo(() => {
		const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
		return filasVisibles.slice(inicio, inicio + FILAS_POR_PAGINA);
	}, [filasVisibles, paginaActual]);

	useEffect(() => {
		setPaginaActual(1);
	}, [filtroEstado]);

	useEffect(() => {
		if (paginaActual > totalPaginas) setPaginaActual(totalPaginas);
	}, [paginaActual, totalPaginas]);

	if (!loaded) {
		return (
			<div className={ui.container}>
				<div className={ui.loaderWrap}>
					<Loader />
				</div>
			</div>
		);
	}

	if (!puedeVer) {
		return (
			<div className={ui.container}>
				<div className={ui.empty}>No tenés permiso para ver las liquidaciones.</div>
			</div>
		);
	}

	return (
		<div className={ui.container}>
			{error && <p className={ui.err}>{error}</p>}
			{aviso && (
				<p className={ui.err} style={{ color: '#166534', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
					{aviso}
				</p>
			)}

			<div className={ui.tabBar}>
				<button
					type="button"
					className={`${ui.tabBtn} ${tab === 'importar' ? ui.tabBtnActive : ''}`}
					onClick={() => setTab('importar')}
				>
					<Upload size={15} strokeWidth={2.2} />
					Importar
				</button>
				<button
					type="button"
					className={`${ui.tabBtn} ${tab === 'historial' ? ui.tabBtnActive : ''}`}
					onClick={() => setTab('historial')}
				>
					<History size={15} strokeWidth={2.2} />
					Historial
				</button>
			</div>

			{tab === 'importar' && (
				<div className={ui.stack}>
					<section className={ui.productionShell}>
						{puedeImportar ? (
							<div className={ui.filtersBar}>
								<div className={ui.filtersBarLeft}>
									<div className={ui.filtersIcon}>
										<Filter size={16} />
									</div>
									<span className={ui.filtersPanelTitle}>Archivo</span>
								</div>

								<input
									ref={inputRef}
									type="file"
									accept=".xlsx,.xlsm,.xls"
									className={styles.inputArchivo}
									onChange={(e) => void elegirArchivo(e.target.files?.[0] ?? null)}
									disabled={cargando || aplicando}
								/>

								<button
									type="button"
									className={`${ui.btnApply} ${ui.filterBarBtn}`}
									onClick={() => inputRef.current?.click()}
									disabled={cargando || aplicando}
								>
									<FileSpreadsheet size={13} />
									{archivo ? 'Elegir otro' : 'Elegir Excel'}
								</button>

								<div className={ui.filterField}>
									<label className={ui.filterFieldLabel}>
										<FileSpreadsheet size={11} strokeWidth={2.5} aria-hidden />
										Archivo
									</label>
									<div className={ui.dateInput} title={archivo?.name || ''}>
										{archivo?.name || 'Ninguno'}
									</div>
								</div>

								<div className={ui.filterField}>
									<label className={ui.filterFieldLabel}>
										<BadgeCheck size={11} strokeWidth={2.5} aria-hidden />
										Estado
									</label>
									<select
										className={ui.dateInput}
										value={filtroEstado}
										onChange={(e) =>
											setFiltroEstado(e.target.value as 'TODOS' | EstadoFilaLiquidacion)
										}
										disabled={!preview}
									>
										<option value="TODOS">Todos</option>
										{(Object.keys(ETIQUETA_ESTADO) as EstadoFilaLiquidacion[]).map((estado) => {
											const cantidad = preview?.filas.filter((f) => f.estado === estado).length ?? 0;
											if (!preview || cantidad === 0) return null;
											return (
												<option key={estado} value={estado}>
													{ETIQUETA_ESTADO[estado]} ({cantidad})
												</option>
											);
										})}
									</select>
								</div>

								<button
									type="button"
									className={`${ui.btnApply} ${ui.filterBarBtn}`}
									disabled={
										aplicando ||
										!preview ||
										!!aplicado ||
										preview.resumen.aplicables === 0 ||
										(preview.resumen.rechazadas > 0 && !confirmarParcial)
									}
									onClick={() => void aplicar()}
								>
									<RefreshCw size={13} /> Aplicar
								</button>
								<button
									type="button"
									className={`${ui.btnGhost} ${ui.filterBarBtn}`}
									disabled={cargando || aplicando || !archivo}
									onClick={limpiar}
								>
									Limpiar
								</button>
							</div>
						) : (
							<div className={ui.empty}>
								Podés consultar el historial, pero importar requiere permiso de gestión.
							</div>
						)}

						<div className={ui.productionMain}>
							{(cargando || aplicando) && (
								<div className={ui.loaderWrap}>
									<Loader />
								</div>
							)}

							{!cargando && !aplicando && !preview && (
								<div className={ui.empty}>Elegí el Excel de liquidación para cruzarlo con la facturación.</div>
							)}

							{preview && !cargando && !aplicando && (
								<>
									<div className={ui.productionHeader}>
										<div>
											<span className={ui.sectionBadge}>
												<Receipt size={14} strokeWidth={2.5} aria-hidden />
												Cruce del archivo
											</span>
											<h2>Prácticas unificadas</h2>
											<p>
												Hoja <strong>{preview.hoja}</strong>
												{aplicado
													? ` · importación ${aplicado.idImport} aplicada`
													: ' · todavía no se escribió nada'}
											</p>
										</div>
									</div>

									<div className={ui.statsRow}>
										<div className={`${ui.statCard} ${ui.statCardPrimary}`}>
											<div className={ui.statIcon}>
												<Receipt size={18} />
											</div>
											<div className={ui.statBody}>
												<div className={ui.statLabel}>
													{aplicado ? 'Importe aplicado' : 'Importe a aplicar'}
												</div>
												<div className={`${ui.statValue} ${ui.statValueLarge}`}>
													$
													{formatImporte(
														aplicado?.importeAplicado ?? preview.resumen.importeAplicable,
													)}
												</div>
												<div className={ui.statHint}>
													{preview.resumen.aplicables} de {preview.resumen.filas} renglones
												</div>
											</div>
										</div>

										<div className={ui.statCard}>
											<div className={ui.statIcon}>
												<CheckCircle2 size={18} />
											</div>
											<div className={ui.statBody}>
												<div className={ui.statLabel}>Coinciden</div>
												<div className={ui.statValue}>{preview.resumen.aplicables}</div>
												<div className={ui.statHint}>
													{preview.resumen.sinCambio} ya tenían el importe
												</div>
											</div>
										</div>

										<div
											className={`${ui.statCard} ${
												preview.resumen.rechazadas > 0 ? ui.statCardDanger : ''
											}`}
										>
											<div className={ui.statIcon}>
												<ClipboardList size={18} />
											</div>
											<div className={ui.statBody}>
												<div className={ui.statLabel}>Sin aplicar</div>
												<div className={ui.statValue}>{preview.resumen.rechazadas}</div>
												<div className={ui.statHint}>
													Ambigüas, sin coincidencia o repetidas
												</div>
											</div>
										</div>
									</div>

									{preview.resumen.rechazadas > 0 && !aplicado && puedeImportar && (
										<label className={styles.checkbox}>
											<input
												type="checkbox"
												checked={confirmarParcial}
												onChange={(e) => setConfirmarParcial(e.target.checked)}
											/>
											<span>
												Aplicar solo los {preview.resumen.aplicables} renglones que coinciden e
												ignorar los {preview.resumen.rechazadas} restantes
											</span>
										</label>
									)}

									<div className={ui.tableHeaderRow}>
										<div>
											<h3 className={ui.tableSectionTitle}>Detalle de prácticas</h3>
											<p className={ui.tableSubtitle}>
												{filasVisibles.length} de {preview.resumen.filas} renglones del archivo
											</p>
										</div>
										<span className={ui.tableCount}>
											Mostrando {filasPaginadas.length} de {filasVisibles.length}
										</span>
									</div>

									{filasVisibles.length === 0 ? (
										<div className={ui.empty}>Sin renglones para ese filtro.</div>
									) : (
										<>
											<div className={ui.tableWrap}>
												<table className={ui.table}>
													<thead>
														<tr>
															<th>Profesional</th>
															<th>Visita</th>
															<th>Práctica</th>
															<th className={ui.num}>Facturado</th>
															<th className={ui.num}>Liquidado anterior</th>
															<th className={ui.num}>Liquidado</th>
															<th>Estado</th>
														</tr>
													</thead>
													<tbody>
														{filasPaginadas.map((f: FilaLiquidacion) => (
															<tr
																key={`${f.fila}-${f.idPrestacion ?? 'sin'}`}
																className={
																	f.estado === 'APLICADO' ? ui.rowValor : ui.rowSinValor
																}
															>
																<td>
																	<div className={ui.pacienteCell}>
																		<span className={ui.pacienteNombre}>
																			{f.profesional || 'Sin nombre'}
																		</span>
																		<span className={ui.pacienteDni}>
																			Mat. {f.matricula ?? '—'}
																		</span>
																	</div>
																</td>
																<td>
																	{f.numeroVisita ? (
																		<span className={ui.pacienteMeta}>
																			Visita {f.numeroVisita}
																		</span>
																	) : (
																		<span className={ui.amountMuted}>—</span>
																	)}
																</td>
																<td>
																	<div className={ui.practicaCell}>
																		<span className={ui.practicaCodeWrap}>
																			<span className={ui.practicaCode}>
																				{f.codigo || '—'}
																			</span>
																		</span>
																		{f.idPrestacion != null && (
																			<span className={ui.practicaFunc}>
																				IdPrestacion {f.idPrestacion}
																			</span>
																		)}
																	</div>
																</td>
																<td className={ui.num}>
																	{f.importeFinal != null ? (
																		<span className={ui.amount}>
																			${formatImporte(f.importeFinal)}
																		</span>
																	) : (
																		<span className={ui.amountMuted}>—</span>
																	)}
																</td>
																<td className={ui.num}>
																	{f.importeAnterior != null ? (
																		<span className={ui.amount}>
																			${formatImporte(f.importeAnterior)}
																		</span>
																	) : (
																		<span className={ui.amountMuted}>—</span>
																	)}
																</td>
																<td className={ui.num}>
																	{f.importeExcel != null ? (
																		<span className={ui.amountStrong}>
																			${formatImporte(f.importeExcel)}
																		</span>
																	) : (
																		<span className={ui.badgePending}>Sin liquidar</span>
																	)}
																</td>
																<td>
																	<span className={claseEstado(f.estado)}>
																		{ETIQUETA_ESTADO[f.estado]}
																	</span>
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
											<div className={ui.pagination}>
												<button
													type="button"
													className={ui.pageButton}
													disabled={paginaActual <= 1}
													onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
												>
													<ChevronLeft size={15} /> Anterior
												</button>
												<span className={ui.pageInfo}>
													Página {paginaActual} de {totalPaginas}
												</span>
												<button
													type="button"
													className={ui.pageButton}
													disabled={paginaActual >= totalPaginas}
													onClick={() =>
														setPaginaActual((p) => Math.min(totalPaginas, p + 1))
													}
												>
													Siguiente <ChevronRight size={15} />
												</button>
											</div>
										</>
									)}
								</>
							)}
						</div>
					</section>
				</div>
			)}

			{tab === 'historial' && (
				<div className={ui.stack}>
					<section className={ui.productionShell}>
						<div className={ui.productionMain}>
							<div className={ui.productionHeader}>
								<div>
									<span className={ui.sectionBadge}>
										<History size={14} strokeWidth={2.5} aria-hidden />
										Importaciones
									</span>
									<h2>Últimas liquidaciones</h2>
									<p>Archivos aplicados en esta empresa, con opción de revertir.</p>
								</div>
							</div>

							{historial.length === 0 ? (
								<div className={ui.empty}>Todavía no se importó ninguna liquidación en esta empresa.</div>
							) : (
								<div className={ui.tableWrap}>
									<table className={ui.table}>
										<thead>
											<tr>
												<th>Fecha</th>
												<th>Archivo</th>
												<th>Usuario</th>
												<th className={ui.num}>Aplicadas</th>
												<th className={ui.num}>Sin aplicar</th>
												<th className={ui.num}>Importe</th>
												<th>Estado</th>
												{puedeImportar && <th />}
											</tr>
										</thead>
										<tbody>
											{historial.map((imp) => (
												<tr key={imp.IdImport} className={ui.rowValor}>
													<td>
														<div className={ui.fechaCell}>
															<span>{formatFechaHora(imp.FechaHora)}</span>
														</div>
													</td>
													<td>
														<div className={ui.practicaCell}>
															<span className={ui.practicaDesc} title={imp.Archivo}>
																{imp.Archivo}
															</span>
															<span className={ui.practicaFunc}>#{imp.IdImport}</span>
														</div>
													</td>
													<td>
														<span className={ui.pacienteNombre}>{imp.Usuario || '—'}</span>
													</td>
													<td className={ui.num}>
														<span className={ui.qtyPill}>{imp.FilasAplicadas}</span>
													</td>
													<td className={ui.num}>{imp.FilasRechazadas}</td>
													<td className={ui.num}>
														<span className={ui.amountStrong}>
															${formatImporte(imp.ImporteAplicado)}
														</span>
													</td>
													<td>
														<span
															className={
																imp.Estado === 'REVERTIDO' ? ui.badgePending : ui.amountStrong
															}
														>
															{imp.Estado === 'REVERTIDO' ? 'Revertida' : 'Aplicada'}
														</span>
													</td>
													{puedeImportar && (
														<td>
															{imp.Estado === 'APLICADO' && (
																<button
																	type="button"
																	className={ui.btnGhost}
																	onClick={() => void revertir(imp.IdImport)}
																	disabled={revirtiendo === imp.IdImport}
																>
																	<RotateCcw size={14} /> Revertir
																</button>
															)}
														</td>
													)}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}
