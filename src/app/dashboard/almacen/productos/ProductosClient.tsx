'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ChevronLeft,
	ChevronRight,
	Package,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	Pencil,
} from 'lucide-react';
import { almacenStockService } from '@/app/services/almacenStockService';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useToast } from '@/app/components/UI/ToastProvider';
import Modal from '@/app/components/UI/Modal';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { mensajeDeError } from '@/app/utils/apiError';
import type { PlanCuentaOpt, ProductoStock, ProductosCatalogos } from '@/app/types/almacenStock';
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
				page,
				pageSize: 40,
			});
			setItems(data.items);
			setTotal(data.total);
			setTotalPages(data.totalPages);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo cargar productos'));
		} finally {
			setLoading(false);
		}
	}, [searchDebounced, page]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		void almacenStockService
			.catalogosProductos()
			.then(setCatalogos)
			.catch(() => setCatalogos(null));
	}, []);

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
		setForm(emptyForm(catalogos?.nextId));
		setCtaVtaOpts([]);
		setCtaCmpOpts([]);
		setModalOpen(true);
	};

	const openEdit = async (row: ProductoStock) => {
		try {
			const full = await almacenStockService.obtenerProducto(row.IdProducto);
			setEditingId(full.IdProducto);
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
			return;
		}
		setSaving(true);
		try {
			const body = { ...form };
			if (editingId != null) {
				await almacenStockService.actualizarProducto(editingId, body);
				toast.success('Producto actualizado');
			} else {
				await almacenStockService.crearProducto(body as FormState);
				toast.success('Producto creado');
				void almacenStockService.catalogosProductos().then(setCatalogos).catch(() => undefined);
			}
			setModalOpen(false);
			await load();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo guardar'));
		} finally {
			setSaving(false);
		}
	};

	const remove = async (row: ProductoStock) => {
		if (!canDelete) return;
		const label = row.Descripcion || String(row.IdProducto);
		if (!window.confirm(`¿Borrar el producto «${label}»?`)) return;
		try {
			await almacenStockService.eliminarProducto(row.IdProducto);
			toast.success('Producto eliminado');
			await load();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo borrar'));
		}
	};

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
						<p>Catálogo de la tabla Productos · {total.toLocaleString('es-AR')} registros</p>
					</div>
				</div>
				<div className={styles.headerActions}>
					<button type="button" className={styles.btnGhost} onClick={() => void load()} disabled={loading}>
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

			<div className={styles.toolbar}>
				<div className={styles.searchRow}>
					<Search size={16} color="#64748b" />
					<input
						className={styles.searchInput}
						placeholder="Buscar por código o descripción…"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
					/>
				</div>
			</div>

			<section className={styles.panel}>
				<div className={styles.tableWrap}>
					{loading && items.length === 0 ? (
						<div className={styles.empty}>Cargando productos…</div>
					) : items.length === 0 ? (
						<div className={styles.empty}>No hay productos para mostrar</div>
					) : (
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Cód. Prod.</th>
									<th>Cód. Secundario</th>
									<th>Descripción / Alias</th>
									<th>Rub. / Sub.</th>
									<th>U. Med.</th>
									<th>Precio V</th>
									{(canEdit || canDelete) && <th className={styles.colActions}>Acciones</th>}
								</tr>
							</thead>
							<tbody>
								{items.map((row) => (
									<tr key={row.IdProducto}>
										<td className={styles.mono}>{row.IdProducto}</td>
										<td className={styles.mono}>{row.CodAlternativo || '—'}</td>
										<td>{row.Descripcion || '—'}</td>
										<td className={styles.muted}>{row.RubSubLin || '—'}</td>
										<td>{row.IdUnidad || '—'}</td>
										<td className={styles.mono}>{fmtMoney(row.PrecioVenta)}</td>
										{(canEdit || canDelete) && (
											<td className={styles.colActions}>
												<div className={styles.rowActions}>
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
										)}
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<div className={styles.pager}>
					<span className={styles.muted}>
						Página {page} de {totalPages}
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
						<div className={styles.prodCardBody}>
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
								<div className={`${styles.field} ${styles.prodGrow}`}>
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
		</div>
	);
}
