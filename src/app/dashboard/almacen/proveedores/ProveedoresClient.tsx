'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Ban,
	BadgeCheck,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileText,
	LayoutGrid,
	List,
	Mail,
	MapPin,
	Package,
	PauseCircle,
	Pencil,
	Phone,
	PlayCircle,
	Plus,
	RefreshCw,
	Search,
	Sparkles,
	Trash2,
	Trophy,
	Truck,
	Users,
} from 'lucide-react';
import { almacenStockService } from '@/app/services/almacenStockService';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useToast } from '@/app/components/UI/ToastProvider';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { mensajeDeError } from '@/app/utils/apiError';
import type {
	EstadoProveedor,
	ProveedorClarion,
	ProveedoresCatalogos,
	ProveedoresOrden,
	ProveedoresResumen,
} from '@/app/types/almacenStock';
import {
	Avatar,
	BarList,
	Card,
	ChartsRow,
	Donut,
	Kpi,
	KpiGrid,
	Pill,
	Segmented,
	Skeleton,
	fmtFecha,
	fmtMoney,
	fmtNum,
} from '../AlmacenVisual';
import ProveedorModal, { COLOR_ESTADO_PROV, LABEL_ESTADO_PROV } from './ProveedorModal';
import styles from '../stock.module.css';

const ORDEN_OPTS: { value: ProveedoresOrden; label: string }[] = [
	{ value: 'nombre', label: 'Razón social' },
	{ value: 'actividad', label: 'Más remitos' },
	{ value: 'reciente', label: 'Alta más reciente' },
	{ value: 'codigo', label: 'Código' },
];

type EstadoFiltro = '' | '1' | '2' | '3';

