'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Activity,
	AlertTriangle,
	Boxes,
	ChevronLeft,
	ChevronRight,
	CircleSlash,
	DollarSign,
	History,
	PackagePlus,
	PackageX,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	SlidersHorizontal,
	Tags,
	TrendingUp,
	Trash2,
	Warehouse,
} from 'lucide-react';
import { almacenStockService } from '@/app/services/almacenStockService';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useToast } from '@/app/components/UI/ToastProvider';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { mensajeDeError } from '@/app/utils/apiError';
import type {
	ExistenciaStock,
	ExistenciasEstadoFiltro,
	ExistenciasOrden,
	ExistenciasResumen,
	RemitoDeposito,
} from '@/app/types/almacenStock';
import {
	ActividadChart,
	BarList,
	COLOR_ESTADO,
	Card,
	ChartsRow,
	Donut,
	EstadoBadge,
	FotoProducto,
	Kpi,
	KpiGrid,
	NivelBar,
	Segmented,
	Skeleton,
	fmtCompact,
	fmtMoney,
	fmtNum,
} from '../AlmacenVisual';
import { AjusteStockModal, AltaStockModal, KardexModal, ParametrosStockModal } from './StockModals';
import styles from '../stock.module.css';

const ORDEN_OPTS: { value: ExistenciasOrden; label: string }[] = [
	{ value: 'critico', label: 'Más críticos' },
	{ value: 'deposito', label: 'Depósito' },
	{ value: 'producto', label: 'Producto' },
	{ value: 'cantidad', label: 'Mayor cantidad' },
	{ value: 'reciente', label: 'Más recientes' },
];

function marcasDe(r: ExistenciaStock) {
	const techo = r.StockMaximo || (r.StockMinimo ? r.StockMinimo * 2 : 0);
	if (!techo) return { marcaMin: null, marcaPunto: null };
	return {
		marcaMin: Math.round(((r.StockMinimo || 0) / techo) * 100),
		marcaPunto: Math.round(((r.PuntoPedido || 0) / techo) * 100),
	};
}

