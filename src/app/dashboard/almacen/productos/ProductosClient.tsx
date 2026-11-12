'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertTriangle,
	ArchiveRestore,
	Archive,
	Barcode,
	Boxes,
	Camera,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	Eye,
	ImageIcon,
	LayoutGrid,
	List,
	Package,
	Plus,
	RefreshCw,
	Search,
	Tags,
	Trash2,
	Pencil,
	X,
} from 'lucide-react';
import { almacenStockService } from '@/app/services/almacenStockService';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useToast } from '@/app/components/UI/ToastProvider';
import { resaltarCampoLuego } from '@/app/components/UI/resaltar';
import Modal from '@/app/components/UI/Modal';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { mensajeDeError } from '@/app/utils/apiError';
import type {
	PlanCuentaOpt,
	ProductoStock,
	ProductosCatalogos,
	ProductosEstadoFiltro,
	ProductosOrden,
	ProductosResumen,
	ProductosStockFiltro,
} from '@/app/types/almacenStock';
import {
	BarList,
	Card,
	ChartsRow,
	Donut,
	FotoProducto,
	Kpi,
	KpiGrid,
	Pill,
	Segmented,
	Skeleton,
	fmtCompact,
	fmtNum,
	invalidarFoto,
} from '../AlmacenVisual';
import ProductoFichaModal from './ProductoFichaModal';
import CatalogosProductoModal from './CatalogosProductoModal';
import styles from '../stock.module.css';

type FormState = Partial<ProductoStock> & { Descripcion: string };

const emptyForm = (nextId?: number): FormState => ({
	IdProducto: nextId,
	Descripcion: '',
	DescripcionC: '',
	CodAlternativo: '',
	IdTipoMateria: '',
	IdRubro: null,
	IdSubRubro: null,
	IdLinea: null,
	IdStatus: 1,
	IdUnidad: 'UN',
	IdTipoPrd: null,
	IdMarca: null,
	IdColor: null,
	IdMoneda: 1,
	IdTipoIva: null,
	PrecioBase: 0,
	PrecioVenta: 0,
	PrecioCosto: 0,
	PuntoPedido: 0,
	Cotizacion: 0,
	StockMinimo: 0,
	StockMaximo: 0,
	CBarra: '',
	ControlarStock: 1,
	EnLista: 1,
	ConFabricacion: 0,
	EsKit: 0,
	EsPartida: 0,
	IdCtaVta: null,
	IdCtaCmpra: null,
	CtaVtaNombre: '',
	CtaCmpraNombre: '',
	Texto: '',
});

function fmtMoney(n?: number | null) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function optLabel(id: string | number | null | undefined, nombre?: string | null) {
	if (id == null || id === '') return undefined;
	return nombre ? `${id} — ${nombre}` : String(id);
}

const ORDEN_OPTS: { value: ProductosOrden; label: string }[] = [
	{ value: 'descripcion', label: 'Descripción' },
	{ value: 'codigo', label: 'Código' },
	{ value: 'stock', label: 'Mayor stock' },
	{ value: 'precio', label: 'Mayor precio' },
];

const FOTO_TIPOS = 'image/jpeg,image/png,image/webp,image/gif';