export default function ProveedoresClient() {
	const { puede, loaded } = usePermiso();
	const toast = useToast();
	const puedeVer = loaded && puede('ALMACEN.PROVEEDORES.VER');
	const puedeCrear = puede('ALMACEN.PROVEEDORES.CREAR');
	const puedeEditar = puede('ALMACEN.PROVEEDORES.EDITAR');
	const puedeEliminar = puede('ALMACEN.PROVEEDORES.ELIMINAR');

	const [search, setSearch] = useState('');
	const [searchDebounced, setSearchDebounced] = useState('');
	const [estado, setEstado] = useState<EstadoFiltro>('1');
	const [tipo, setTipo] = useState<number | ''>('');
	const [orden, setOrden] = useState<ProveedoresOrden>('nombre');
	const [vista, setVista] = useState<'tarjetas' | 'tabla'>('tarjetas');
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [items, setItems] = useState<ProveedorClarion[]>([]);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [resumen, setResumen] = useState<ProveedoresResumen | null>(null);
	const [catalogos, setCatalogos] = useState<ProveedoresCatalogos | null>(null);
	const [modal, setModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

	useEffect(() => {
		const t = setTimeout(() => {
			setSearchDebounced(search.trim());
			setPage(1);
		}, 300);
		return () => clearTimeout(t);
	}, [search]);

	const cargar = useCallback(async () => {
		if (!puedeVer) return;
		setLoading(true);
		setError(null);
		try {
			const data = await almacenStockService.listarProveedoresClarion({
				search: searchDebounced || undefined,
				estado: estado === '' ? null : (Number(estado) as EstadoProveedor),
				idTipo: tipo === '' ? null : tipo,
				orden,
				page,
				pageSize: vista === 'tarjetas' ? 24 : 40,
			});
			setItems(data.items || []);
			setTotal(data.total || 0);
			setTotalPages(data.totalPages || 1);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudieron cargar los proveedores'));
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [puedeVer, searchDebounced, estado, tipo, orden, page, vista]);

	const cargarResumen = useCallback(() => {
		if (!puedeVer) return;
		almacenStockService
			.resumenProveedores()
			.then(setResumen)
			.catch(() => setResumen(null));
	}, [puedeVer]);

	useEffect(() => {
		void cargar();
	}, [cargar]);

	useEffect(() => {
		cargarResumen();
		if (puedeVer) {
			almacenStockService
				.catalogosProveedores()
				.then(setCatalogos)
				.catch(() => setCatalogos(null));
		}
	}, [cargarResumen, puedeVer]);

	const refrescar = () => {
		void cargar();
		cargarResumen();
	};

	const filtrar = (fn: () => void) => {
		fn();
		setPage(1);
	};

	const cambiarEstado = async (p: ProveedorClarion, nuevo: EstadoProveedor) => {
		const accion = nuevo === 1 ? 'reactivar' : nuevo === 2 ? 'suspender' : 'dar de baja';
		if (nuevo !== 1 && !window.confirm(`¿${accion[0].toUpperCase()}${accion.slice(1)} a «${p.Descripcion}»?`)) return;
		try {
			await almacenStockService.estadoProveedor(p.IdProveedor, nuevo);
			toast.success(`Proveedor ${nuevo === 1 ? 'reactivado' : nuevo === 2 ? 'suspendido' : 'dado de baja'}`);
			refrescar();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo cambiar el estado'));
		}
	};

	const eliminar = async (p: ProveedorClarion) => {
		if (
			!window.confirm(
				`¿Eliminar a «${p.Descripcion}»?\n\nSi tiene remitos, compras o cuenta corriente se da de baja en lugar de borrarse.`,
			)
		)
			return;
		try {
			const r = await almacenStockService.eliminarProveedor(p.IdProveedor);
			if (r.modo === 'baja') toast.warning('Tenía movimientos: se dio de baja en lugar de borrarse');
			else toast.success('Proveedor eliminado');
			refrescar();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo eliminar'));
		}
	};

	const tipoOptions = useMemo(
		() => [
			{ value: '', label: 'Todos los tipos' },
			...(catalogos?.tipos || []).map((t) => ({ value: t.IdTipoProv, label: t.Descripcion })),
		],
		[catalogos],
	);

	if (loaded && !puedeVer) {
		return <p className={styles.empty}>No tenés permiso para ver proveedores.</p>;
	}

	const r = resumen;

	const acciones = (p: ProveedorClarion) => (
		<div className={styles.rowActions}>
			<button
				type="button"
				className={styles.actionEdit}
				title={puedeEditar ? 'Editar' : 'Ver'}
				aria-label={`${puedeEditar ? 'Editar' : 'Ver'} ${p.Descripcion}`}
				onClick={() => setModal({ open: true, id: p.IdProveedor })}
			>
				{puedeEditar ? <Pencil size={16} /> : <FileText size={16} />}
			</button>
			{puedeEditar && p.IdStatus !== 3 ? (
				p.IdStatus === 2 ? (
					<button type="button" className={styles.actionEdit} title="Reactivar" aria-label={`Reactivar ${p.Descripcion}`} onClick={() => void cambiarEstado(p, 1)}>
						<PlayCircle size={16} />
					</button>
				) : (
					<button type="button" className={styles.actionEdit} title="Suspender" aria-label={`Suspender ${p.Descripcion}`} onClick={() => void cambiarEstado(p, 2)}>
						<PauseCircle size={16} />
					</button>
				)
			) : null}
			{puedeEditar && p.IdStatus === 3 ? (
				<button type="button" className={styles.actionEdit} title="Reactivar" aria-label={`Reactivar ${p.Descripcion}`} onClick={() => void cambiarEstado(p, 1)}>
					<PlayCircle size={16} />
				</button>
			) : null}
			{puedeEliminar && p.IdStatus !== 3 ? (
				<button type="button" className={styles.actionDelete} title="Eliminar" aria-label={`Eliminar ${p.Descripcion}`} onClick={() => void eliminar(p)}>
					<Trash2 size={16} />
				</button>
			) : null}
		</div>
	);

	return (
		<div className={styles.wrap}>
			<header className={styles.header}>
				<div className={styles.titleLeft}>
					<div className={styles.titleIcon}>
						<Truck size={22} aria-hidden />
					</div>
					<div className={styles.titleBlock}>
						<h1>Proveedores</h1>
						<p>dbo.PROVEEDORES · teléfonos, contactos, productos y observaciones</p>
					</div>
				</div>
				<div className={styles.headerActions}>
					<button type="button" className={styles.btnGhost} onClick={refrescar} disabled={loading}>
						<RefreshCw size={15} aria-hidden />
						Actualizar
					</button>
					{puedeCrear ? (
						<button type="button" className={styles.btnPrimary} onClick={() => setModal({ open: true, id: null })}>
							<Plus size={15} aria-hidden />
							Nuevo proveedor
						</button>
					) : null}
				</div>
			</header>

			{error ? <div className={styles.error}>{error}</div> : null}

			{r ? (
				<KpiGrid>
					<Kpi
						label="Proveedores"
						value={fmtNum(r.total, 0)}
						hint={`${fmtNum(r.nuevos90, 0)} nuevos en 90 días`}
						icon={<Users size={22} />}
						activo={estado === ''}
						onClick={() => filtrar(() => setEstado(''))}
					/>
					<Kpi
						label="Activos"
						value={fmtNum(r.activos, 0)}
						hint="habilitados"
						pct={r.pctActivos}
						tono="ok"
						activo={estado === '1'}
						onClick={() => filtrar(() => setEstado('1'))}
					/>
					<Kpi
						label="Suspendidos"
						value={fmtNum(r.suspendidos, 0)}
						hint="temporalmente"
						icon={<PauseCircle size={22} />}
						tono="warn"
						activo={estado === '2'}
						onClick={() => filtrar(() => setEstado('2'))}
					/>
					<Kpi
						label="De baja"
						value={fmtNum(r.bajas, 0)}
						hint="sin operar"
						icon={<Ban size={22} />}
						tono="danger"
						activo={estado === '3'}
						onClick={() => filtrar(() => setEstado('3'))}
					/>
					<Kpi label="Con CUIT" value={fmtNum(r.conCuit, 0)} hint="identificación fiscal" pct={r.pctConCuit} tono="violet" />
					<Kpi
						label="Con remitos"
						value={fmtNum(r.conRemitos, 0)}
						hint="operaron alguna vez"
						pct={r.total ? Math.round((r.conRemitos / r.total) * 100) : 0}
						tono="brand"
					/>
				</KpiGrid>
			) : (
				<Skeleton alto={84} />
			)}

			{r ? (
				<ChartsRow>
					<Card title="Por tipo de proveedor" icon={<Sparkles size={15} />}>
						<Donut
							data={r.porTipo.map((t) => ({ name: t.Descripcion, value: t.cantidad }))}
							centro={fmtNum(r.total, 0)}
							centroLabel="proveedores"
							onSelect={(d) => {
								const t = r.porTipo.find((x) => x.Descripcion === d.name);
								if (t?.IdTipoProv != null) filtrar(() => setTipo(tipo === t.IdTipoProv ? '' : (t.IdTipoProv as number)));
							}}
						/>
					</Card>
					<Card title="Más activos (remitos)" icon={<Trophy size={15} />}>
						<BarList
							formato={(v) => `${fmtNum(v, 0)} rem.`}
							items={r.top.map((t) => ({
								key: t.IdProveedor,
								label: t.Descripcion,
								value: t.remitos,
								sub: `${fmtMoney(t.importe)} · último ${fmtFecha(t.ultimo)}`,
								onClick: () => setModal({ open: true, id: t.IdProveedor }),
							}))}
							vacio="Todavía no hay remitos de proveedores"
						/>
					</Card>
					<Card title="Calidad de datos" icon={<BadgeCheck size={15} />}>
						<BarList
							total={r.total}
							formato={(v) => `${Math.round((v / Math.max(1, r.total)) * 100)}%`}
							items={[
								{ key: 'cuit', label: 'CUIT cargado', value: r.conCuit, color: '#8b5cf6' },
								{ key: 'email', label: 'Email cargado', value: r.conEmail, color: '#0083a9' },
								{ key: 'dom', label: 'Domicilio cargado', value: r.conDomicilio, color: '#22c55e' },
							]}
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
						placeholder="Razón social, fantasía, CUIT, email o código…"
						aria-label="Buscar proveedor"
					/>
					<div className={styles.toolbarSelect}>
						<CustomSelect
							label="Tipo"
							name="prov-f-tipo"
							value={tipo}
							compact
							options={tipoOptions}
							onChange={(v) => filtrar(() => setTipo(v === '' || v == null ? '' : Number(v)))}
						/>
					</div>
					<div className={styles.toolbarSelectSm}>
						<CustomSelect
							label="Orden"
							name="prov-f-orden"
							value={orden}
							compact
							options={ORDEN_OPTS}
							onChange={(v) => filtrar(() => setOrden((v as ProveedoresOrden) || 'nombre'))}
						/>
					</div>
				</div>
				<div className={styles.filtrosRow}>
					<Segmented<EstadoFiltro>
						value={estado}
						onChange={(v) => filtrar(() => setEstado(v))}
						opciones={[
							{ value: '1', label: 'Activos', count: r?.activos },
							{ value: '2', label: 'Suspendidos', count: r?.suspendidos },
							{ value: '3', label: 'De baja', count: r?.bajas },
							{ value: '', label: 'Todos', count: r?.total },
						]}
					/>
					<div className={styles.vistaToggle}>
						<button
							type="button"
							className={vista === 'tarjetas' ? styles.vistaActiva : undefined}
							onClick={() => filtrar(() => setVista('tarjetas'))}
							aria-label="Ver como tarjetas"
							title="Tarjetas"
						>
							<LayoutGrid size={16} />
						</button>
						<button
							type="button"
							className={vista === 'tabla' ? styles.vistaActiva : undefined}
							onClick={() => filtrar(() => setVista('tabla'))}
							aria-label="Ver como tabla"
							title="Tabla"
						>
							<List size={16} />
						</button>
					</div>
				</div>
			</div>

			<section className={styles.panel}>
				{loading && !items.length ? (
					<div className={styles.empty}>Cargando proveedores…</div>
				) : !items.length ? (
					<div className={styles.empty}>
						<Truck size={28} />
						<div>Sin proveedores para el filtro actual.</div>
					</div>
				) : vista === 'tarjetas' ? (
					<div className={styles.provGrid}>
						{items.map((p) => {
							const color = COLOR_ESTADO_PROV[p.IdStatus || 1] || '#64748b';
							return (
								<article key={p.IdProveedor} className={styles.provCard}>
									<div className={styles.provCardHead}>
										<Avatar nombre={p.Descripcion} size={44} />
										<div className={styles.provCardTitulo}>
											<button type="button" className={styles.linkCell} onClick={() => setModal({ open: true, id: p.IdProveedor })}>
												{p.Descripcion}
											</button>
											<span className={styles.muted}>
												#{p.IdProveedor}
												{p.NombreFantasia ? ` · ${p.NombreFantasia}` : ''}
											</span>
										</div>
										<Pill color={color}>{LABEL_ESTADO_PROV[p.IdStatus || 1] || p.StatusNombre}</Pill>
									</div>
									<div className={styles.provCardInfo}>
										{p.CuitFmt ? (
											<span>
												<BadgeCheck size={13} /> {p.CuitFmt}
											</span>
										) : null}
										{p.TipoNombre ? (
											<span>
												<Sparkles size={13} /> {p.TipoNombre}
											</span>
										) : null}
										{p.Telefono ? (
											<span>
												<Phone size={13} /> {p.Telefono}
											</span>
										) : null}
										{p.Email ? (
											<span title={p.Email}>
												<Mail size={13} /> {p.Email}
											</span>
										) : null}
										{p.Domicilio ? (
											<span title={p.Domicilio}>
												<MapPin size={13} /> {p.Domicilio}
											</span>
										) : null}
									</div>
									<div className={styles.provCardStats}>
										<div>
											<FileText size={14} />
											<strong>{fmtNum(p.Remitos, 0)}</strong>
											<span>remitos</span>
										</div>
										<div>
											<Package size={14} />
											<strong>{fmtNum(p.Productos, 0)}</strong>
											<span>productos</span>
										</div>
										<div>
											<Clock size={14} />
											<strong>{p.UltimoRemito ? fmtFecha(p.UltimoRemito) : '—'}</strong>
											<span>último</span>
										</div>
									</div>
									<div className={styles.provCardFoot}>
										<span className={styles.provCardImporte}>{p.ImporteRemitos ? fmtMoney(p.ImporteRemitos) : ''}</span>
										{acciones(p)}
									</div>
								</article>
							);
						})}
					</div>
				) : (
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Proveedor</th>
									<th>CUIT</th>
									<th>Contacto</th>
									<th style={{ textAlign: 'right' }}>Remitos</th>
									<th style={{ textAlign: 'right' }}>Productos</th>
									<th>Estado</th>
									<th className={styles.colActions}>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{items.map((p) => (
									<tr key={p.IdProveedor} className={p.IdStatus === 3 ? styles.filaAnulada : undefined}>
										<td>
											<div className={styles.provTablaNombre}>
												<Avatar nombre={p.Descripcion} size={32} />
												<div>
													<button type="button" className={styles.linkCell} onClick={() => setModal({ open: true, id: p.IdProveedor })}>
														{p.Descripcion}
													</button>
													<div className={styles.muted}>
														#{p.IdProveedor}
														{p.TipoNombre ? ` · ${p.TipoNombre}` : ''}
													</div>
												</div>
											</div>
										</td>
										<td className={styles.mono}>{p.CuitFmt || '—'}</td>
										<td>
											<div>{p.Telefono || '—'}</div>
											{p.Email ? <div className={styles.muted}>{p.Email}</div> : null}
										</td>
										<td className={styles.mono} style={{ textAlign: 'right' }}>
											{fmtNum(p.Remitos, 0)}
											{p.UltimoRemito ? <div className={styles.muted}>{fmtFecha(p.UltimoRemito)}</div> : null}
										</td>
										<td className={styles.mono} style={{ textAlign: 'right' }}>
											{fmtNum(p.Productos, 0)}
										</td>
										<td>
											<Pill color={COLOR_ESTADO_PROV[p.IdStatus || 1] || '#64748b'}>
												{LABEL_ESTADO_PROV[p.IdStatus || 1] || p.StatusNombre}
											</Pill>
										</td>
										<td className={styles.colActions}>{acciones(p)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				<div className={styles.pager}>
					<span className={styles.muted}>
						{total.toLocaleString('es-AR')} proveedores · pág. {page}/{totalPages}
					</span>
					<div className={styles.pagerBtns}>
						<button type="button" className={styles.btnGhost} disabled={page <= 1 || loading} onClick={() => setPage((x) => Math.max(1, x - 1))}>
							<ChevronLeft size={16} />
						</button>
						<button type="button" className={styles.btnGhost} disabled={page >= totalPages || loading} onClick={() => setPage((x) => x + 1)}>
							<ChevronRight size={16} />
						</button>
					</div>
				</div>
			</section>

			<ProveedorModal
				isOpen={modal.open}
				idProveedor={modal.id}
				onClose={() => setModal({ open: false, id: null })}
				onGuardado={refrescar}
				catalogos={catalogos}
				puedeEditar={modal.id == null ? puedeCrear : puedeEditar}
			/>
		</div>
	);
}