export default function StockClient() {
	const { puede, loaded } = usePermiso();
	const toast = useToast();
	const puedeVer = loaded && puede('ALMACEN.STOCK.VER');
	const puedeCrear = puede('ALMACEN.STOCK.CREAR');
	const puedeEditar = puede('ALMACEN.STOCK.EDITAR');
	const puedeEliminar = puede('ALMACEN.STOCK.ELIMINAR');
	const puedeAjustar = puede('ALMACEN.STOCK.GESTIONAR');

	const [search, setSearch] = useState('');
	const [searchDebounced, setSearchDebounced] = useState('');
	const [depFiltro, setDepFiltro] = useState<number | ''>('');
	const [rubroFiltro, setRubroFiltro] = useState<number | ''>('');
	const [estado, setEstado] = useState<ExistenciasEstadoFiltro>('');
	const [orden, setOrden] = useState<ExistenciasOrden>('critico');
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [items, setItems] = useState<ExistenciaStock[]>([]);
	const [agrupadoPorProducto, setAgrupadoPorProducto] = useState(true);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [depositos, setDepositos] = useState<RemitoDeposito[]>([]);
	const [rubros, setRubros] = useState<{ IdRubro: number; Descripcion: string }[]>([]);
	const [resumen, setResumen] = useState<ExistenciasResumen | null>(null);

	const [altaOpen, setAltaOpen] = useState(false);
	const [paramFila, setParamFila] = useState<ExistenciaStock | null>(null);
	const [ajusteFila, setAjusteFila] = useState<ExistenciaStock | null>(null);
	const [kardex, setKardex] = useState<{ open: boolean; fila: ExistenciaStock | null }>({ open: false, fila: null });

	useEffect(() => {
		const t = setTimeout(() => {
			setSearchDebounced(search.trim());
			setPage(1);
		}, 350);
		return () => clearTimeout(t);
	}, [search]);

	useEffect(() => {
		if (!puedeVer) return;
		almacenStockService
			.catalogosExistencias()
			.then((c) => {
				setDepositos(c.depositos || []);
				setRubros(c.rubros || []);
			})
			.catch(() => setDepositos([]));
	}, [puedeVer]);

	const cargar = useCallback(async () => {
		if (!puedeVer) return;
		setLoading(true);
		setError(null);
		try {
			const data = await almacenStockService.listarExistencias({
				search: searchDebounced || undefined,
				idDeposito: depFiltro === '' ? undefined : Number(depFiltro),
				idRubro: rubroFiltro === '' ? undefined : Number(rubroFiltro),
				estado,
				orden,
				page,
				pageSize: 40,
			});
			setItems(data.items || []);
			setAgrupadoPorProducto(Boolean(data.agrupadoPorProducto ?? depFiltro === ''));
			setTotal(data.total || 0);
			setTotalPages(data.totalPages || 1);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo cargar el stock'));
			setItems([]);
			setAgrupadoPorProducto(depFiltro === '');
		} finally {
			setLoading(false);
		}
	}, [puedeVer, searchDebounced, depFiltro, rubroFiltro, estado, orden, page]);

	const cargarResumen = useCallback(() => {
		if (!puedeVer) return;
		almacenStockService
			.resumenExistencias(depFiltro === '' ? undefined : Number(depFiltro))
			.then(setResumen)
			.catch(() => setResumen(null));
	}, [puedeVer, depFiltro]);

	useEffect(() => {
		void cargar();
	}, [cargar]);

	useEffect(() => {
		cargarResumen();
	}, [cargarResumen]);

	const refrescar = () => {
		void cargar();
		cargarResumen();
	};

	const filtrar = (fn: () => void) => {
		fn();
		setPage(1);
	};

	const toggleEstado = (e: ExistenciasEstadoFiltro) => filtrar(() => setEstado(estado === e ? '' : e));

	const quitar = async (r: ExistenciaStock) => {
		if (r.IdDeposito == null) return;
		if (!window.confirm(`¿Quitar «${r.Descripcion}» del depósito ${r.DepositoNombre}? El historial de movimientos se conserva.`)) return;
		try {
			await almacenStockService.eliminarExistencia({ ...r, IdDeposito: r.IdDeposito });
			toast.success('Producto quitado del depósito');
			refrescar();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo quitar'));
		}
	};

	const depositoOptions = useMemo(
		() => [
			{ value: '', label: 'Todos los depósitos' },
			...depositos.map((d) => ({ value: d.IdDeposito, label: d.Descripcion || String(d.IdDeposito) })),
		],
		[depositos],
	);
	const rubroOptions = useMemo(
		() => [{ value: '', label: 'Todos los rubros' }, ...rubros.map((r) => ({ value: r.IdRubro, label: r.Descripcion }))],
		[rubros],
	);

	if (loaded && !puedeVer) {
		return <p className={styles.empty}>No tenés permiso para ver el stock.</p>;
	}

	const r = resumen;

	return (
		<div className={styles.wrap}>
			<header className={styles.header}>
				<div className={styles.titleLeft}>
					<div className={styles.titleIcon}>
						<Boxes size={22} aria-hidden />
					</div>
					<div className={styles.titleBlock}>
						<h1>Stock</h1>
						<p>
							Existencias por depósito (dbo.Stock)
							{depFiltro !== '' ? ` · ${depositos.find((d) => d.IdDeposito === depFiltro)?.Descripcion || ''}` : ''}
						</p>
					</div>
				</div>
				<div className={styles.headerActions}>
					<button type="button" className={styles.btnGhost} onClick={() => setKardex({ open: true, fila: null })}>
						<History size={15} aria-hidden />
						Movimientos
					</button>
					<button type="button" className={styles.btnGhost} onClick={refrescar} disabled={loading}>
						<RefreshCw size={15} aria-hidden />
						Actualizar
					</button>
					{puedeCrear ? (
						<button type="button" className={styles.btnPrimary} onClick={() => setAltaOpen(true)}>
							<Plus size={15} aria-hidden />
							Alta en depósito
						</button>
					) : null}
				</div>
			</header>

			{error ? <div className={styles.error}>{error}</div> : null}

			{r ? (
				<KpiGrid>
					<Kpi
						label="Con stock"
						value={fmtNum(r.conStock, 0)}
						hint={`de ${fmtNum(r.filas, 0)} altas · ${fmtNum(r.productos, 0)} productos`}
						pct={r.pctConStock}
						activo={estado === 'con'}
						onClick={() => toggleEstado('con')}
					/>
					<Kpi
						label="Sin stock"
						value={fmtNum(r.sinStock, 0)}
						hint="cantidad en cero"
						icon={<CircleSlash size={22} />}
						tono="danger"
						activo={estado === 'sin'}
						onClick={() => toggleEstado('sin')}
					/>
					<Kpi
						label="Bajo mínimo"
						value={fmtNum(r.bajoMinimo, 0)}
						hint="por debajo del mínimo"
						icon={<AlertTriangle size={22} />}
						tono="warn"
						activo={estado === 'bajo'}
						onClick={() => toggleEstado('bajo')}
					/>
					<Kpi
						label="A reponer"
						value={fmtNum(r.aReponer, 0)}
						hint="en punto de pedido"
						icon={<PackagePlus size={22} />}
						tono="warn"
						activo={estado === 'reponer'}
						onClick={() => toggleEstado('reponer')}
					/>
					<Kpi
						label="Exceso"
						value={fmtNum(r.exceso, 0)}
						hint="sobre el máximo"
						icon={<TrendingUp size={22} />}
						tono="violet"
						activo={estado === 'exceso'}
						onClick={() => toggleEstado('exceso')}
					/>
					<Kpi
						label="Valorizado"
						value={fmtMoney(r.valorizado)}
						hint={`${fmtCompact(r.unidades)} unidades a costo`}
						icon={<DollarSign size={22} />}
						tono="ok"
					/>
				</KpiGrid>
			) : (
				<Skeleton alto={84} />
			)}

			{r ? (
				<ChartsRow>
					<Card title="Entradas y salidas · 30 días" icon={<Activity size={15} />}>
						<ActividadChart data={r.actividad} />
					</Card>
					<Card title="Salud del stock" icon={<AlertTriangle size={15} />}>
						<BarList
							total={r.filas}
							formato={(v) => `${fmtNum(v, 0)} · ${Math.round((v / Math.max(1, r.filas)) * 100)}%`}
							items={[
								{ key: 'con', label: 'Con stock', value: r.conStock, color: COLOR_ESTADO.ok, onClick: () => toggleEstado('con') },
								{ key: 'sin', label: 'Sin stock', value: r.sinStock, color: COLOR_ESTADO.sin, onClick: () => toggleEstado('sin') },
								{ key: 'bajo', label: 'Bajo mínimo', value: r.bajoMinimo, color: COLOR_ESTADO.bajo, onClick: () => toggleEstado('bajo') },
								{ key: 'rep', label: 'A reponer', value: r.aReponer, color: COLOR_ESTADO.reponer, onClick: () => toggleEstado('reponer') },
								{ key: 'exc', label: 'Exceso', value: r.exceso, color: COLOR_ESTADO.exceso, onClick: () => toggleEstado('exceso') },
								{
									key: 'par',
									label: 'Con parámetros de reposición',
									value: r.conParametros,
									color: '#0083a9',
									sub: `${r.pctConParametros}% tiene mínimo, máximo o punto de pedido`,
								},
							]}
						/>
					</Card>
				</ChartsRow>
			) : null}

			{r && (r.porDeposito.length > 1 || r.porRubro.length > 0) ? (
				<ChartsRow>
					{r.porDeposito.length > 1 ? (
						<Card title="Depósitos con más productos en stock" icon={<Warehouse size={15} />}>
							<BarList
								items={r.porDeposito.map((d) => ({
									key: d.IdDeposito,
									label: d.Descripcion,
									value: d.conStock,
									sub: `${fmtCompact(d.unidades)} u. · ${fmtMoney(d.valorizado)}${d.bajoMinimo ? ` · ${d.bajoMinimo} bajo mínimo` : ''}`,
									onClick: () => filtrar(() => setDepFiltro(depFiltro === d.IdDeposito ? '' : d.IdDeposito)),
								}))}
								formato={(v) => `${fmtNum(v, 0)} prod.`}
							/>
						</Card>
					) : null}
					<Card title="Valorizado por rubro" icon={<Tags size={15} />}>
						<Donut
							data={r.porRubro.map((x) => ({ name: x.Descripcion, value: x.valorizado }))}
							centro={fmtCompact(r.valorizado)}
							centroLabel="$ total"
							onSelect={(d) => {
								const x = r.porRubro.find((y) => y.Descripcion === d.name);
								if (x?.IdRubro != null) filtrar(() => setRubroFiltro(rubroFiltro === x.IdRubro ? '' : (x.IdRubro as number)));
							}}
						/>
					</Card>
				</ChartsRow>
			) : null}

			<div className={styles.toolbar}>
				<div className={styles.searchRow}>
					<Search size={16} color="#64748b" />
					<input
						className={styles.searchInput}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Producto, código, barra o ubicación…"
						aria-label="Buscar en stock"
					/>
					<div className={styles.toolbarSelect}>
						<CustomSelect
							label=""
							name="stock-dep"
							value={depFiltro}
							compact
							onChange={(v) => filtrar(() => setDepFiltro(v === '' || v == null ? '' : Number(v)))}
							options={depositoOptions}
						/>
					</div>
					<div className={styles.toolbarSelect}>
						<CustomSelect
							label=""
							name="stock-rubro"
							value={rubroFiltro}
							compact
							onChange={(v) => filtrar(() => setRubroFiltro(v === '' || v == null ? '' : Number(v)))}
							options={rubroOptions}
						/>
					</div>
					<div className={styles.toolbarSelectSm}>
						<CustomSelect
							label=""
							name="stock-orden"
							value={orden}
							compact
							onChange={(v) => filtrar(() => setOrden((v as ExistenciasOrden) || 'critico'))}
							options={ORDEN_OPTS}
						/>
					</div>
				</div>
				<div className={styles.filtrosRow}>
					<Segmented<ExistenciasEstadoFiltro>
						value={estado}
						onChange={(v) => filtrar(() => setEstado(v))}
						opciones={[
							{ value: '', label: 'Todos', count: r?.filas },
							{ value: 'con', label: 'Con stock', count: r?.conStock },
							{ value: 'sin', label: 'Sin stock', count: r?.sinStock },
							{ value: 'bajo', label: 'Bajo mínimo', count: r?.bajoMinimo },
							{ value: 'reponer', label: 'A reponer', count: r?.aReponer },
							{ value: 'exceso', label: 'Exceso', count: r?.exceso },
							{ value: 'sinParametros', label: 'Sin parámetros', count: r ? r.filas - r.conParametros : null },
						]}
					/>
				</div>
			</div>

			<section className={styles.panel}>
				<div className={styles.tableWrap}>
					{loading && !items.length ? (
						<div className={styles.empty}>Cargando stock…</div>
					) : items.length === 0 ? (
						<div className={styles.empty}>
							<PackageX size={28} />
							<div>Sin existencias para el filtro actual.</div>
						</div>
					) : (
						<table className={styles.table}>
							<thead>
								<tr>
									<th />
									<th>Producto</th>
									<th>{agrupadoPorProducto ? 'Alcance' : 'Depósito'}</th>
									<th style={{ minWidth: 170 }}>Nivel</th>
									<th style={{ textAlign: 'right' }}>Físico</th>
									<th style={{ textAlign: 'right' }}>Mín · Punto · Máx</th>
									<th>Estado</th>
									<th className={styles.colActions}>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{items.map((row) => {
									const porDeposito = row.IdDeposito != null;
									return (
									<tr
										key={
											porDeposito
												? `${row.IdEmpresa}-${row.IdSucursal}-${row.IdDeposito}-${row.IdProducto}`
												: `prod-${row.IdProducto}`
										}
									>
										<td className={styles.colFoto}>
											<FotoProducto id={row.IdProducto} tieneFoto={row.TieneFoto} rubro={row.RubroNombre} size={38} />
										</td>
										<td>
											<div className={styles.celdaTitulo}>{row.Descripcion}</div>
											<div className={styles.muted}>
												<span className={styles.mono}>#{row.IdProducto}</span>
												{row.CodAlternativo ? ` · ${row.CodAlternativo}` : ''}
												{row.RubroNombre ? ` · ${row.RubroNombre}` : ''}
											</div>
										</td>
										<td>
											<div>{row.DepositoNombre}</div>
											{row.Ubicacion ? <div className={styles.muted}>{row.Ubicacion}</div> : null}
										</td>
										<td>
											<NivelBar pct={row.nivelPct} estado={row.estado} {...marcasDe(row)} />
										</td>
										<td style={{ textAlign: 'right' }}>
											<strong className={styles.mono}>{fmtNum(row.CantFisico)}</strong>
											<div className={styles.muted}>{row.UnidadNombre || row.IdUnidad || ''}</div>
										</td>
										<td className={`${styles.mono} ${styles.muted}`} style={{ textAlign: 'right' }}>
											{row.StockMinimo || row.PuntoPedido || row.StockMaximo
												? `${fmtNum(row.StockMinimo)} · ${fmtNum(row.PuntoPedido)} · ${fmtNum(row.StockMaximo)}`
												: '—'}
										</td>
										<td>
											<EstadoBadge estado={row.estado} />
										</td>
										<td className={styles.colActions}>
											<div className={styles.rowActions}>
												<button
													type="button"
													className={styles.actionEdit}
													title="Kardex"
													aria-label={`Kardex de ${row.Descripcion}`}
													onClick={() => setKardex({ open: true, fila: row })}
												>
													<History size={16} />
												</button>
												{puedeAjustar && porDeposito ? (
													<button
														type="button"
														className={styles.actionEdit}
														title="Ajustar cantidad"
														aria-label={`Ajustar ${row.Descripcion}`}
														onClick={() => setAjusteFila(row)}
													>
														<SlidersHorizontal size={16} />
													</button>
												) : null}
												{puedeEditar && porDeposito ? (
													<button
														type="button"
														className={styles.actionEdit}
														title="Parámetros"
														aria-label={`Parámetros de ${row.Descripcion}`}
														onClick={() => setParamFila(row)}
													>
														<Pencil size={16} />
													</button>
												) : null}
												{puedeEliminar && porDeposito ? (
													<button
														type="button"
														className={styles.actionDelete}
														title={row.CantFisico ? 'Ajustá a 0 para quitarlo' : 'Quitar del depósito'}
														aria-label={`Quitar ${row.Descripcion} del depósito`}
														disabled={Math.abs(row.CantFisico) > 0.0001 || Math.abs(row.CantDisp) > 0.0001}
														onClick={() => void quitar(row)}
													>
														<Trash2 size={16} />
													</button>
												) : null}
											</div>
										</td>
									</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>
				<div className={styles.pager}>
					<span className={styles.muted}>
						{total.toLocaleString('es-AR')} {agrupadoPorProducto ? 'productos' : 'registros'} · pág. {page}/{totalPages}
					</span>
					<div className={styles.pagerBtns}>
						<button
							type="button"
							className={styles.btnGhost}
							disabled={page <= 1 || loading}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							<ChevronLeft size={16} />
						</button>
						<button
							type="button"
							className={styles.btnGhost}
							disabled={page >= totalPages || loading}
							onClick={() => setPage((p) => p + 1)}
						>
							<ChevronRight size={16} />
						</button>
					</div>
				</div>
			</section>

			<AltaStockModal
				isOpen={altaOpen}
				onClose={() => setAltaOpen(false)}
				onGuardado={refrescar}
				depositos={depositos}
				depositoInicial={depFiltro}
			/>
			<ParametrosStockModal fila={paramFila} onClose={() => setParamFila(null)} onGuardado={refrescar} />
			<AjusteStockModal fila={ajusteFila} onClose={() => setAjusteFila(null)} onGuardado={refrescar} />
			<KardexModal
				isOpen={kardex.open}
				fila={kardex.fila}
				idDeposito={depFiltro === '' ? undefined : Number(depFiltro)}
				onClose={() => setKardex({ open: false, fila: null })}
			/>
		</div>
	);
}
