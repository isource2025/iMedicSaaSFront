'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Calendar, Receipt, Table2, User } from 'lucide-react';
import Loader from '@/app/components/Loader/Loader';
import {
	miPerfilService,
	type ConvenioProduccionOption,
	type LineaValorizacion,
	type MiPerfilResponse,
	type ProduccionMesResponse,
} from '@/app/services/miPerfilService';
import styles from './profile.module.css';

type TabId = 'resumen' | 'produccion';

function defaultMonthRange() {
	const now = new Date();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	return { desde: `${yyyy}-${mm}-01`, hasta: `${yyyy}-${mm}-${dd}` };
}

function apiErrorMessage(e: unknown, fallback: string): string {
	if (typeof e === 'object' && e !== null && 'response' in e) {
		const res = (e as { response?: { data?: { mensaje?: unknown } } }).response;
		const m = res?.data?.mensaje;
		if (typeof m === 'string' && m.trim()) return m.trim();
	}
	if (e instanceof Error && e.message) return e.message;
	return fallback;
}

function formatImporte(n: number) {
	if (Number.isNaN(n)) return '—';
	return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLabel(key: string) {
	const spaced = key.replace(/([A-Z])/g, ' $1').trim();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function MiPerfilPage() {
	const def = defaultMonthRange();
	const [tab, setTab] = useState<TabId>('resumen');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [perfil, setPerfil] = useState<MiPerfilResponse['data'] | null>(null);

	const [fechaDesde, setFechaDesde] = useState(def.desde);
	const [fechaHasta, setFechaHasta] = useState(def.hasta);
	const [conveniosOptions, setConveniosOptions] = useState<ConvenioProduccionOption[]>([]);
	const [selectedConvenioIds, setSelectedConvenioIds] = useState<number[]>([]);

	const [loadProd, setLoadProd] = useState(false);
	const [prod, setProd] = useState<ProduccionMesResponse['data'] | null>(null);
	const [prodErr, setProdErr] = useState<string | null>(null);

	const fetchPerfil = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await miPerfilService.obtenerPerfil();
			if (!res.success) throw new Error('Respuesta inválida');
			setPerfil(res.data);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'No se pudo cargar el perfil';
			setError(msg);
			setPerfil(null);
		} finally {
			setLoading(false);
		}
	}, []);

	const cargarProduccionConFiltros = useCallback(
		async (desde: string, hasta: string, idsConvenio: number[]) => {
			setProdErr(null);
			setLoadProd(true);
			try {
				const idCsv = idsConvenio.length > 0 ? idsConvenio.join(',') : undefined;
				const [convRes, prodRes] = await Promise.all([
					miPerfilService.listarConveniosProduccion({ desde, hasta }),
					miPerfilService.obtenerProduccionMes({
						desde,
						hasta,
						...(idCsv ? { idConvenio: idCsv } : {}),
					}),
				]);
				if (!convRes.success) throw new Error('Respuesta inválida (obras sociales)');
				if (!prodRes.success) throw new Error('Respuesta inválida (producción)');
				setConveniosOptions(convRes.data.convenios);
				const validIds = idsConvenio.filter((id) =>
					convRes.data.convenios.some((c) => c.idConvenio === id),
				);
				setSelectedConvenioIds(validIds);
				setProd(prodRes.data);
			} catch (e: unknown) {
				setProdErr(apiErrorMessage(e, 'No se pudo cargar la producción'));
				setProd(null);
			} finally {
				setLoadProd(false);
			}
		},
		[],
	);

	useEffect(() => {
		fetchPerfil();
	}, [fetchPerfil]);

	useEffect(() => {
		if (tab !== 'produccion') return;
		void cargarProduccionConFiltros(fechaDesde, fechaHasta, selectedConvenioIds);
		// Solo al entrar a la pestaña: no depende de fechas ni convenios para permitir editar y aplicar después.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial al cambiar de pestaña
	}, [tab, cargarProduccionConFiltros]);

	const resumen = perfil?.resumenOperador;
	const personal = perfil?.personal as Record<string, unknown> | null | undefined;

	const entriesPersonal =
		personal && typeof personal === 'object'
			? Object.entries(personal).filter(([, v]) => v !== null && v !== undefined && v !== '')
			: [];

	return (
		<div className={styles.container}>
			<header className={styles.hero}>
				<div className={styles.heroInner}>
					<div className={styles.heroLeft}>
						<div className={styles.heroIconWrap} aria-hidden>
							<User size={26} strokeWidth={2} />
						</div>
						<div className={styles.heroText}>
							<h1 className={styles.heroTitle}>Mi perfil</h1>
							<p className={styles.heroSubtitle}>
								Datos del usuario conectado y producción valorizada; podés acotar por rango de fechas y por
								obra social.
							</p>
							<div className={styles.tabBar} role="tablist" aria-label="Secciones del perfil">
								<button
									type="button"
									role="tab"
									aria-selected={tab === 'resumen'}
									className={`${styles.tab} ${tab === 'resumen' ? styles.tabActive : ''}`}
									onClick={() => setTab('resumen')}
								>
									Resumen
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={tab === 'produccion'}
									className={`${styles.tab} ${tab === 'produccion' ? styles.tabActive : ''}`}
									onClick={() => setTab('produccion')}
								>
									Producción
								</button>
							</div>
						</div>
					</div>
				</div>
			</header>

			{loading && (
				<div className={styles.loaderWrap}>
					<Loader />
				</div>
			)}
			{error && <p className={styles.err}>{error}</p>}

			{!loading && tab === 'resumen' && perfil && (
				<div className={styles.stack}>
					<section className={styles.panel}>
						<div className={styles.panelHead}>
							<span className={styles.sectionBadge}>
								<Receipt size={14} strokeWidth={2.5} aria-hidden />
								Operador / legajo
							</span>
						</div>
						<div className={styles.panelBody}>
							{resumen ? (
								<div className={styles.fieldGrid}>
									<div className={styles.field}>
										<div className={styles.fieldLabel}>Valor personal</div>
										<div className={`${styles.fieldValue} ${styles.fieldMono}`}>
											{String(resumen.ValorPersonal)}
										</div>
									</div>
									<div className={styles.field}>
										<div className={styles.fieldLabel}>Cód. operador</div>
										<div className={`${styles.fieldValue} ${styles.fieldMono}`}>
											{String(resumen.CodOperador)}
										</div>
									</div>
									<div className={styles.field}>
										<div className={styles.fieldLabel}>Usuario (red)</div>
										<div className={styles.fieldValue}>{resumen.NombreRed}</div>
									</div>
									<div className={styles.field}>
										<div className={styles.fieldLabel}>Nombre</div>
										<div className={styles.fieldValue}>
											{[resumen.Nombres, resumen.Apellido].filter(Boolean).join(' ') || '—'}
										</div>
									</div>
									<div className={styles.field}>
										<div className={styles.fieldLabel}>Matrícula provincial</div>
										<div className={`${styles.fieldValue} ${styles.fieldMono}`}>
											{resumen.Matricula != null ? String(resumen.Matricula) : '—'}
										</div>
									</div>
									<div className={styles.field}>
										<div className={styles.fieldLabel}>Matrícula nacional</div>
										<div className={`${styles.fieldValue} ${styles.fieldMono}`}>
											{resumen.MatriculaNacional != null ? String(resumen.MatriculaNacional) : '—'}
										</div>
									</div>
									<div className={`${styles.field} ${styles.fieldFull}`}>
										<div className={styles.fieldLabel}>Apellido y nombre (imPersonal)</div>
										<div className={styles.fieldValue}>{resumen.ApellidoNombrePersonal || '—'}</div>
									</div>
								</div>
							) : (
								<p className={styles.err} style={{ margin: 0 }}>
									No se encontró registro en imPassword para este usuario.
								</p>
							)}
						</div>
					</section>

					<section className={styles.panel}>
						<div className={styles.panelHead}>
							<span className={styles.sectionBadge}>
								<Table2 size={14} strokeWidth={2.5} aria-hidden />
								Ficha completa (imPersonal)
							</span>
						</div>
						<div className={styles.panelBody}>
							{entriesPersonal.length ? (
								<div className={styles.fieldGrid}>
									{entriesPersonal.map(([k, v]) => (
										<div className={styles.field} key={k}>
											<div className={styles.fieldLabel}>{formatLabel(k)}</div>
											<div className={styles.fieldValue}>
												{typeof v === 'object' ? JSON.stringify(v) : String(v)}
											</div>
										</div>
									))}
								</div>
							) : (
								<div className={styles.empty}>No hay ficha de personal enlazada o está vacía.</div>
							)}
						</div>
					</section>
				</div>
			)}

			{tab === 'produccion' && (
				<div className={styles.stack}>
					<section className={styles.panel}>
						<div className={styles.panelHead}>
							<span className={styles.sectionBadge}>
								<Receipt size={14} strokeWidth={2.5} aria-hidden />
								Prácticas valorizadas
							</span>
							<span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>imFacDetalle</span>
						</div>
						<div className={styles.panelBody}>
							<div className={styles.filtersBar}>
								<div className={styles.filtersRow}>
									<div className={styles.filterGroup}>
										<span className={styles.filterGroupLabel}>
											<Calendar size={12} strokeWidth={2.5} aria-hidden style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
											Período
										</span>
										<div className={styles.dateInputs}>
											<label className={styles.dateField}>
												<span>Desde</span>
												<input
													type="date"
													className={styles.dateInput}
													value={fechaDesde}
													onChange={(ev) => setFechaDesde(ev.target.value)}
												/>
											</label>
											<label className={styles.dateField}>
												<span>Hasta</span>
												<input
													type="date"
													className={styles.dateInput}
													value={fechaHasta}
													onChange={(ev) => setFechaHasta(ev.target.value)}
												/>
											</label>
										</div>
									</div>
									<div className={`${styles.filterGroup} ${styles.conveniosBlock}`}>
										<span className={styles.filterGroupLabel}>
											<Building2 size={12} strokeWidth={2.5} aria-hidden style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
											Obra social / convenio
										</span>
										<p className={styles.filterHint} style={{ margin: '0 0 0.4rem' }}>
											Sin selección se muestran todas las del período. Podés elegir varias.
										</p>
										{loadProd && conveniosOptions.length === 0 ? (
											<p className={styles.filterHint}>Cargando obras sociales del período…</p>
										) : conveniosOptions.length === 0 ? (
											<p className={styles.filterHint}>
												No hay obras sociales con movimientos en este rango (o aún no aplicaste filtros).
											</p>
										) : (
											<div className={styles.conveniosScroll} role="group" aria-label="Filtro por obra social">
												{conveniosOptions.map((c) => {
													const checked = selectedConvenioIds.includes(c.idConvenio);
													return (
														<label key={c.idConvenio} className={styles.convenioRow}>
															<input
																type="checkbox"
																checked={checked}
																onChange={() => {
																	setSelectedConvenioIds((prev) =>
																		prev.includes(c.idConvenio)
																			? prev.filter((id) => id !== c.idConvenio)
																			: [...prev, c.idConvenio],
																	);
																}}
															/>
															<span>{c.obraSocial}</span>
														</label>
													);
												})}
											</div>
										)}
									</div>
								</div>
								<div className={styles.filterActions}>
									<button
										type="button"
										className={styles.btnApply}
										disabled={loadProd}
										onClick={() => void cargarProduccionConFiltros(fechaDesde, fechaHasta, selectedConvenioIds)}
									>
										Aplicar filtros
									</button>
									<button
										type="button"
										className={styles.btnGhost}
										disabled={loadProd}
										onClick={() => setSelectedConvenioIds([])}
									>
										Quitar obras sociales
									</button>
								</div>
							</div>

							{loadProd && (
								<div className={styles.loaderWrap}>
									<Loader />
								</div>
							)}
							{prodErr && <p className={styles.err}>{prodErr}</p>}
							{prod && !loadProd && (
								<>
									<p className={styles.periodoLine}>
										Período: <strong>{prod.periodo.desdeCalendario}</strong> al{' '}
										<strong>{prod.periodo.hastaCalendario}</strong>
										{prod.mensaje ? ` — ${prod.mensaje}` : ''}
									</p>
									{prod.filtros?.idConvenios?.length ? (
										<p className={styles.filterHint}>
											Filtro activo: {prod.filtros.idConvenios.length} obra(es) / convenio(s)
											seleccionado(s).
										</p>
									) : null}
									<div className={styles.statsRow}>
										<div className={styles.statCard}>
											<div className={styles.statLabel}>Líneas valorizadas</div>
											<div className={styles.statValue}>{prod.totales.lineas}</div>
											<div className={styles.statHint}>Registros en imFacDetalle</div>
										</div>
										<div className={styles.statCard}>
											<div className={styles.statLabel}>Suma importe final</div>
											<div className={styles.statValue}>{formatImporte(prod.totales.importeFinal)}</div>
											<div className={styles.statHint}>En unidades de la base</div>
										</div>
										<div className={styles.statCard}>
											<div className={styles.statLabel}>Suma cantidades</div>
											<div className={styles.statValue}>
												{prod.totales.cantidadSumada.toLocaleString('es-AR', {
													maximumFractionDigits: 4,
												})}
											</div>
											<div className={styles.statHint}>Total cantidad informada</div>
										</div>
									</div>

									<h3 className={styles.tableSectionTitle}>Detalle por prestación</h3>
									{(prod.valorizacion as LineaValorizacion[]).length === 0 ? (
										<div className={styles.empty}>Sin movimientos en el período seleccionado.</div>
									) : (
										<div className={styles.tableWrap}>
											<table className={styles.table}>
												<thead>
													<tr>
														<th>Id</th>
														<th>Fecha</th>
														<th>Obra social</th>
														<th>Visita</th>
														<th>Prestación</th>
														<th className={styles.num}>Cant.</th>
														<th className={styles.num}>%</th>
														<th className={styles.num}>Importe</th>
													</tr>
												</thead>
												<tbody>
													{(prod.valorizacion as LineaValorizacion[]).map((row) => (
														<tr key={row.id}>
															<td className={styles.fieldMono}>{row.id}</td>
															<td>{row.fecha || '—'}</td>
															<td>{row.obraSocial}</td>
															<td className={styles.fieldMono}>{row.numeroVisita}</td>
															<td>{row.descripcionPrestacion || '—'}</td>
															<td className={styles.num}>{Number(row.cantidad)}</td>
															<td className={styles.num}>{Number(row.porcentaje)}</td>
															<td className={styles.num}>{formatImporte(Number(row.importeFinal))}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}

									<div className={styles.spacerSection}>
										<h3 className={styles.tableSectionTitle}>Prácticas cabecera relacionadas</h3>
										<p className={styles.tableHint}>
											imFacPracticas — mismas líneas con detalle valorizado en el rango (por IDPRACTICA =
											Valor).
										</p>
										{prod.practicasCabecera.length === 0 ? (
											<div className={styles.empty}>Sin cabeceras vinculadas en el período.</div>
										) : (
											<div className={styles.tableWrap}>
												<table className={styles.table}>
													<thead>
														<tr>
															<th>Id (Valor)</th>
															<th>Visita</th>
															<th>Fecha práctica</th>
															<th>Descripción</th>
															<th className={styles.num}>Cant.</th>
															<th>Conv.</th>
														</tr>
													</thead>
													<tbody>
														{prod.practicasCabecera.map((p) => (
															<tr key={String(p.id)}>
																<td className={styles.fieldMono}>{String(p.id)}</td>
																<td className={styles.fieldMono}>{String(p.numeroVisita ?? '')}</td>
																<td>{String(p.fechaPractica ?? '—')}</td>
																<td>{String(p.descPractica ?? '')}</td>
																<td className={styles.num}>{String(p.cantidadPractica ?? '')}</td>
																<td className={styles.fieldMono}>{String(p.idConvenio ?? '—')}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										)}
									</div>
								</>
							)}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}