export default function ProductosClient() {
	const { puede } = usePermiso();
	const toast = useToast();
	const canCreate = puede('ALMACEN.PRODUCTOS.CREAR');
	const canEdit = puede('ALMACEN.PRODUCTOS.EDITAR');
	const canDelete = puede('ALMACEN.PRODUCTOS.ELIMINAR');

	const [search, setSearch] = useState('');
	const [searchDebounced, setSearchDebounced] = useState('');
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [items, setItems] = useState<ProductoStock[]>([]);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [catalogos, setCatalogos] = useState<ProductosCatalogos | null>(null);
	const [resumen, setResumen] = useState<ProductosResumen | null>(null);

	const [fEstado, setFEstado] = useState<ProductosEstadoFiltro>('activos');
	const [fStock, setFStock] = useState<ProductosStockFiltro>('');
	const [fRubro, setFRubro] = useState<number | ''>('');
	const [fConFoto, setFConFoto] = useState(false);
	const [orden, setOrden] = useState<ProductosOrden>('descripcion');
	const [vista, setVista] = useState<'tabla' | 'tarjetas'>('tabla');

	const [fichaId, setFichaId] = useState<number | null>(null);
	const [catalogosOpen, setCatalogosOpen] = useState(false);
	const [fotoVer, setFotoVer] = useState<Record<number, number>>({});
	const [fotoPendiente, setFotoPendiente] = useState<File | null>(null);
	const [fotoPreview, setFotoPreview] = useState<string | null>(null);
	const [subiendoFoto, setSubiendoFoto] = useState(false);
	const fotoInput = useRef<HTMLInputElement>(null);

	const [modalOpen, setModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<FormState>(emptyForm());
	const [saving, setSaving] = useState(false);
	const [ctaVtaOpts, setCtaVtaOpts] = useState<{ value: number; label: string }[]>([]);
	const [ctaCmpOpts, setCtaCmpOpts] = useState<{ value: number; label: string }[]>([]);
	const [ctaLoading, setCtaLoading] = useState(false);

	const subrubrosFiltrados = useMemo(() => {
		if (!catalogos) return [];
		if (form.IdRubro == null) return catalogos.subrubros;
		return catalogos.subrubros.filter((s) => Number(s.IdRubro) === Number(form.IdRubro));
	}, [catalogos, form.IdRubro]);

	const rubroOptions = useMemo(
		() =>
			(catalogos?.rubros || []).map((r) => ({
				value: r.IdRubro,
				label: r.Descripcion || String(r.IdRubro),
			})),
		[catalogos],
	);
	const subrubroOptions = useMemo(
		() =>
			subrubrosFiltrados.map((s) => ({
				value: s.IdSubRubro,
				label: s.Descripcion || String(s.IdSubRubro),
			})),
		[subrubrosFiltrados],
	);
	const unidadOptions = useMemo(
		() =>
			(catalogos?.unidades || [{ IdUnidad: 'UN', Descripcion: 'UNIDAD' }]).map((u) => ({
				value: u.IdUnidad,
				label: u.Descripcion || u.IdUnidad,
			})),
		[catalogos],
	);
	const tipoPrdOptions = useMemo(
		() =>
			(catalogos?.tiposPrd || []).map((t) => ({
				value: t.IdTipoPrd,
				label: t.Descripcion || String(t.IdTipoPrd),
			})),
		[catalogos],
	);
	const marcaOptions = useMemo(
		() =>
			(catalogos?.marcas || []).map((m) => ({
				value: m.IdMarca,
				label: m.Descripcion || String(m.IdMarca),
			})),
		[catalogos],
	);
	const colorOptions = useMemo(
		() =>
			(catalogos?.colores || []).map((c) => ({
				value: c.IdColor,
				label: c.Descripcion || String(c.IdColor),
			})),
		[catalogos],
	);
	const monedaOptions = useMemo(
		() =>
			(catalogos?.monedas || []).map((m) => ({
				value: m.IdMoneda,
				label: m.Descripcion || String(m.IdMoneda),
			})),
		[catalogos],
	);
	const ivaOptions = useMemo(
		() =>
			(catalogos?.tiposIva || []).map((t) => ({
				value: t.IdTipoIva,
				label: t.Descripcion || t.TipoIva || String(t.IdTipoIva),
			})),
		[catalogos],
	);

	useEffect(() => {
		const t = setTimeout(() => setSearchDebounced(search), 280);
		return () => clearTimeout(t);
	}, [search]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await almacenStockService.listarProductos({
				search: searchDebounced,
				campo: 'toda',
				estado: fEstado,
				stock: fStock,
				idRubro: fRubro === '' ? undefined : fRubro,
				conFoto: fConFoto,
				orden,
				page,
				pageSize: vista === 'tarjetas' ? 36 : 40,
			});
			setItems(data.items);
			setTotal(data.total);
			setTotalPages(data.totalPages);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo cargar productos'));
		} finally {
			setLoading(false);
		}
	}, [searchDebounced, page, fEstado, fStock, fRubro, fConFoto, orden, vista]);

	const cargarResumen = useCallback(() => {
		void almacenStockService
			.resumenProductos()
			.then(setResumen)
			.catch(() => setResumen(null));
	}, []);

	const cargarCatalogos = useCallback(() => {
		void almacenStockService
			.catalogosProductos()
			.then(setCatalogos)
			.catch(() => setCatalogos(null));
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		cargarCatalogos();
		cargarResumen();
	}, [cargarCatalogos, cargarResumen]);

	useEffect(() => {
		if (!fotoPendiente) {
			setFotoPreview(null);
			return;
		}
		const u = URL.createObjectURL(fotoPendiente);
		setFotoPreview(u);
		return () => URL.revokeObjectURL(u);
	}, [fotoPendiente]);

	const filtrar = (fn: () => void) => {
		fn();
		setPage(1);
	};

	const refrescar = () => {
		void load();
		cargarResumen();
	};

	const tocarFoto = (id: number) => {
		invalidarFoto(id);
		setFotoVer((v) => ({ ...v, [id]: (v[id] || 0) + 1 }));
	};

	const subirFoto = async (id: number, file: File) => {
		setSubiendoFoto(true);
		try {
			const p = await almacenStockService.subirFotoProducto(id, file);
			tocarFoto(id);
			setForm((f) => (f.IdProducto === id ? { ...f, TieneFoto: p.TieneFoto, Foto: p.Foto } : f));
			return true;
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo subir la imagen'));
			return false;
		} finally {
			setSubiendoFoto(false);
		}
	};

	const elegirFoto = async (file?: File | null) => {
		if (!file) return;
		if (file.size > 4 * 1024 * 1024) {
			toast.error('La imagen supera los 4 MB');
			return;
		}
		if (editingId != null) {
			if (await subirFoto(editingId, file)) {
				toast.success('Imagen actualizada');
				void load();
				cargarResumen();
			}
		} else {
			setFotoPendiente(file);
		}
	};

	const quitarFoto = async () => {
		if (editingId == null) {
			setFotoPendiente(null);
			return;
		}
		setSubiendoFoto(true);
		try {
			await almacenStockService.quitarFotoProducto(editingId);
			tocarFoto(editingId);
			setForm((f) => ({ ...f, TieneFoto: false, Foto: '' }));
			toast.success('Imagen quitada');
			void load();
			cargarResumen();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo quitar la imagen'));
		} finally {
			setSubiendoFoto(false);
		}
	};

	const mapCuentas = (rows: PlanCuentaOpt[]) =>
		rows.map((c) => ({
			value: c.IdCuenta,
			label: c.Descripcion || c.CodCuenta || String(c.IdCuenta),
		}));

	const searchCuentas = async (term: string, which: 'vta' | 'cmp') => {
		setCtaLoading(true);
		try {
			const rows = await almacenStockService.buscarCuentasProducto(term);
			const opts = mapCuentas(rows);
			if (which === 'vta') setCtaVtaOpts(opts);
			else setCtaCmpOpts(opts);
		} catch {
			if (which === 'vta') setCtaVtaOpts([]);
			else setCtaCmpOpts([]);
		} finally {
			setCtaLoading(false);
		}
	};

	const openCreate = () => {
		setEditingId(null);
		setFotoPendiente(null);
		setForm(emptyForm(catalogos?.nextId));
		setCtaVtaOpts([]);
		setCtaCmpOpts([]);
		setModalOpen(true);
	};

	const openEdit = async (row: Pick<ProductoStock, 'IdProducto'>) => {
		try {
			const full = await almacenStockService.obtenerProducto(row.IdProducto);
			setEditingId(full.IdProducto);
			setFotoPendiente(null);
			setForm({
				...emptyForm(),
				...full,
				Descripcion: full.Descripcion || '',
				DescripcionC: full.DescripcionC || '',
				IdTipoMateria: full.IdTipoMateria || '',
				Texto: full.Texto || '',
			});
			setCtaVtaOpts(
				full.IdCtaVta != null
					? [
							{
								value: full.IdCtaVta,
								label: optLabel(full.IdCtaVta, full.CtaVtaNombre) || String(full.IdCtaVta),
							},
						]
					: [],
			);
			setCtaCmpOpts(
				full.IdCtaCmpra != null
					? [
							{
								value: full.IdCtaCmpra,
								label: optLabel(full.IdCtaCmpra, full.CtaCmpraNombre) || String(full.IdCtaCmpra),
							},
						]
					: [],
			);
			setModalOpen(true);
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo abrir el producto'));
		}
	};

	const save = async () => {
		if (!form.Descripcion.trim()) {
			toast.error('La descripción es obligatoria');
			resaltarCampoLuego('producto-descripcion');
			return;
		}
		setSaving(true);
		try {
			const { Foto: _foto, TieneFoto: _tiene, StockTotal: _st, DepositosConStock: _dc, DepositosBajoMinimo: _db, Activo: _ac, ...body } =
				form;
			if (editingId != null) {
				await almacenStockService.actualizarProducto(editingId, body);
				toast.success('Producto actualizado');
			} else {
				const creado = await almacenStockService.crearProducto(body as FormState);
				toast.success('Producto creado');
				if (fotoPendiente) await subirFoto(creado.IdProducto, fotoPendiente);
				setFotoPendiente(null);
				cargarCatalogos();
			}
			setModalOpen(false);
			refrescar();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo guardar'));
		} finally {
			setSaving(false);
		}
	};

	const cambiarEstado = async (row: ProductoStock) => {
		const activar = row.Activo === false;
		const label = row.Descripcion || String(row.IdProducto);
		if (!activar && !window.confirm(`¿Dar de baja «${label}»? No se podrá usar en remitos nuevos.`)) return;
		try {
			await almacenStockService.estadoProducto(row.IdProducto, activar);
			toast.success(activar ? 'Producto reactivado' : 'Producto dado de baja');
			refrescar();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo cambiar el estado'));
		}
	};

	const remove = async (row: ProductoStock) => {
		if (!canDelete) return;
		const label = row.Descripcion || String(row.IdProducto);
		if (
			!window.confirm(
				`¿Eliminar el producto «${label}»?\n\nSi tiene remitos, movimientos, existencias o proveedores se da de baja en lugar de borrarse.`,
			)
		)
			return;
		try {
			const r = await almacenStockService.eliminarProductoModo(row.IdProducto);
			if (r.modo === 'baja') toast.warning('Tenía historial: se dio de baja en lugar de borrarse');
			else toast.success('Producto eliminado');
			refrescar();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo borrar'));
		}
	};

	const rubroFiltroOpts = useMemo(
		() => [{ value: '', label: 'Todos los rubros' }, ...rubroOptions],
		[rubroOptions],
	);

	const donutRubros = useMemo(
		() =>
			(resumen?.porRubro || []).map((r) => ({
				name: r.Descripcion,
				value: r.cantidad,
				id: r.IdRubro,
			})),
		[resumen],
	);

	const setFlag = (key: keyof FormState, checked: boolean) => {
		setForm((f) => ({ ...f, [key]: checked ? 1 : 0 }));
	};

	return (
		<div className={styles.wrap}>
			<header className={styles.header}>
				<div className={styles.titleLeft}>
					<div className={styles.titleIcon}>
						<Package size={22} />
					</div>
					<div className={styles.titleBlock}>
						<h1>Productos</h1>
						<p>
							Catálogo de la tabla Productos · {total.toLocaleString('es-AR')} {total === 1 ? 'resultado' : 'resultados'}
						</p>
					</div>
				</div>
				<div className={styles.headerActions}>
					{canEdit && (
						<button type="button" className={styles.btnGhost} onClick={() => setCatalogosOpen(true)}>
							<Tags size={16} />
							Catálogos
						</button>
					)}
					<button type="button" className={styles.btnGhost} onClick={refrescar} disabled={loading}>
						<RefreshCw size={16} />
						Actualizar
					</button>
					{canCreate && (
						<button type="button" className={styles.btnPrimary} onClick={openCreate}>
							<Plus size={16} />
							Agregar
						</button>
					)}
				</div>
			</header>

			{error && <div className={styles.error}>{error}</div>}

			{resumen ? (
				<KpiGrid>
					<Kpi
						label="Productos"
						value={fmtNum(resumen.total, 0)}
						hint={`${fmtNum(resumen.bajas, 0)} dados de baja`}
						icon={<Package size={22} />}
						activo={fEstado === '' && !fStock && !fConFoto}
						onClick={() =>
							filtrar(() => {
								setFEstado('');
								setFStock('');
								setFConFoto(false);
							})
						}
					/>
					<Kpi
						label="Activos"
						value={fmtNum(resumen.activos, 0)}
						hint="habilitados para operar"
						pct={resumen.pctActivos}
						tono="ok"
						activo={fEstado === 'activos' && !fStock && !fConFoto}
						onClick={() =>
							filtrar(() => {
								setFEstado('activos');
								setFStock('');
								setFConFoto(false);
							})
						}
					/>
					<Kpi
						label="Con stock"
						value={fmtNum(resumen.conStock, 0)}
						hint="en al menos un depósito"
						pct={resumen.pctConStock}
						tono="brand"
						activo={fStock === 'con'}
						onClick={() => filtrar(() => setFStock(fStock === 'con' ? '' : 'con'))}
					/>
					<Kpi
						label="Bajo mínimo"
						value={fmtNum(resumen.bajoMinimo, 0)}
						hint="en algún depósito"
						icon={<AlertTriangle size={22} />}
						tono={resumen.bajoMinimo ? 'warn' : 'ok'}
						activo={fStock === 'bajo'}
						onClick={() => filtrar(() => setFStock(fStock === 'bajo' ? '' : 'bajo'))}
					/>
					<Kpi label="Con precio" value={fmtNum(resumen.conPrecio, 0)} hint="precio de venta cargado" pct={resumen.pctConPrecio} tono="violet" />
					<Kpi
						label="Con imagen"
						value={fmtNum(resumen.conFoto, 0)}
						hint="fotos cargadas"
						pct={resumen.pctConFoto}
						tono="neutral"
						activo={fConFoto}
						onClick={() => filtrar(() => setFConFoto(!fConFoto))}
					/>
				</KpiGrid>
			) : (
				<Skeleton alto={84} />
			)}

			{resumen ? (
				<ChartsRow>
					<Card title="Productos por rubro" icon={<Tags size={15} />}>
						<Donut
							data={donutRubros}
							centro={fmtCompact(resumen.activos)}
							centroLabel="activos"
							onSelect={(d) => {
								const r = resumen.porRubro.find((x) => x.Descripcion === d.name);
								if (r?.IdRubro != null) filtrar(() => setFRubro(fRubro === r.IdRubro ? '' : (r.IdRubro as number)));
							}}
						/>
					</Card>
					<Card title="Completitud del catálogo" icon={<Barcode size={15} />}>
						<BarList
							total={resumen.total}
							formato={(v) => `${Math.round((v / Math.max(1, resumen.total)) * 100)}%`}
							items={[
								{ key: 'precio', label: 'Con precio de venta', value: resumen.conPrecio, color: '#8b5cf6', sub: `${fmtNum(resumen.conPrecio, 0)} productos` },
								{ key: 'barra', label: 'Con código de barras', value: resumen.conBarra, color: '#0083a9', sub: `${fmtNum(resumen.conBarra, 0)} productos` },
								{ key: 'prov', label: 'Con proveedor asignado', value: resumen.conProveedor, color: '#22c55e', sub: `${fmtNum(resumen.conProveedor, 0)} productos` },
								{ key: 'stock', label: 'Con stock', value: resumen.conStock, color: '#06b6d4', sub: `${fmtNum(resumen.conStock, 0)} productos` },
								{ key: 'foto', label: 'Con imagen', value: resumen.conFoto, color: '#f59e0b', sub: `${fmtNum(resumen.conFoto, 0)} productos` },
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
						placeholder="Buscar por código, descripción o alias…"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
					/>
					<div className={styles.toolbarSelect}>
						<CustomSelect
							label="Rubro"
							name="prod-f-rubro"
							value={fRubro}
							compact
							options={rubroFiltroOpts}
							onChange={(v) => filtrar(() => setFRubro(v === '' || v == null ? '' : Number(v)))}
						/>
					</div>
					<div className={styles.toolbarSelectSm}>
						<CustomSelect
							label="Orden"
							name="prod-f-orden"
							value={orden}
							compact
							options={ORDEN_OPTS}
							onChange={(v) => filtrar(() => setOrden((v as ProductosOrden) || 'descripcion'))}
						/>
					</div>
				</div>
				<div className={styles.filtrosRow}>
					<Segmented<ProductosEstadoFiltro>
						value={fEstado}
						onChange={(v) => filtrar(() => setFEstado(v))}
						opciones={[
							{ value: 'activos', label: 'Activos', count: resumen?.activos },
							{ value: 'baja', label: 'De baja', count: resumen?.bajas },
							{ value: '', label: 'Todos', count: resumen?.total },
						]}
					/>
					<Segmented<ProductosStockFiltro>
						value={fStock}
						onChange={(v) => filtrar(() => setFStock(v))}
						opciones={[
							{ value: '', label: 'Cualquier stock' },
							{ value: 'con', label: 'Con stock' },
							{ value: 'sin', label: 'Sin stock' },
							{ value: 'bajo', label: 'Bajo mínimo' },
						]}
					/>
					<label className={styles.checkInline}>
						<input type="checkbox" checked={fConFoto} onChange={(e) => filtrar(() => setFConFoto(e.target.checked))} />
						<ImageIcon size={14} /> Con imagen
					</label>
					<div className={styles.vistaToggle}>
						<button
							type="button"
							className={vista === 'tabla' ? styles.vistaActiva : undefined}
							onClick={() => filtrar(() => setVista('tabla'))}
							aria-label="Ver como tabla"
							title="Tabla"
						>
							<List size={16} />
						</button>
						<button
							type="button"
							className={vista === 'tarjetas' ? styles.vistaActiva : undefined}
							onClick={() => filtrar(() => setVista('tarjetas'))}
							aria-label="Ver como tarjetas"
							title="Tarjetas"
						>
							<LayoutGrid size={16} />
						</button>
					</div>
				</div>
			</div>

			<section className={styles.panel}>
				{loading && items.length === 0 ? (
					<div className={styles.empty}>Cargando productos…</div>
				) : items.length === 0 ? (
					<div className={styles.empty}>No hay productos para mostrar</div>
				) : vista === 'tarjetas' ? (
					<div className={styles.prodGrid}>
						{items.map((row) => (
							<article key={row.IdProducto} className={`${styles.prodTile} ${row.Activo === false ? styles.prodTileBaja : ''}`}>
								<button type="button" className={styles.prodTileFoto} onClick={() => setFichaId(row.IdProducto)} aria-label="Ver ficha">
									<FotoProducto
										id={row.IdProducto}
										tieneFoto={row.TieneFoto}
										rubro={row.RubroNombre}
										size={88}
										redondeo={14}
										version={fotoVer[row.IdProducto]}
									/>
									{row.DepositosBajoMinimo ? (
										<span className={styles.prodTileAlerta} title="Bajo mínimo en algún depósito">
											<AlertTriangle size={13} />
										</span>
									) : null}
								</button>
								<div className={styles.prodTileBody}>
									<span className={`${styles.mono} ${styles.muted}`}>#{row.IdProducto}</span>
									<strong className={styles.prodTileNombre} title={row.Descripcion || ''}>
										{row.Descripcion || '—'}
									</strong>
									<span className={styles.muted}>{row.RubroNombre || 'Sin rubro'}</span>
								</div>
								<div className={styles.prodTileFoot}>
									<span className={styles.prodTileStock}>
										<Boxes size={14} />
										{row.StockTotal ? fmtNum(row.StockTotal) : '0'} {row.IdUnidad}
									</span>
									<span className={styles.prodTilePrecio}>{fmtMoney(row.PrecioVenta)}</span>
								</div>
								{row.Activo === false ? <Pill color="#dc2626">Baja</Pill> : null}
							</article>
						))}
					</div>
				) : (
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th />
									<th>Producto</th>
									<th>Rub. / Sub.</th>
									<th>Stock</th>
									<th>Precio V</th>
									<th className={styles.colActions}>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{items.map((row) => (
									<tr key={row.IdProducto} className={row.Activo === false ? styles.filaAnulada : undefined}>
										<td className={styles.colFoto}>
											<FotoProducto
												id={row.IdProducto}
												tieneFoto={row.TieneFoto}
												rubro={row.RubroNombre}
												size={40}
												version={fotoVer[row.IdProducto]}
											/>
										</td>
										<td>
											<button type="button" className={styles.linkCell} onClick={() => setFichaId(row.IdProducto)}>
												{row.Descripcion || '—'}
											</button>
											<div className={styles.muted}>
												<span className={styles.mono}>#{row.IdProducto}</span>
												{row.CodAlternativo ? ` · ${row.CodAlternativo}` : ''}
												{row.IdUnidad ? ` · ${row.IdUnidad}` : ''}
												{row.Activo === false ? (
													<>
														{' '}
														<Pill color="#dc2626">Baja</Pill>
													</>
												) : null}
											</div>
										</td>
										<td className={styles.muted}>{row.RubSubLin || '—'}</td>
										<td>
											<div className={styles.stockCell}>
												<strong className={styles.mono}>{row.StockTotal ? fmtNum(row.StockTotal) : '0'}</strong>
												<span className={styles.stockDeps}>
													{row.DepositosConStock ? (
														<span title="Depósitos con stock">
															<Boxes size={12} /> {row.DepositosConStock}
														</span>
													) : (
														<span className={styles.muted}>sin stock</span>
													)}
													{row.DepositosBajoMinimo ? (
														<span className={styles.stockAlerta} title="Depósitos bajo mínimo">
															<AlertTriangle size={12} /> {row.DepositosBajoMinimo}
														</span>
													) : null}
												</span>
											</div>
										</td>
										<td className={styles.mono}>
											<span className={styles.precioCell}>
												<DollarSign size={12} />
												{fmtMoney(row.PrecioVenta).replace('$', '').trim()}
											</span>
										</td>
										<td className={styles.colActions}>
											<div className={styles.rowActions}>
												<button
													type="button"
													className={styles.actionEdit}
													title="Ficha"
													aria-label={`Ver ficha del producto ${row.IdProducto}`}
													onClick={() => setFichaId(row.IdProducto)}
												>
													<Eye size={16} />
												</button>
												{canEdit && (
													<button
														type="button"
														className={styles.actionEdit}
														title="Editar"
														aria-label={`Editar producto ${row.IdProducto}`}
														onClick={() => void openEdit(row)}
													>
														<Pencil size={16} />
													</button>
												)}
												{canEdit && (
													<button
														type="button"
														className={styles.actionEdit}
														title={row.Activo === false ? 'Reactivar' : 'Dar de baja'}
														aria-label={`${row.Activo === false ? 'Reactivar' : 'Dar de baja'} producto ${row.IdProducto}`}
														onClick={() => void cambiarEstado(row)}
													>
														{row.Activo === false ? <ArchiveRestore size={16} /> : <Archive size={16} />}
													</button>
												)}
												{canDelete && (
													<button
														type="button"
														className={styles.actionDelete}
														title="Eliminar"
														aria-label={`Eliminar producto ${row.IdProducto}`}
														onClick={() => void remove(row)}
													>
														<Trash2 size={16} />
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				<div className={styles.pager}>
					<span className={styles.muted}>
						{total.toLocaleString('es-AR')} productos · página {page} de {totalPages}
					</span>
					<div className={styles.pagerBtns}>
						<button
							type="button"
							className={styles.btnGhost}
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							<ChevronLeft size={16} />
						</button>
						<button
							type="button"
							className={styles.btnGhost}
							disabled={page >= totalPages}
							onClick={() => setPage((p) => p + 1)}
						>
							<ChevronRight size={16} />
						</button>
					</div>
				</div>
			</section>

			<Modal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				title={editingId != null ? `Producto ${editingId}` : 'Agregar producto'}
				size="xlarge"
			>
				<div className={styles.prodModal}>
					<section className={styles.prodCard}>
						<div className={styles.prodCardHead}>
							<h3 className={styles.prodCardTitle}>Identificación</h3>
							<button
								type="button"
								className={`${styles.statusToggle} ${
									Number(form.IdStatus) === 1 ? styles.statusOn : styles.statusOff
								}`}
								role="switch"
								aria-checked={Number(form.IdStatus) === 1}
								onClick={() =>
									setForm((f) => ({
										...f,
										IdStatus: Number(f.IdStatus) === 1 ? 0 : 1,
									}))
								}
							>
								<span className={styles.statusTrack} aria-hidden>
									<span className={styles.statusThumb} />
								</span>
								<span className={styles.statusLabel}>
									{Number(form.IdStatus) === 1 ? 'Activo' : 'Baja'}
								</span>
							</button>
						</div>
						<div className={`${styles.prodCardBody} ${styles.prodIdentBody}`}>
							<div className={styles.fotoPicker}>
								<div className={styles.fotoPickerImg}>
									{fotoPreview ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={fotoPreview} alt="" />
									) : (
										<FotoProducto
											id={form.IdProducto ?? 0}
											tieneFoto={editingId != null && !!form.TieneFoto}
											rubro={catalogos?.rubros.find((r) => r.IdRubro === form.IdRubro)?.Descripcion}
											size={112}
											redondeo={14}
											version={editingId != null ? fotoVer[editingId] : undefined}
										/>
									)}
									{subiendoFoto ? <span className={styles.fotoPickerCargando}>Subiendo…</span> : null}
								</div>
								<input
									ref={fotoInput}
									type="file"
									accept={FOTO_TIPOS}
									hidden
									onChange={(e) => {
										void elegirFoto(e.target.files?.[0]);
										e.target.value = '';
									}}
								/>
								<div className={styles.fotoPickerBtns}>
									<button type="button" className={styles.btnGhost} onClick={() => fotoInput.current?.click()} disabled={subiendoFoto}>
										<Camera size={14} /> {form.TieneFoto || fotoPendiente ? 'Cambiar' : 'Imagen'}
									</button>
									{form.TieneFoto || fotoPendiente ? (
										<button type="button" className={styles.btnGhost} onClick={() => void quitarFoto()} disabled={subiendoFoto} aria-label="Quitar imagen">
											<X size={14} />
										</button>
									) : null}
								</div>
							</div>
							<div className={styles.prodIdFields}>
							<div className={styles.prodIdRow}>
								<div className={`${styles.field} ${styles.prodCode}`}>
									<label>Cód. producto</label>
									<input
										className={styles.mono}
										value={form.IdProducto ?? ''}
										disabled={editingId != null}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												IdProducto: e.target.value ? Number(e.target.value) : undefined,
											}))
										}
									/>
								</div>
								<div className={`${styles.field} ${styles.prodCodeSm}`}>
									<label>Cód. mat. prima</label>
									<input
										value={form.IdTipoMateria || ''}
										maxLength={5}
										onChange={(e) => setForm((f) => ({ ...f, IdTipoMateria: e.target.value }))}
									/>
								</div>
								<div
									className={`${styles.field} ${styles.prodGrow}`}
									data-resaltar="producto-descripcion"
								>
									<label>Descripción</label>
									<input
										value={form.Descripcion}
										maxLength={150}
										onChange={(e) => setForm((f) => ({ ...f, Descripcion: e.target.value }))}
									/>
								</div>
							</div>
							<div className={styles.prodIdRow}>
								<div className={`${styles.field} ${styles.prodGrow}`}>
									<label>Alias</label>
									<input
										value={form.DescripcionC || ''}
										maxLength={150}
										onChange={(e) => setForm((f) => ({ ...f, DescripcionC: e.target.value }))}
									/>
								</div>
								<div className={`${styles.field} ${styles.prodCode}`}>
									<label>Cód. secundario</label>
									<input
										value={form.CodAlternativo || ''}
										maxLength={20}
										onChange={(e) => setForm((f) => ({ ...f, CodAlternativo: e.target.value }))}
									/>
								</div>
								<div className={`${styles.field} ${styles.prodCode}`}>
									<label>Cód. barras</label>
									<input
										value={form.CBarra || ''}
										maxLength={20}
										onChange={(e) => setForm((f) => ({ ...f, CBarra: e.target.value }))}
									/>
								</div>
							</div>
							</div>
						</div>
					</section>

					<section className={styles.prodCard}>
						<div className={styles.prodCardHead}>
							<h3 className={styles.prodCardTitle}>Clasificación</h3>
						</div>
						<div className={styles.prodCardBody}>
							<div className={styles.formGrid3}>
								<CustomSelect
									label="Rubro"
									name="prod-rubro"
									value={form.IdRubro ?? ''}
									isLoading={false}
									compact
									options={rubroOptions}
									onChange={(v) =>
										setForm((f) => ({
											...f,
											IdRubro: v === '' ? null : Number(v),
											IdSubRubro: null,
										}))
									}
								/>
								<CustomSelect
									label="Subrubro"
									name="prod-subrubro"
									value={form.IdSubRubro ?? ''}
									isLoading={false}
									compact
									options={subrubroOptions}
									onChange={(v) =>
										setForm((f) => ({
											...f,
											IdSubRubro: v === '' ? null : Number(v),
										}))
									}
								/>
								<div className={styles.field}>
									<label>Línea</label>
									<input
										type="number"
										value={form.IdLinea ?? ''}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												IdLinea: e.target.value ? Number(e.target.value) : null,
											}))
										}
									/>
								</div>
							</div>
							<p className={styles.prodSubhead}>Atributos</p>
							<div className={styles.formGrid4}>
								<CustomSelect
									label="Un. medida"
									name="prod-unidad"
									value={form.IdUnidad || 'UN'}
									isLoading={false}
									compact
									options={unidadOptions}
									onChange={(v) => setForm((f) => ({ ...f, IdUnidad: String(v) }))}
								/>
								<CustomSelect
									label="Tipo"
									name="prod-tipo"
									value={form.IdTipoPrd ?? ''}
									isLoading={false}
									compact
									options={tipoPrdOptions}
									onChange={(v) =>
										setForm((f) => ({
											...f,
											IdTipoPrd: v === '' ? null : Number(v),
										}))
									}
								/>
								<CustomSelect
									label="Marca"
									name="prod-marca"
									value={form.IdMarca ?? ''}
									isLoading={false}
									compact
									options={marcaOptions}
									onChange={(v) =>
										setForm((f) => ({
											...f,
											IdMarca: v === '' ? null : Number(v),
										}))
									}
								/>
								<CustomSelect
									label="Color"
									name="prod-color"
									value={form.IdColor ?? ''}
									isLoading={false}
									compact
									options={colorOptions}
									onChange={(v) =>
										setForm((f) => ({
											...f,
											IdColor: v === '' ? null : Number(v),
										}))
									}
								/>
							</div>
						</div>
					</section>

					<section className={styles.prodCard}>
						<div className={styles.prodCardHead}>
							<h3 className={styles.prodCardTitle}>Precios y stock</h3>
						</div>
						<div className={styles.prodCardBody}>
							<p className={styles.prodSubhead}>Precios</p>
							<div className={styles.formGrid4}>
								<div className={styles.field}>
									<label>Precio base</label>
									<input
										type="number"
										step="0.0001"
										value={form.PrecioBase ?? 0}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												PrecioBase: Number(e.target.value),
												PrecioVenta: Number(e.target.value),
											}))
										}
									/>
								</div>
								<div className={styles.field}>
									<label>Precio venta</label>
									<input
										type="number"
										step="0.01"
										value={form.PrecioVenta ?? 0}
										onChange={(e) => setForm((f) => ({ ...f, PrecioVenta: Number(e.target.value) }))}
									/>
								</div>
								<div className={styles.field}>
									<label>Precio costo</label>
									<input
										type="number"
										step="0.01"
										value={form.PrecioCosto ?? 0}
										onChange={(e) => setForm((f) => ({ ...f, PrecioCosto: Number(e.target.value) }))}
									/>
								</div>
								<div className={styles.field}>
									<label>Cotización $</label>
									<input
										type="number"
										step="0.01"
										value={form.Cotizacion ?? 0}
										onChange={(e) => setForm((f) => ({ ...f, Cotizacion: Number(e.target.value) }))}
									/>
								</div>
							</div>
							<p className={styles.prodSubhead}>Stock e impuestos</p>
							<div className={styles.formGrid4}>
								<div className={styles.field}>
									<label>Stock mín.</label>
									<input
										type="number"
										step="0.01"
										value={form.StockMinimo ?? 0}
										onChange={(e) => setForm((f) => ({ ...f, StockMinimo: Number(e.target.value) }))}
									/>
								</div>
								<div className={styles.field}>
									<label>Stock máx.</label>
									<input
										type="number"
										step="0.01"
										value={form.StockMaximo ?? 0}
										onChange={(e) => setForm((f) => ({ ...f, StockMaximo: Number(e.target.value) }))}
									/>
								</div>
								<div className={styles.field}>
									<label>Reposición</label>
									<input
										type="number"
										step="0.01"
										value={form.PuntoPedido ?? 0}
										onChange={(e) => setForm((f) => ({ ...f, PuntoPedido: Number(e.target.value) }))}
									/>
								</div>
								<CustomSelect
									label="I.V.A."
									name="prod-iva"
									value={form.IdTipoIva ?? ''}
									isLoading={false}
									compact
									options={ivaOptions}
									onChange={(v) =>
										setForm((f) => ({
											...f,
											IdTipoIva: v === '' ? null : Number(v),
										}))
									}
								/>
								<CustomSelect
									label="Moneda"
									name="prod-moneda"
									value={form.IdMoneda ?? 1}
									isLoading={false}
									compact
									options={monedaOptions}
									onChange={(v) =>
										setForm((f) => ({
											...f,
											IdMoneda: v === '' ? null : Number(v),
										}))
									}
								/>
							</div>
						</div>
					</section>

					<section className={styles.prodCard}>
						<div className={styles.prodCardHead}>
							<h3 className={styles.prodCardTitle}>Imputación contable</h3>
						</div>
						<div className={styles.prodCardBody}>
							<div className={styles.formGrid}>
								<CustomSelect
									label="Cuenta ventas"
									name="prod-cta-vta"
									value={form.IdCtaVta ?? ''}
									isLoading={ctaLoading}
									compact
									options={ctaVtaOpts}
									selectedLabel={optLabel(form.IdCtaVta, form.CtaVtaNombre)}
									onSearchChange={(term) => void searchCuentas(term, 'vta')}
									onChange={(v) => {
										const id = v === '' ? null : Number(v);
										const opt = ctaVtaOpts.find((o) => Number(o.value) === id);
										setForm((f) => ({
											...f,
											IdCtaVta: id,
											CtaVtaNombre: opt?.label || '',
										}));
									}}
								/>
								<CustomSelect
									label="Cuenta compras"
									name="prod-cta-cmp"
									value={form.IdCtaCmpra ?? ''}
									isLoading={ctaLoading}
									compact
									options={ctaCmpOpts}
									selectedLabel={optLabel(form.IdCtaCmpra, form.CtaCmpraNombre)}
									onSearchChange={(term) => void searchCuentas(term, 'cmp')}
									onChange={(v) => {
										const id = v === '' ? null : Number(v);
										const opt = ctaCmpOpts.find((o) => Number(o.value) === id);
										setForm((f) => ({
											...f,
											IdCtaCmpra: id,
											CtaCmpraNombre: opt?.label || '',
										}));
									}}
								/>
							</div>
						</div>
					</section>

					<section className={`${styles.prodCard} ${styles.prodCardLast}`}>
						<div className={styles.prodCardHead}>
							<h3 className={styles.prodCardTitle}>Opciones</h3>
						</div>
						<div className={styles.prodCardBody}>
							<div className={styles.checkRow}>
								<label className={styles.checkItem}>
									<input
										type="checkbox"
										checked={!!Number(form.ControlarStock)}
										onChange={(e) => setFlag('ControlarStock', e.target.checked)}
									/>
									Controlar stock
								</label>
								<label className={styles.checkItem}>
									<input
										type="checkbox"
										checked={!!Number(form.EnLista)}
										onChange={(e) => setFlag('EnLista', e.target.checked)}
									/>
									Si en lista de precios
								</label>
								<label className={styles.checkItem}>
									<input
										type="checkbox"
										checked={!!Number(form.ConFabricacion)}
										onChange={(e) => setFlag('ConFabricacion', e.target.checked)}
									/>
									Es fabricación?
								</label>
								<label className={styles.checkItem}>
									<input
										type="checkbox"
										checked={!!Number(form.EsKit)}
										onChange={(e) => setFlag('EsKit', e.target.checked)}
									/>
									Es combo?
								</label>
								<label className={styles.checkItem}>
									<input
										type="checkbox"
										checked={!!Number(form.EsPartida)}
										onChange={(e) => setFlag('EsPartida', e.target.checked)}
									/>
									Marca en cta. cte.
								</label>
							</div>
						</div>
					</section>
				</div>

				<div className={styles.modalActions}>
					<button type="button" className={styles.btnGhost} onClick={() => setModalOpen(false)}>
						Cancelar
					</button>
					<button type="button" className={styles.btnPrimary} onClick={() => void save()} disabled={saving}>
						{saving ? 'Guardando…' : 'Aceptar'}
					</button>
				</div>
			</Modal>

			<ProductoFichaModal
				idProducto={fichaId}
				fotoVersion={fichaId != null ? fotoVer[fichaId] : undefined}
				onClose={() => setFichaId(null)}
				onEditar={
					canEdit
						? (id) => {
								setFichaId(null);
								void openEdit({ IdProducto: id });
							}
						: undefined
				}
			/>

			<CatalogosProductoModal
				isOpen={catalogosOpen}
				onClose={() => setCatalogosOpen(false)}
				catalogos={catalogos}
				onCambio={() => {
					cargarCatalogos();
					cargarResumen();
				}}
				puedeCrear={canEdit}
				puedeEditar={canEdit}
				puedeEliminar={canDelete}
			/>
		</div>
	);
}
