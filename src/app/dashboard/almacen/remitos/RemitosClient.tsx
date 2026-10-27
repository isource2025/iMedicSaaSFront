'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ChevronLeft,
	ChevronRight,
	ClipboardList,
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
import type {
	ProductoStock,
	RemitoCabecera,
	RemitoDeposito,
	RemitoItem,
	RemitoProveedor,
	RemitoTipo,
} from '@/app/types/almacenStock';
import styles from '../stock.module.css';

type DraftItem = RemitoItem & { _key: string };

function todayISO() {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function toDateInput(v?: string | null) {
	if (!v) return todayISO();
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return String(v).slice(0, 10) || todayISO();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function fmtDate(v?: string | null) {
	if (!v) return '—';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
	return d.toLocaleDateString('es-AR');
}

function fmtMoney(n?: number | null) {
	if (n == null || Number.isNaN(Number(n))) return '$0.00';
	return Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function newItemKey() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function camposTipo(t?: RemitoTipo | null) {
	return {
		usaProveedor: !!t?.usaProveedor,
		usaDepDestino: !!t?.usaDepDestino,
		usaCliente: !!t?.usaCliente,
	};
}

export default function RemitosClient() {
	const { puede } = usePermiso();
	const toast = useToast();
	const canCreate = puede('ALMACEN.REMITOS.CREAR');
	const canEdit = puede('ALMACEN.REMITOS.EDITAR');
	const canDelete = puede('ALMACEN.REMITOS.ELIMINAR');
	const skipTipoReset = useRef(false);

	const [search, setSearch] = useState('');
	const [searchDebounced, setSearchDebounced] = useState('');
	const [tipoFiltro, setTipoFiltro] = useState('');
	const [depFiltro, setDepFiltro] = useState('');
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [items, setItems] = useState<RemitoCabecera[]>([]);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);

	// Catálogos = tablas Tiporemitos / Depositos / Proveedores
	const [tipos, setTipos] = useState<RemitoTipo[]>([]);
	const [depositos, setDepositos] = useState<RemitoDeposito[]>([]);
	const [proveedores, setProveedores] = useState<RemitoProveedor[]>([]);

	const [detailOpen, setDetailOpen] = useState(false);
	const [detail, setDetail] = useState<RemitoCabecera | null>(null);

	const [modalOpen, setModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [fecha, setFecha] = useState(todayISO());
	const [tipoCbte, setTipoCbte] = useState('');
	const [idDeposito, setIdDeposito] = useState<number | ''>('');
	const [idDepositoDest, setIdDepositoDest] = useState<number | ''>('');
	const [idProveedor, setIdProveedor] = useState<number | ''>('');
	const [idCliente, setIdCliente] = useState<number | ''>('');
	const [clienteLabel, setClienteLabel] = useState('');
	const [clienteOpts, setClienteOpts] = useState<{ value: number; label: string }[]>([]);
	const [clienteLoading, setClienteLoading] = useState(false);
	const [grupo, setGrupo] = useState(new Date().getFullYear());
	const [letra, setLetra] = useState('X');
	const [nro, setNro] = useState(0);
	const [observaciones, setObservaciones] = useState('');
	const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
	const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
	const [itemModal, setItemModal] = useState(false);
	const [itemForm, setItemForm] = useState({
		IdProducto: '',
		DescripcionProducto: '',
		Cantidad: '1',
		ImporteUnitario: '0',
		IdPaciente: '',
		PacienteLabel: '',
		IdUnidad: '',
	});
	const [prodOpts, setProdOpts] = useState<{ value: number; label: string }[]>([]);
	const [prodLoading, setProdLoading] = useState(false);
	const [pacOpts, setPacOpts] = useState<{ value: number; label: string }[]>([]);
	const [pacLoading, setPacLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const tipoOptions = useMemo(
		() => tipos.map((t) => ({ value: t.IdTipo, label: t.Descripcion || t.IdTipo })),
		[tipos],
	);
	const depositoOptions = useMemo(
		() =>
			depositos.map((d) => ({
				value: d.IdDeposito,
				label: d.Descripcion || String(d.IdDeposito),
			})),
		[depositos],
	);
	const depositoFiltroOptions = useMemo(
		() => [{ value: '', label: 'Todos los depósitos' }, ...depositoOptions],
		[depositoOptions],
	);
	const proveedorOptions = useMemo(
		() => proveedores.map((p) => ({ value: p.IdProveedor, label: p.Descripcion || String(p.IdProveedor) })),
		[proveedores],
	);

	const tipoActivo = useMemo(
		() => tipos.find((t) => t.IdTipo === tipoCbte) || null,
		[tipos, tipoCbte],
	);
	const campos = camposTipo(tipoActivo);

	const totalRemito = useMemo(
		() => draftItems.reduce((acc, it) => acc + (Number(it.ImporteTotal) || 0), 0),
		[draftItems],
	);
	const totalBultos = useMemo(
		() => draftItems.reduce((acc, it) => acc + Math.abs(Number(it.Cantidad) || 0), 0),
		[draftItems],
	);

	useEffect(() => {
		const t = setTimeout(() => setSearchDebounced(search), 280);
		return () => clearTimeout(t);
	}, [search]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await almacenStockService.listarRemitos({
				search: searchDebounced,
				tipo: tipoFiltro || undefined,
				idDeposito: depFiltro ? Number(depFiltro) : undefined,
				page,
				pageSize: 30,
			});
			setItems(data.items);
			setTotal(data.total);
			setTotalPages(data.totalPages);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo cargar remitos'));
		} finally {
			setLoading(false);
		}
	}, [searchDebounced, tipoFiltro, depFiltro, page]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		void almacenStockService
			.catalogosRemitos()
			.then((c) => {
				setTipos(c.tipos || []);
				setDepositos(c.depositos || []);
				setProveedores(c.proveedores || []);
			})
			.catch(() => {
				setTipos([]);
				setDepositos([]);
				setProveedores([]);
			});
	}, []);

	const openDetail = async (row: RemitoCabecera) => {
		try {
			const full = await almacenStockService.obtenerRemito(row.IdTransaccion);
			setDetail(full);
			setDetailOpen(true);
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo abrir el remito'));
		}
	};

	const openCreate = async () => {
		const defaultTipo = tipos[0]?.IdTipo || 'REM';
		const defaultDep = depositos[0]?.IdDeposito ?? '';
		setEditingId(null);
		skipTipoReset.current = true;
		setFecha(todayISO());
		setTipoCbte(defaultTipo);
		setIdDeposito(defaultDep);
		setIdDepositoDest('');
		setIdProveedor('');
		setIdCliente('');
		setClienteLabel('');
		setClienteOpts([]);
		setGrupo(new Date().getFullYear());
		setLetra('X');
		setObservaciones('');
		setDraftItems([]);
		setEditingItemKey(null);
		try {
			const prox = await almacenStockService.proximoNroRemito(defaultTipo, new Date().getFullYear());
			setNro(prox.nro);
			setGrupo(prox.grupo);
			setLetra(prox.letra || 'X');
		} catch {
			setNro(1);
		}
		setModalOpen(true);
	};

	const fillFormFromRemito = (full: RemitoCabecera) => {
		skipTipoReset.current = true;
		setEditingId(full.IdTransaccion);
		setFecha(toDateInput(full.Fecha));
		setTipoCbte(full.TipoCbte || '');
		setIdDeposito(full.IdDeposito ?? '');
		setIdDepositoDest(full.IdDepositoDest ?? '');
		setIdProveedor(full.IdProveedor ?? '');
		setIdCliente(full.IdCliente ?? '');
		setClienteLabel(full.ClienteNombre || (full.IdCliente != null ? String(full.IdCliente) : ''));
		setClienteOpts(
			full.IdCliente != null
				? [
						{
							value: full.IdCliente,
							label: full.ClienteNombre || String(full.IdCliente),
						},
					]
				: [],
		);
		setGrupo(full.GrupoCbte ?? new Date().getFullYear());
		setLetra(full.LetraCbte || 'X');
		setNro(full.NroCbte ?? 0);
		setObservaciones(
			(full.observaciones || [])
				.map((o) => o.Comentarios || '')
				.filter(Boolean)
				.join('\n'),
		);
		setDraftItems(
			(full.items || []).map((it) => ({
				...it,
				_key: newItemKey(),
			})),
		);
		setEditingItemKey(null);
	};

	const openEdit = async (row: RemitoCabecera) => {
		try {
			const full = await almacenStockService.obtenerRemito(row.IdTransaccion);
			fillFormFromRemito(full);
			setDetailOpen(false);
			setModalOpen(true);
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo abrir el remito para editar'));
		}
	};

	const removeRemito = async (row: RemitoCabecera) => {
		if (!canDelete) return;
		const label = row.NroRemitoFmt || String(row.IdTransaccion);
		if (!window.confirm(`¿Borrar el remito «${label}»? Esta acción no se puede deshacer.`)) return;
		try {
			await almacenStockService.eliminarRemito(row.IdTransaccion);
			toast.success('Remito eliminado');
			if (detail?.IdTransaccion === row.IdTransaccion) {
				setDetailOpen(false);
				setDetail(null);
			}
			await load();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo eliminar el remito'));
		}
	};

	useEffect(() => {
		if (!modalOpen || !tipoCbte || editingId != null) return;
		void almacenStockService
			.proximoNroRemito(tipoCbte, grupo)
			.then((p) => {
				setNro(p.nro);
				setLetra(p.letra || 'X');
			})
			.catch(() => undefined);
	}, [modalOpen, tipoCbte, grupo, editingId]);

	useEffect(() => {
		if (!modalOpen) return;
		if (skipTipoReset.current) {
			skipTipoReset.current = false;
			return;
		}
		setIdDepositoDest('');
		setIdProveedor('');
		setIdCliente('');
		setClienteLabel('');
		setClienteOpts([]);
	}, [modalOpen, tipoCbte]);

	const nombreProducto = (p: ProductoStock) =>
		(p.Descripcion || p.DescripcionC || '').trim();

	const pickProducto = (p: ProductoStock) => {
		const nombre = nombreProducto(p);
		setItemForm((f) => ({
			...f,
			IdProducto: String(p.IdProducto),
			DescripcionProducto: nombre,
			ImporteUnitario: String(p.PrecioVenta ?? 0),
			IdUnidad: p.IdUnidad || '',
		}));
		setProdOpts([
			{
				value: p.IdProducto,
				label: nombre ? `${p.IdProducto} — ${nombre}` : String(p.IdProducto),
			},
		]);
	};

	const searchProductos = async (q: string) => {
		setProdLoading(true);
		try {
			const term = q.trim();
			const pageData = await almacenStockService.listarProductos({
				search: term,
				campo: /^\d+$/.test(term) ? 'codigo' : 'descripcion',
				page: 1,
				pageSize: 20,
			});
			const opts = pageData.items.map((p) => {
				const nombre = nombreProducto(p);
				return {
					value: p.IdProducto,
					label: nombre ? `${p.IdProducto} — ${nombre}` : String(p.IdProducto),
				};
			});
			setProdOpts(opts);
		} catch {
			setProdOpts([]);
		} finally {
			setProdLoading(false);
		}
	};

	const onSelectProducto = async (raw: string | number) => {
		const id = Number(raw);
		if (!Number.isFinite(id) || id <= 0) return;
		try {
			const p = await almacenStockService.obtenerProducto(id);
			pickProducto(p);
		} catch {
			const hit = prodOpts.find((o) => Number(o.value) === id);
			setItemForm((f) => ({
				...f,
				IdProducto: String(id),
				DescripcionProducto: hit?.label.replace(/^\d+\s*—\s*/, '') || f.DescripcionProducto,
			}));
			toast.error('No se pudo cargar el producto seleccionado');
		}
	};

	const searchPacientes = async (q: string) => {
		const term = q.trim();
		if (term.length < 2) {
			setPacOpts([]);
			return;
		}
		setPacLoading(true);
		try {
			const hits = await almacenStockService.buscarPacientes(term);
			setPacOpts(
				hits.map((p) => ({
					value: p.IdPaciente,
					label: `${p.Descripcion || p.IdPaciente}${p.Documento ? ` (${p.Documento})` : ''}`,
				})),
			);
		} catch {
			setPacOpts([]);
		} finally {
			setPacLoading(false);
		}
	};

	const searchClientes = async (q: string) => {
		const term = q.trim();
		if (term.length < 2) {
			setClienteOpts([]);
			return;
		}
		setClienteLoading(true);
		try {
			const hits = await almacenStockService.buscarClientes(term);
			setClienteOpts(
				hits.map((c) => ({
					value: c.IdCliente,
					label: c.Descripcion || String(c.IdCliente),
				})),
			);
		} catch {
			setClienteOpts([]);
		} finally {
			setClienteLoading(false);
		}
	};

	const openAddItem = () => {
		setEditingItemKey(null);
		setItemForm({
			IdProducto: '',
			DescripcionProducto: '',
			Cantidad: '1',
			ImporteUnitario: '0',
			IdPaciente: '',
			PacienteLabel: '',
			IdUnidad: '',
		});
		setProdOpts([]);
		setPacOpts([]);
		setItemModal(true);
	};

	const openEditItem = (key: string) => {
		const it = draftItems.find((x) => x._key === key);
		if (!it) return;
		setEditingItemKey(key);
		setItemForm({
			IdProducto: String(it.IdProducto),
			DescripcionProducto: it.DescripcionProducto || '',
			Cantidad: String(it.Cantidad),
			ImporteUnitario: String(it.ImporteUnitario),
			IdPaciente: it.IdPaciente != null ? String(it.IdPaciente) : '',
			PacienteLabel: it.IdPaciente != null ? String(it.IdPaciente) : '',
			IdUnidad: it.IdUnidad || '',
		});
		setProdOpts(
			it.IdProducto
				? [
						{
							value: it.IdProducto,
							label: `${it.IdProducto} — ${it.DescripcionProducto || ''}`,
						},
					]
				: [],
		);
		setPacOpts(
			it.IdPaciente != null
				? [{ value: it.IdPaciente, label: String(it.IdPaciente) }]
				: [],
		);
		setItemModal(true);
	};

	const commitItem = () => {
		const idProd = Number(itemForm.IdProducto);
		const cant = Number(itemForm.Cantidad);
		const unit = Number(itemForm.ImporteUnitario);
		if (!Number.isFinite(idProd) || idProd <= 0 || !itemForm.DescripcionProducto.trim()) {
			toast.error('Seleccioná un producto válido de la tabla Productos');
			return;
		}
		if (!Number.isFinite(cant) || cant === 0) {
			toast.error('Cantidad inválida');
			return;
		}
		// Id paciente: solo si viene de imPacientes (lookup), no texto libre
		if ((itemForm.PacienteLabel || '').trim() && !itemForm.IdPaciente) {
			toast.error('Seleccioná el paciente desde la tabla imPacientes');
			return;
		}
		const row: DraftItem = {
			_key:
				editingItemKey && draftItems.some((x) => x._key === editingItemKey)
					? editingItemKey
					: newItemKey(),
			IdProducto: idProd,
			DescripcionProducto: itemForm.DescripcionProducto,
			Cantidad: cant,
			IdUnidad: itemForm.IdUnidad || undefined,
			ImporteUnitario: unit,
			ImporteTotal: cant * unit,
			IdPaciente: itemForm.IdPaciente ? Number(itemForm.IdPaciente) : null,
		};
		setDraftItems((prev) => {
			const idx = prev.findIndex((x) => x._key === row._key);
			if (idx >= 0) {
				const next = [...prev];
				next[idx] = row;
				return next;
			}
			return [...prev, row];
		});
		setEditingItemKey(null);
		setItemModal(false);
	};

	const deleteItem = (key: string) => {
		setDraftItems((prev) => prev.filter((x) => x._key !== key));
		if (editingItemKey === key) setEditingItemKey(null);
	};

	const saveRemito = async () => {
		if (!tipoCbte) {
			toast.error('Seleccioná el tipo de remito (Tipos_Remitos)');
			return;
		}
		if (idDeposito === '') {
			toast.error('Seleccioná el depósito (Depositos)');
			return;
		}
		if (campos.usaDepDestino && idDepositoDest === '') {
			toast.error('Seleccioná el depósito destino (Depositos)');
			return;
		}
		if (campos.usaProveedor && idProveedor === '') {
			toast.error('Seleccioná el proveedor (PROVEEDORES)');
			return;
		}
		if (campos.usaCliente && (idCliente === '' || !Number.isFinite(Number(idCliente)))) {
			toast.error('Seleccioná un cliente de la tabla Clientes');
			return;
		}
		if (!draftItems.length) {
			toast.error('Agregá al menos un ítem');
			return;
		}
		const isEdit = editingId != null;
		setSaving(true);
		const payload = {
			Fecha: fecha,
			TipoCbte: tipoCbte,
			IdDeposito: Number(idDeposito),
			IdDepositoDest: campos.usaDepDestino ? Number(idDepositoDest) : null,
			IdProveedor: campos.usaProveedor ? Number(idProveedor) : null,
			IdCliente: campos.usaCliente ? Number(idCliente) : null,
			GrupoCbte: grupo,
			LetraCbte: letra,
			NroCbte: nro,
			Bultos: Math.round(totalBultos),
			Observaciones: observaciones || undefined,
			items: draftItems.map((it) => ({
				IdProducto: it.IdProducto,
				Cantidad: it.Cantidad,
				ImporteUnitario: it.ImporteUnitario,
				ImporteTotal: it.ImporteTotal,
				IdPaciente: it.IdPaciente ?? null,
			})),
		};
		try {
			const saved = isEdit
				? await almacenStockService.actualizarRemito(editingId!, payload)
				: await almacenStockService.crearRemito(payload);
			toast.success(
				isEdit
					? `Remito ${saved.NroRemitoFmt || saved.IdTransaccion} actualizado`
					: `Remito ${saved.NroRemitoFmt || saved.IdTransaccion} guardado`,
			);
			setModalOpen(false);
			setEditingId(null);
			if (!isEdit) setPage(1);
			await load();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo guardar el remito. Intentá de nuevo.'));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className={styles.wrap}>
			<header className={styles.header}>
				<div className={styles.titleLeft}>
					<div className={styles.titleIcon}>
						<ClipboardList size={22} />
					</div>
					<div className={styles.titleBlock}>
						<h1>Remitos</h1>
						<p>
							Cabecera Remitos + detalle RemitosItems · {total.toLocaleString('es-AR')} comprobantes
						</p>
					</div>
				</div>
				<div className={styles.headerActions}>
					<button type="button" className={styles.btnGhost} onClick={() => void load()} disabled={loading}>
						<RefreshCw size={16} />
						Actualizar
					</button>
					{canCreate && (
						<button type="button" className={styles.btnPrimary} onClick={() => void openCreate()}>
							<Plus size={16} />
							Nuevo remito
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
						placeholder="Buscar por nº, tipo o depósito…"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
					/>
					<select
						className={styles.select}
						value={tipoFiltro}
						onChange={(e) => {
							setTipoFiltro(e.target.value);
							setPage(1);
						}}
					>
						<option value="">Todos los tipos</option>
						{tipos.map((t) => (
							<option key={t.IdTipo} value={t.IdTipo}>
								{t.IdTipo} — {t.Descripcion}
							</option>
						))}
					</select>
					<div className={styles.toolbarSelect}>
						<CustomSelect
							label=""
							name="filtro-deposito"
							value={depFiltro}
							isLoading={false}
							compact
							options={depositoFiltroOptions}
							onChange={(v) => {
								setDepFiltro(v === '' || v == null ? '' : String(v));
								setPage(1);
							}}
						/>
					</div>
				</div>
			</div>

			<section className={styles.panel}>
				<div className={styles.tableWrap}>
					{loading && items.length === 0 ? (
						<div className={styles.empty}>Cargando remitos…</div>
					) : items.length === 0 ? (
						<div className={styles.empty}>No hay remitos para mostrar</div>
					) : (
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Id</th>
									<th>Fecha</th>
									<th>Tipo</th>
									<th>Nº remito</th>
									<th>Depósito</th>
									<th>Bultos</th>
									<th>Importe</th>
									{(canEdit || canDelete) && <th className={styles.colActions}>Acciones</th>}
								</tr>
							</thead>
							<tbody>
								{items.map((row) => (
									<tr key={row.IdTransaccion} onClick={() => void openDetail(row)}>
										<td className={styles.mono}>{row.IdTransaccion}</td>
										<td>{fmtDate(row.Fecha)}</td>
										<td>
											<span className={styles.mono}>{row.TipoCbte}</span>{' '}
											<span className={styles.muted}>{row.TipoNombre || ''}</span>
										</td>
										<td className={styles.mono}>{row.NroRemitoFmt}</td>
										<td>{row.DepositoNombre || row.IdDeposito}</td>
										<td className={styles.mono}>{row.Bultos ?? 0}</td>
										<td className={styles.mono}>{fmtMoney(row.ImportePPP)}</td>
										{(canEdit || canDelete) && (
											<td className={styles.colActions}>
												<div className={styles.rowActions}>
													{canEdit && (
														<button
															type="button"
															className={styles.actionEdit}
															title="Editar"
															aria-label={`Editar remito ${row.NroRemitoFmt || row.IdTransaccion}`}
															onClick={(e) => {
																e.stopPropagation();
																void openEdit(row);
															}}
														>
															<Pencil size={16} />
														</button>
													)}
													{canDelete && (
														<button
															type="button"
															className={styles.actionDelete}
															title="Eliminar"
															aria-label={`Eliminar remito ${row.NroRemitoFmt || row.IdTransaccion}`}
															onClick={(e) => {
																e.stopPropagation();
																void removeRemito(row);
															}}
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

			{/* Detalle */}
			<Modal
				isOpen={detailOpen}
				onClose={() => setDetailOpen(false)}
				title={detail ? `Remito ${detail.NroRemitoFmt || detail.IdTransaccion}` : 'Remito'}
				size="xlarge"
			>
				{detail && (
					<>
						<div className={styles.remitoHead}>
							<div className={styles.field}>
								<label>Fecha</label>
								<input value={fmtDate(detail.Fecha)} readOnly />
							</div>
							<div className={styles.field}>
								<label>Tipo (Tipos_Remitos)</label>
								<input value={`${detail.TipoCbte || ''} — ${detail.TipoNombre || ''}`} readOnly />
							</div>
							<div className={styles.field}>
								<label>Depósito (Depositos)</label>
								<input value={detail.DepositoNombre || String(detail.IdDeposito || '')} readOnly />
							</div>
							<div className={styles.field}>
								<label>Nº remito</label>
								<input value={detail.NroRemitoFmt || ''} readOnly />
							</div>
							{detail.DepositoDestNombre || detail.IdDepositoDest ? (
								<div className={styles.field}>
									<label>Depósito destino</label>
									<input
										value={detail.DepositoDestNombre || String(detail.IdDepositoDest || '')}
										readOnly
									/>
								</div>
							) : null}
							{detail.ProveedorNombre || detail.IdProveedor ? (
								<div className={styles.field}>
									<label>Proveedor (PROVEEDORES)</label>
									<input
										value={
											detail.ProveedorNombre
												? `${detail.IdProveedor} — ${detail.ProveedorNombre}`
												: String(detail.IdProveedor || '')
										}
										readOnly
									/>
								</div>
							) : null}
							{detail.ClienteNombre || detail.IdCliente ? (
								<div className={styles.field}>
									<label>Cliente (Clientes)</label>
									<input
										value={
											detail.ClienteNombre
												? `${detail.IdCliente} — ${detail.ClienteNombre}`
												: String(detail.IdCliente || '')
										}
										readOnly
									/>
								</div>
							) : null}
						</div>
						<div className={styles.tableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Cód Prod</th>
										<th>Descripción</th>
										<th>Cantidad</th>
										<th>U Med</th>
										<th>Imp. unitario</th>
										<th>Importe total</th>
										<th>Id paciente</th>
									</tr>
								</thead>
								<tbody>
									{(detail.items || []).map((it) => (
										<tr key={`${it.IdTransaccion}-${it.Renglon}`}>
											<td className={styles.mono}>{it.IdProducto}</td>
											<td>{it.DescripcionProducto || '—'}</td>
											<td className={styles.mono}>{it.Cantidad}</td>
											<td>{it.IdUnidad || '—'}</td>
											<td className={styles.mono}>{fmtMoney(it.ImporteUnitario)}</td>
											<td className={styles.mono}>{fmtMoney(it.ImporteTotal)}</td>
											<td className={styles.mono}>{it.IdPaciente ?? '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className={styles.totals}>
							<span>Total bultos: {detail.Bultos ?? 0}</span>
							<span>Total remito: {fmtMoney(detail.TotalRemito ?? detail.ImportePPP)}</span>
						</div>
						{(canEdit || canDelete) && (
							<div className={styles.modalActions}>
								<button type="button" className={styles.btnGhost} onClick={() => setDetailOpen(false)}>
									Cerrar
								</button>
								{canDelete && (
									<button
										type="button"
										className={styles.btnGhost}
										onClick={() => void removeRemito(detail)}
									>
										Eliminar
									</button>
								)}
								{canEdit && (
									<button
										type="button"
										className={styles.btnPrimary}
										onClick={() => void openEdit(detail)}
									>
										Editar
									</button>
								)}
							</div>
						)}
					</>
				)}
			</Modal>

			{/* Alta / edición remito — cabecera Remitos */}
			<Modal
				isOpen={modalOpen}
				onClose={() => {
					setModalOpen(false);
					setEditingId(null);
				}}
				title={editingId != null ? 'Editando un Remito' : 'Agregando un Remito'}
				size="xlarge"
			>
				<div className={styles.remitoModal}>
					<section className={styles.remitoSection}>
						<h3 className={styles.remitoSectionTitle}>Comprobante</h3>
						<div className={styles.remitoCabRow}>
							<div className={`${styles.field} ${styles.remitoFecha}`}>
								<label>Fecha</label>
								<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
							</div>
							<div className={styles.remitoTipo}>
								<CustomSelect
									label="Tipo de remito"
									name="remito-tipo"
									value={tipoCbte}
									isLoading={false}
									compact
									options={tipoOptions}
									onChange={(v) => setTipoCbte(String(v))}
								/>
							</div>
							<div className={`${styles.field} ${styles.remitoNro}`}>
								<label>Número</label>
								<div className={styles.nroRemitoInputs}>
									<input
										value={grupo}
										onChange={(e) => setGrupo(Number(e.target.value) || 0)}
										aria-label="Grupo / año"
									/>
									<input
										className={styles.nroLetra}
										value={letra}
										maxLength={1}
										onChange={(e) => setLetra(e.target.value.toUpperCase())}
										aria-label="Letra"
									/>
									<input
										className={styles.nroCbte}
										value={nro}
										onChange={(e) => setNro(Number(e.target.value) || 0)}
										aria-label="Número"
									/>
								</div>
							</div>
						</div>
					</section>

					<section className={styles.remitoSection}>
						<h3 className={styles.remitoSectionTitle}>Depósito y contraparte</h3>
						<div className={styles.remitoCabRow}>
							<div className={styles.remitoGrow}>
								<CustomSelect
									label="Depósito"
									name="remito-deposito"
									value={idDeposito}
									isLoading={false}
									compact
									options={depositoOptions}
									onChange={(v) => setIdDeposito(v === '' ? '' : Number(v))}
								/>
							</div>
							{campos.usaDepDestino && (
								<div className={styles.remitoGrow}>
									<CustomSelect
										label="Depósito destino"
										name="remito-dep-dest"
										value={idDepositoDest}
										isLoading={false}
										compact
										options={depositoOptions}
										onChange={(v) => setIdDepositoDest(v === '' ? '' : Number(v))}
									/>
								</div>
							)}
							{campos.usaProveedor && (
								<div className={styles.remitoGrow}>
									<CustomSelect
										label="Proveedor"
										name="remito-proveedor"
										value={idProveedor}
										isLoading={false}
										compact
										options={proveedorOptions}
										onChange={(v) => setIdProveedor(v === '' ? '' : Number(v))}
									/>
								</div>
							)}
							{campos.usaCliente && (
								<div className={styles.remitoGrow}>
									<CustomSelect
										label="Cliente"
										name="remito-cliente"
										value={idCliente}
										isLoading={clienteLoading}
										compact
										options={clienteOpts}
										selectedLabel={clienteLabel || undefined}
										onSearchChange={(term) => void searchClientes(term)}
										onChange={(v) => {
											const id = Number(v);
											const opt = clienteOpts.find((o) => Number(o.value) === id);
											setIdCliente(Number.isFinite(id) ? id : '');
											setClienteLabel(opt?.label || '');
										}}
									/>
								</div>
							)}
						</div>
					</section>

					<section className={styles.remitoSection}>
						<div className={styles.remitoTablePanel}>
							<div className={styles.remitoTableHead}>
								<h3 className={styles.remitoSectionTitle}>Ítems</h3>
								<button type="button" className={styles.btnAddInTable} onClick={openAddItem}>
									<Plus size={14} />
									Agregar ítem
								</button>
							</div>
							<div className={styles.tableWrap} style={{ maxHeight: 280 }}>
								<table className={styles.table}>
									<thead>
										<tr>
											<th>Cód.</th>
											<th>Descripción</th>
											<th>Cant.</th>
											<th>U.Med</th>
											<th>Imp. unit.</th>
											<th>Total</th>
											<th>Paciente</th>
											<th className={styles.colActions}>Acciones</th>
										</tr>
									</thead>
									<tbody>
										{draftItems.length === 0 ? (
											<tr>
												<td colSpan={8} className={styles.muted} style={{ textAlign: 'center' }}>
													Sin ítems — usá «Agregar ítem»
												</td>
											</tr>
										) : (
											draftItems.map((it) => (
												<tr key={it._key}>
													<td className={styles.mono}>{it.IdProducto}</td>
													<td>{it.DescripcionProducto || '—'}</td>
													<td className={styles.mono}>{it.Cantidad}</td>
													<td>{it.IdUnidad || '—'}</td>
													<td className={styles.mono}>{fmtMoney(it.ImporteUnitario)}</td>
													<td className={styles.mono}>{fmtMoney(it.ImporteTotal)}</td>
													<td className={styles.mono}>{it.IdPaciente ?? '—'}</td>
													<td className={styles.colActions}>
														<div className={styles.rowActions}>
															<button
																type="button"
																className={styles.actionEdit}
																title="Editar"
																aria-label={`Editar ítem ${it.IdProducto}`}
																onClick={() => openEditItem(it._key)}
															>
																<Pencil size={16} />
															</button>
															<button
																type="button"
																className={styles.actionDelete}
																title="Eliminar"
																aria-label={`Eliminar ítem ${it.IdProducto}`}
																onClick={() => deleteItem(it._key)}
															>
																<Trash2 size={16} />
															</button>
														</div>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
							<div className={styles.totals}>
								<span>Total bultos: {totalBultos}</span>
								<span>Total remito: {fmtMoney(totalRemito)}</span>
							</div>
						</div>
					</section>

					<section className={`${styles.remitoSection} ${styles.remitoSectionLast}`}>
						<div className={styles.field}>
							<label>Observaciones</label>
							<textarea
								rows={2}
								value={observaciones}
								onChange={(e) => setObservaciones(e.target.value)}
								placeholder="Notas del remito…"
							/>
						</div>
					</section>
				</div>

				<div className={styles.modalActions}>
					<button
						type="button"
						className={styles.btnGhost}
						onClick={() => {
							setModalOpen(false);
							setEditingId(null);
						}}
					>
						Cancelar
					</button>
					<button
						type="button"
						className={styles.btnPrimary}
						disabled={saving}
						onClick={() => void saveRemito()}
					>
						{saving ? 'Guardando…' : 'Aceptar'}
					</button>
				</div>
			</Modal>

			{/* Ítem — RemitosItems + Productos + imPacientes */}
			<Modal
				isOpen={itemModal}
				onClose={() => setItemModal(false)}
				title="Ítem de remito"
				size="medium"
				priority="high"
			>
				<div className={styles.formGrid}>
					<div className={styles.full}>
						<CustomSelect
							label="Producto"
							name="item-producto"
							value={itemForm.IdProducto ? Number(itemForm.IdProducto) : ''}
							isLoading={prodLoading}
							options={prodOpts}
							selectedLabel={
								itemForm.IdProducto && itemForm.DescripcionProducto
									? `${itemForm.IdProducto} — ${itemForm.DescripcionProducto}`
									: undefined
							}
							onSearchChange={(term) => void searchProductos(term)}
							onChange={(v) => void onSelectProducto(v)}
						/>
					</div>
					<div className={styles.field}>
						<label>Cantidad</label>
						<input
							type="number"
							step="0.01"
							value={itemForm.Cantidad}
							onChange={(e) => setItemForm((f) => ({ ...f, Cantidad: e.target.value }))}
						/>
					</div>
					<div className={styles.field}>
						<label>U. Med.</label>
						<input value={itemForm.IdUnidad} readOnly />
					</div>
					<div className={styles.field}>
						<label>Imp. unitario</label>
						<input
							type="number"
							step="0.01"
							value={itemForm.ImporteUnitario}
							onChange={(e) => setItemForm((f) => ({ ...f, ImporteUnitario: e.target.value }))}
						/>
					</div>
					<div className={styles.full}>
						<CustomSelect
							label="Paciente"
							name="item-paciente"
							value={itemForm.IdPaciente ? Number(itemForm.IdPaciente) : ''}
							isLoading={pacLoading}
							options={pacOpts}
							selectedLabel={itemForm.PacienteLabel || undefined}
							onSearchChange={(term) => void searchPacientes(term)}
							onChange={(v) => {
								const id = Number(v);
								const opt = pacOpts.find((o) => Number(o.value) === id);
								setItemForm((f) => ({
									...f,
									IdPaciente: Number.isFinite(id) ? String(id) : '',
									PacienteLabel: opt?.label || '',
								}));
							}}
						/>
					</div>
				</div>
				<div className={styles.modalActions}>
					<button type="button" className={styles.btnGhost} onClick={() => setItemModal(false)}>
						Cancelar
					</button>
					<button type="button" className={styles.btnPrimary} onClick={commitItem}>
						Aceptar
					</button>
				</div>
			</Modal>
		</div>
	);
}
