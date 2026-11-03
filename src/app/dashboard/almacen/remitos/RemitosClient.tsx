'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Ban,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	Pencil,
	Stethoscope,
} from 'lucide-react';
import { almacenStockService } from '@/app/services/almacenStockService';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useToast } from '@/app/components/UI/ToastProvider';
import { resaltarCampoLuego, resaltarElemento } from '@/app/components/UI/resaltar';
import Modal from '@/app/components/UI/Modal';
import ConfirmDialog from '@/app/components/Agenda/ConfirmDialog';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { mensajeDeError } from '@/app/utils/apiError';
import type {
	CandidatoSalidaServicio,
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

/** Tipos_Remitos.Sentido: E = entrada, S = salida. */
function tagSentido(sentido?: string | null): 'Entrada' | 'Salida' | null {
	const s = String(sentido || '')
		.trim()
		.toUpperCase();
	if (s === 'E') return 'Entrada';
	if (s === 'S') return 'Salida';
	return null;
}

function nombreTipoRemito(t: Pick<RemitoTipo, 'Descripcion' | 'IdTipo'>) {
	return (t.Descripcion || t.IdTipo || '').trim();
}

/** Obra social acortada para la grilla del remito. */
function obraSocialCorta(os?: string | null) {
	const t = (os || '').trim();
	if (!t) return '';
	if (t.length <= 22) return t;
	return `${t.slice(0, 20).trimEnd()}…`;
}

function metaPacienteCorta(it: {
	Cama?: string | null;
	ValorSector?: string | null;
	ObraSocial?: string | null;
}) {
	const parts: string[] = [];
	const sector = (it.ValorSector || '').trim();
	const cama = (it.Cama || '').trim();
	if (sector && cama) parts.push(`${sector} · cama ${cama}`);
	else if (cama) parts.push(`cama ${cama}`);
	else if (sector) parts.push(sector);
	const os = obraSocialCorta(it.ObraSocial);
	if (os) parts.push(os);
	return parts.join(' · ');
}

/**
 * Aviso (no bloquea): cantidades anómalas en remito — p. ej. indicación
 * «continuo» cargada mal (tasa por segundo → total absurdo). El usuario corrige.
 */
function motivoCantidadSospechosa(cant: number, idUnidad?: string | null): string | null {
	const n = Number(cant);
	if (!Number.isFinite(n) || n === 0) return null;
	const abs = Math.abs(n);
	if (abs > 500) {
		return 'cantidad muy alta — revisá si la indicación es continuo u otro error de carga';
	}
	const u = (idUnidad || '').trim().toUpperCase();
	const esUn = !u || u === 'UN' || u === 'U' || u.startsWith('UN ');
	if (esUn && Math.abs(n - Math.round(n)) > 0.001) {
		return 'cantidad con decimales en unidad UN — revisá la carga';
	}
	return null;
}

function fmtCantidad(n?: number | null) {
	if (n == null || !Number.isFinite(Number(n))) return '—';
	const v = Number(n);
	if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
	return v.toLocaleString('es-AR', { maximumFractionDigits: 4 });
}

function ordenTiposPorSentido(a: RemitoTipo, b: RemitoTipo) {
	const ra = tagSentido(a.Sentido) === 'Entrada' ? 0 : tagSentido(a.Sentido) === 'Salida' ? 1 : 2;
	const rb = tagSentido(b.Sentido) === 'Entrada' ? 0 : tagSentido(b.Sentido) === 'Salida' ? 1 : 2;
	if (ra !== rb) return ra - rb;
	return nombreTipoRemito(a).localeCompare(nombreTipoRemito(b), 'es');
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
	const [proveedorLabel, setProveedorLabel] = useState('');
	const [proveedorOpts, setProveedorOpts] = useState<{ value: number; label: string }[]>([]);
	const [proveedorLoading, setProveedorLoading] = useState(false);
	const [idCliente, setIdCliente] = useState<number | ''>('');
	const [clienteLabel, setClienteLabel] = useState('');
	const [clienteOpts, setClienteOpts] = useState<{ value: number; label: string }[]>([]);
	const [clienteLoading, setClienteLoading] = useState(false);
	const [grupo, setGrupo] = useState(new Date().getFullYear());
	const [letra, setLetra] = useState('X');
	const [nro, setNro] = useState(0);
	const [observaciones, setObservaciones] = useState('');
	const [remitoMainTab, setRemitoMainTab] = useState<'items' | 'obs'>('items');
	/** Punto en solapa Observaciones: se limpia al entrar a la solapa. */
	const [obsDotVisible, setObsDotVisible] = useState(false);
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
	const [confirmCantOpen, setConfirmCantOpen] = useState(false);
	const [confirmCantMsg, setConfirmCantMsg] = useState('');
	const [editingCantKey, setEditingCantKey] = useState<string | null>(null);
	const [editingCantValue, setEditingCantValue] = useState('');
	const cantInputRef = useRef<HTMLInputElement | null>(null);
	const [cargandoCandidatos, setCargandoCandidatos] = useState(false);
	const [candidatosOpen, setCandidatosOpen] = useState(false);
	const [candidatos, setCandidatos] = useState<CandidatoSalidaServicio[]>([]);
	const [candidatosMeta, setCandidatosMeta] = useState<{ sector: string; visitas: number } | null>(
		null,
	);
	const [excluyendoId, setExcluyendoId] = useState<number | null>(null);

	const esSalidaServicio = String(tipoCbte || '').toUpperCase() === 'RSM';

	const tiposOrdenados = useMemo(() => [...tipos].sort(ordenTiposPorSentido), [tipos]);

	const tipoOptions = useMemo(
		() =>
			tiposOrdenados.map((t) => {
				const tag = tagSentido(t.Sentido);
				return {
					value: t.IdTipo,
					label: nombreTipoRemito(t),
					badge: tag || undefined,
					badgeTone: (tag === 'Entrada'
						? 'entrada'
						: tag === 'Salida'
							? 'salida'
							: undefined) as 'entrada' | 'salida' | undefined,
				};
			}),
		[tiposOrdenados],
	);
	const depositoOptions = useMemo(
		() =>
			depositos.map((d) => ({
				value: d.IdDeposito,
				label:
					d.Label ||
					(d.SectorNombre &&
					d.Descripcion &&
					d.SectorNombre.toUpperCase() !== d.Descripcion.toUpperCase()
						? `${d.Descripcion} — ${d.SectorNombre}`
						: d.Descripcion || String(d.IdDeposito)),
			})),
		[depositos],
	);
	const depositoFiltroOptions = useMemo(
		() => [{ value: '', label: 'Todos los depósitos' }, ...depositoOptions],
		[depositoOptions],
	);
	const proveedorCatalogOpts = useMemo(
		() =>
			proveedores.map((p) => ({
				value: p.IdProveedor,
				label: p.Descripcion || String(p.IdProveedor),
			})),
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
		setProveedorLabel('');
		setProveedorOpts(proveedorCatalogOpts);
		setIdCliente('');
		setClienteLabel('');
		setClienteOpts([]);
		setGrupo(new Date().getFullYear());
		setLetra('X');
		setObservaciones('');
		setRemitoMainTab('items');
		setObsDotVisible(false);
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
		setProveedorLabel(
			full.ProveedorNombre || (full.IdProveedor != null ? String(full.IdProveedor) : ''),
		);
		setProveedorOpts(
			full.IdProveedor != null
				? [
						{
							value: full.IdProveedor,
							label: full.ProveedorNombre || String(full.IdProveedor),
						},
						...proveedorCatalogOpts.filter((o) => Number(o.value) !== Number(full.IdProveedor)),
					]
				: proveedorCatalogOpts,
		);
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
		const obs = (full.observaciones || [])
			.map((o) => o.Comentarios || '')
			.filter(Boolean)
			.join('\n');
		setObservaciones(obs);
		setRemitoMainTab('items');
		setObsDotVisible(!!obs.trim());
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
		setProveedorLabel('');
		setProveedorOpts(proveedorCatalogOpts);
		setIdCliente('');
		setClienteLabel('');
		setClienteOpts([]);
	}, [modalOpen, tipoCbte, proveedorCatalogOpts]);

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

	const searchProveedores = async (q: string) => {
		const term = q.trim();
		if (!term) {
			setProveedorOpts(proveedorCatalogOpts);
			return;
		}
		if (term.length < 2 && !/^\d+$/.test(term)) return;
		setProveedorLoading(true);
		try {
			const hits = await almacenStockService.buscarProveedores(term);
			setProveedorOpts(
				hits.map((p) => ({
					value: p.IdProveedor,
					label: p.Descripcion || String(p.IdProveedor),
				})),
			);
		} catch {
			setProveedorOpts(proveedorCatalogOpts);
		} finally {
			setProveedorLoading(false);
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
		const pacLabel =
			(it.PacienteNombre || '').trim() ||
			(it.IdPaciente != null ? String(it.IdPaciente) : '');
		setItemForm({
			IdProducto: String(it.IdProducto),
			DescripcionProducto: it.DescripcionProducto || '',
			Cantidad: String(it.Cantidad),
			ImporteUnitario: String(it.ImporteUnitario),
			IdPaciente: it.IdPaciente != null ? String(it.IdPaciente) : '',
			PacienteLabel: pacLabel,
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
				? [{ value: it.IdPaciente, label: pacLabel || String(it.IdPaciente) }]
				: [],
		);
		setItemModal(true);
	};

	const avisarCampo = (campo: string, mensaje: string) => {
		toast.error(mensaje);
		resaltarCampoLuego(campo);
	};

	const commitItem = () => {
		const idProd = Number(itemForm.IdProducto);
		const cant = Number(itemForm.Cantidad);
		const unit = Number(itemForm.ImporteUnitario);
		if (!Number.isFinite(idProd) || idProd <= 0 || !itemForm.DescripcionProducto.trim()) {
			avisarCampo('item-producto', 'Seleccioná un producto válido de la tabla Productos');
			return;
		}
		if (!Number.isFinite(cant) || cant === 0) {
			avisarCampo('item-cantidad', 'Cantidad inválida');
			return;
		}
		// Id paciente: solo si viene de imPacientes (lookup), no texto libre
		if ((itemForm.PacienteLabel || '').trim() && !itemForm.IdPaciente) {
			avisarCampo('item-paciente', 'Seleccioná el paciente desde la tabla imPacientes');
			return;
		}
		const prev = editingItemKey
			? draftItems.find((x) => x._key === editingItemKey)
			: undefined;
		const pacNombre =
			(itemForm.PacienteLabel || '').trim() || prev?.PacienteNombre || null;
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
			PacienteNombre: pacNombre,
			Cama: prev?.Cama ?? null,
			ValorSector: prev?.ValorSector ?? null,
			ObraSocial: prev?.ObraSocial ?? null,
			NroIndicacion: prev?.NroIndicacion ?? null,
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

	const cargarCandidatosServicio = async () => {
		if (!esSalidaServicio) {
			avisarCampo('remito-tipo', 'Esta acción es solo para remito salida a servicio (RSM)');
			return;
		}
		if (idDepositoDest === '') {
			avisarCampo('remito-dep-dest', 'Seleccioná primero el depósito destino (sector/servicio)');
			return;
		}
		setCargandoCandidatos(true);
		try {
			const data = await almacenStockService.candidatosSalidaServicio({
				idDepositoDest: Number(idDepositoDest),
				fecha,
			});
			setCandidatos(data.lineas || []);
			setCandidatosMeta({ sector: data.valorSector, visitas: data.visitas });
			setCandidatosOpen(true);
			if (!(data.lineas || []).length) {
				toast.info(
					`Sin medicación pendiente en ${data.valorSector} para ${fecha} (${data.visitas} internaciones)`,
				);
			}
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudieron cargar las indicaciones del servicio'));
		} finally {
			setCargandoCandidatos(false);
		}
	};

	const aplicarCandidatos = (lineas: CandidatoSalidaServicio[]) => {
		const usable = lineas.filter(
			(l) =>
				l.IdProducto != null &&
				(Number(l.CantidadPendiente) > 0 || Number(l.CantidadSugerida) > 0),
		);
		const sinProd = lineas.filter((l) => l.IdProducto == null).length;
		if (!usable.length) {
			toast.error(
				sinProd
					? 'Hay líneas sin producto en catálogo (troquel ↔ Productos). Revisá el mapeo.'
					: 'No hay cantidades pendientes para agregar',
			);
			return;
		}
		const ya = new Set(
			draftItems.map((d) => d.NroIndicacion).filter((n): n is number => n != null && n > 0),
		);
		const nuevos: DraftItem[] = usable
			.filter((l) => !ya.has(l.NroIndicacion))
			.map((l) => {
				const cant = Number(l.CantidadSugerida) || Number(l.CantidadPendiente) || 0;
				const unit = Number(l.ImporteUnitario) || 0;
				return {
					_key: newItemKey(),
					IdProducto: Number(l.IdProducto),
					DescripcionProducto: l.DescripcionProducto || undefined,
					Cantidad: cant,
					IdUnidad: l.IdUnidad || undefined,
					ImporteUnitario: unit,
					ImporteTotal: cant * unit,
					IdPaciente: l.IdPaciente ?? null,
					PacienteNombre: l.PacienteNombre || null,
					Cama: l.Cama || null,
					ValorSector: l.ValorSector || null,
					ObraSocial: l.ObraSocial || null,
					NroIndicacion: l.NroIndicacion,
				};
			})
			.filter((l) => l.Cantidad > 0);
		if (!nuevos.length) {
			toast.info('Esas indicaciones ya estaban en el remito');
			return;
		}
		setDraftItems((prev) => [...prev, ...nuevos]);
		setCandidatosOpen(false);
		toast.success(
			`Se agregaron ${nuevos.length} ítem${nuevos.length === 1 ? '' : 's'}${
				sinProd ? ` (${sinProd} sin producto omitidos)` : ''
			}`,
		);
		const sospechosas = nuevos.filter((it) => motivoCantidadSospechosa(it.Cantidad, it.IdUnidad));
		if (sospechosas.length) {
			const ej = sospechosas[0];
			const motivo = motivoCantidadSospechosa(ej.Cantidad, ej.IdUnidad);
			toast.warning(
				sospechosas.length === 1
					? `Revisá la cantidad de «${ej.DescripcionProducto || ej.IdProducto}» (${fmtCantidad(ej.Cantidad)}): ${motivo}`
					: `${sospechosas.length} ítems tienen cantidad sospechosa (ej. ${fmtCantidad(ej.Cantidad)}). Revisá antes de aceptar.`,
			);
		}
	};

	const excluirCandidato = async (nro: number) => {
		setExcluyendoId(nro);
		try {
			await almacenStockService.excluirIndicacionEntrega(nro);
			setCandidatos((prev) => prev.filter((c) => c.NroIndicacion !== nro));
			toast.success('Indicación excluida: no volverá a aparecer en remitos');
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo excluir la indicación'));
		} finally {
			setExcluyendoId(null);
		}
	};

	useEffect(() => {
		if (!editingCantKey) return;
		cantInputRef.current?.focus();
		cantInputRef.current?.select();
	}, [editingCantKey]);

	const startEditCantidad = (key: string, cant: number) => {
		setEditingCantKey(key);
		setEditingCantValue(String(cant));
	};

	const cancelEditCantidad = () => {
		setEditingCantKey(null);
		setEditingCantValue('');
	};

	const commitEditCantidad = (key: string) => {
		const raw = editingCantValue.trim().replace(',', '.');
		const cant = Number(raw);
		if (!Number.isFinite(cant) || cant === 0) {
			toast.error('Cantidad inválida');
			if (cantInputRef.current) resaltarElemento(cantInputRef.current);
			return;
		}
		setDraftItems((prev) =>
			prev.map((it) => {
				if (it._key !== key) return it;
				const unit = Number(it.ImporteUnitario) || 0;
				return {
					...it,
					Cantidad: cant,
					ImporteTotal: cant * unit,
				};
			}),
		);
		cancelEditCantidad();
	};

	const ejecutarGuardadoRemito = async () => {
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
				NroIndicacion: it.NroIndicacion ?? null,
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
			setConfirmCantOpen(false);
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

	const saveRemito = async () => {
		if (!tipoCbte) {
			avisarCampo('remito-tipo', 'Seleccioná el tipo de remito (Tipos_Remitos)');
			return;
		}
		if (idDeposito === '') {
			avisarCampo('remito-deposito', 'Seleccioná el depósito (Depositos)');
			return;
		}
		if (campos.usaDepDestino && idDepositoDest === '') {
			avisarCampo('remito-dep-dest', 'Seleccioná el depósito destino (Depositos)');
			return;
		}
		if (campos.usaProveedor && idProveedor === '') {
			avisarCampo('remito-proveedor', 'Seleccioná el proveedor (PROVEEDORES)');
			return;
		}
		if (campos.usaCliente && (idCliente === '' || !Number.isFinite(Number(idCliente)))) {
			avisarCampo('remito-cliente', 'Seleccioná un cliente de la tabla Clientes');
			return;
		}
		if (!draftItems.length) {
			toast.error('Agregá al menos un ítem');
			setRemitoMainTab('items');
			resaltarCampoLuego('remito-agregar-item');
			return;
		}
		let itemsActuales = draftItems;
		if (editingCantKey) {
			const raw = editingCantValue.trim().replace(',', '.');
			const cant = Number(raw);
			if (!Number.isFinite(cant) || cant === 0) {
				toast.error('Cantidad inválida');
				if (cantInputRef.current) resaltarElemento(cantInputRef.current);
				return;
			}
			itemsActuales = draftItems.map((it) => {
				if (it._key !== editingCantKey) return it;
				const unit = Number(it.ImporteUnitario) || 0;
				return { ...it, Cantidad: cant, ImporteTotal: cant * unit };
			});
			setDraftItems(itemsActuales);
			cancelEditCantidad();
		}
		const cantSospechosas = itemsActuales.filter((it) =>
			motivoCantidadSospechosa(it.Cantidad, it.IdUnidad),
		);
		if (cantSospechosas.length) {
			const maxList = 8;
			const lineas = cantSospechosas.slice(0, maxList).map((it) => {
				const motivo = motivoCantidadSospechosa(it.Cantidad, it.IdUnidad) || '';
				const nombre = (it.DescripcionProducto || String(it.IdProducto)).trim();
				return `• ${nombre}: ${fmtCantidad(it.Cantidad)} — ${motivo}`;
			});
			const extra =
				cantSospechosas.length > maxList
					? `\n…y ${cantSospechosas.length - maxList} más.`
					: '';
			setConfirmCantMsg(
				`Hay ${cantSospechosas.length} ítem${cantSospechosas.length === 1 ? '' : 's'} con cantidad anómala:\n\n${lineas.join('\n')}${extra}\n\nDoble clic en la cantidad para corregir, o guardá igual.`,
			);
			setConfirmCantOpen(true);
			return;
		}
		await ejecutarGuardadoRemito();
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
						{tiposOrdenados.map((t) => {
							const tag = tagSentido(t.Sentido);
							return (
								<option key={t.IdTipo} value={t.IdTipo}>
									{tag ? `${tag} · ${nombreTipoRemito(t)}` : nombreTipoRemito(t)}
								</option>
							);
						})}
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
											<span className={styles.tipoCell}>
												{(() => {
													const tag = tagSentido(
														tipos.find((t) => t.IdTipo === row.TipoCbte)?.Sentido,
													);
													return (
														<>
															{tag ? (
																<span
																	className={`${styles.sentidoTag} ${
																		tag === 'Entrada'
																			? styles.sentidoEntrada
																			: styles.sentidoSalida
																	}`}
																>
																	{tag}
																</span>
															) : null}
															<span>{row.TipoNombre || row.TipoCbte || '—'}</span>
														</>
													);
												})()}
											</span>
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
				size="full"
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
								<div className={styles.tipoCell}>
									{(() => {
										const tag = tagSentido(
											tipos.find((t) => t.IdTipo === detail.TipoCbte)?.Sentido,
										);
										return (
											<>
												{tag ? (
													<span
														className={`${styles.sentidoTag} ${
															tag === 'Entrada'
																? styles.sentidoEntrada
																: styles.sentidoSalida
														}`}
													>
														{tag}
													</span>
												) : null}
												<span>
													{detail.TipoNombre || detail.TipoCbte || '—'}
												</span>
											</>
										);
									})()}
								</div>
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
										value={detail.ProveedorNombre || String(detail.IdProveedor || '')}
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
										<th>Paciente</th>
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
											<td className={`${styles.mono} ${styles.colTotal}`}>
												{fmtMoney(it.ImporteTotal)}
											</td>
											<td className={styles.pacienteCell}>
												{it.PacienteNombre || it.IdPaciente != null ? (
													<>
														<div className={styles.pacienteNombre}>
															{it.PacienteNombre || `Pac. ${it.IdPaciente}`}
														</div>
														{metaPacienteCorta(it) ? (
															<div className={styles.pacienteMeta}>{metaPacienteCorta(it)}</div>
														) : it.IdPaciente != null && it.PacienteNombre ? (
															<div className={styles.pacienteMeta}>#{it.IdPaciente}</div>
														) : null}
													</>
												) : (
													<span className={styles.muted}>—</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className={styles.totals}>
							<div className={styles.totalItem}>
								<span className={styles.totalLabel}>Total bultos</span>
								<span className={styles.totalValue}>{fmtCantidad(detail.Bultos ?? 0)}</span>
							</div>
							<div className={`${styles.totalItem} ${styles.totalItemPrimary}`}>
								<span className={styles.totalLabel}>Total remito</span>
								<span className={styles.totalValue}>
									{fmtMoney(detail.TotalRemito ?? detail.ImportePPP)}
								</span>
							</div>
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
				size="full"
			>
				<div className={styles.remitoModal}>
					<section className={`${styles.remitoCabCard} ${styles.remitoCabCompact}`}>
						<div className={styles.remitoCabCardBody}>
							<div className={styles.remitoCabRow}>
								<div className={`${styles.field} ${styles.remitoFecha}`}>
									<label>Fecha</label>
									<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
								</div>
								<div className={`${styles.field} ${styles.remitoTipo}`} data-resaltar="remito-tipo">
									<label>Tipo de remito</label>
									<CustomSelect
										label=""
										name="remito-tipo"
										value={tipoCbte}
										isLoading={false}
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
								<div className={styles.remitoDepPair}>
									<div className={`${styles.field} ${styles.remitoDepField}`} data-resaltar="remito-deposito">
										<label>Depósito</label>
										<CustomSelect
											label=""
											name="remito-deposito"
											value={idDeposito}
											isLoading={false}
											options={depositoOptions}
											onChange={(v) => setIdDeposito(v === '' ? '' : Number(v))}
										/>
									</div>
									{campos.usaDepDestino && (
										<div className={`${styles.field} ${styles.remitoDepField}`} data-resaltar="remito-dep-dest">
											<label>Depósito destino</label>
											<CustomSelect
												label=""
												name="remito-dep-dest"
												value={idDepositoDest}
												isLoading={false}
												options={depositoOptions}
												onChange={(v) => setIdDepositoDest(v === '' ? '' : Number(v))}
											/>
										</div>
									)}
								</div>
								{campos.usaProveedor && (
									<div className={`${styles.field} ${styles.remitoGrow}`} data-resaltar="remito-proveedor">
										<label>Proveedor</label>
										<CustomSelect
											label=""
											name="remito-proveedor"
											value={idProveedor}
											isLoading={proveedorLoading}
											options={proveedorOpts.length ? proveedorOpts : proveedorCatalogOpts}
											selectedLabel={proveedorLabel || undefined}
											onSearchChange={(term) => void searchProveedores(term)}
											onChange={(v) => {
												const id = Number(v);
												const opt = (proveedorOpts.length ? proveedorOpts : proveedorCatalogOpts).find(
													(o) => Number(o.value) === id,
												);
												setIdProveedor(Number.isFinite(id) ? id : '');
												setProveedorLabel(opt?.label || '');
											}}
										/>
									</div>
								)}
								{campos.usaCliente && (
									<div className={`${styles.field} ${styles.remitoGrow}`} data-resaltar="remito-cliente">
										<label>Cliente</label>
										<CustomSelect
											label=""
											name="remito-cliente"
											value={idCliente}
											isLoading={clienteLoading}
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
						</div>
					</section>

					<section className={`${styles.remitoSection} ${styles.remitoSectionItems}`}>
						<div className={styles.remitoTablePanel}>
							<div className={styles.remitoTableHead}>
								<div className={styles.remitoPanelTabs} role="tablist" aria-label="Sección del remito">
									<button
										type="button"
										role="tab"
										aria-selected={remitoMainTab === 'items'}
										className={`${styles.remitoPanelTab}${
											remitoMainTab === 'items' ? ` ${styles.remitoPanelTabActive}` : ''
										}`}
										onClick={() => {
											setRemitoMainTab('items');
											if (observaciones.trim()) setObsDotVisible(true);
										}}
									>
										Ítems
									</button>
									<button
										type="button"
										role="tab"
										aria-selected={remitoMainTab === 'obs'}
										className={`${styles.remitoPanelTab}${
											remitoMainTab === 'obs' ? ` ${styles.remitoPanelTabActive}` : ''
										}`}
										onClick={() => {
											setRemitoMainTab('obs');
											setObsDotVisible(false);
										}}
									>
										Observaciones
										{obsDotVisible ? (
											<span className={styles.remitoObsDot} aria-label="Hay observaciones" />
										) : null}
									</button>
								</div>
								<div
									className={`${styles.remitoTableHeadActions}${
										remitoMainTab !== 'items' ? ` ${styles.remitoTableHeadActionsHidden}` : ''
									}`}
									aria-hidden={remitoMainTab !== 'items'}
								>
									{esSalidaServicio && (
										<button
											type="button"
											className={styles.btnGhost}
											disabled={cargandoCandidatos || remitoMainTab !== 'items'}
											tabIndex={remitoMainTab === 'items' ? undefined : -1}
											onClick={() => void cargarCandidatosServicio()}
											title="Medicación y descartables (Tipo M) de internaciones activas del depósito destino"
										>
											<Stethoscope size={14} />
											{cargandoCandidatos ? 'Cargando…' : 'Desde internaciones'}
										</button>
									)}
									<button
										type="button"
										className={styles.btnAddInTable}
										data-resaltar="remito-agregar-item"
										disabled={remitoMainTab !== 'items'}
										tabIndex={remitoMainTab === 'items' ? undefined : -1}
										onClick={openAddItem}
									>
										<Plus size={14} />
										Agregar ítem
									</button>
								</div>
							</div>
							{remitoMainTab === 'items' ? (
								<>
									<div className={`${styles.tableWrap} ${styles.remitoTableScroll}`}>
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
													draftItems.map((it) => {
														const avisoCant = motivoCantidadSospechosa(it.Cantidad, it.IdUnidad);
														return (
														<tr key={it._key} className={avisoCant ? styles.rowWarn : undefined}>
															<td className={styles.mono}>{it.IdProducto}</td>
															<td>{it.DescripcionProducto || '—'}</td>
															<td
																className={`${styles.mono} ${styles.cantCell}${avisoCant ? ` ${styles.cantWarn}` : ''}`}
																title={
																	editingCantKey === it._key
																		? undefined
																		: avisoCant
																			? `${avisoCant} · Doble clic para editar`
																			: 'Doble clic para editar cantidad'
																}
																onDoubleClick={() => {
																	if (editingCantKey !== it._key) {
																		startEditCantidad(it._key, it.Cantidad);
																	}
																}}
															>
																{editingCantKey === it._key ? (
																	<input
																		ref={cantInputRef}
																		className={styles.cantInlineInput}
																		type="text"
																		inputMode="decimal"
																		value={editingCantValue}
																		aria-label={`Cantidad de ${it.DescripcionProducto || it.IdProducto}`}
																		onChange={(e) => setEditingCantValue(e.target.value)}
																		onBlur={() => commitEditCantidad(it._key)}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter') {
																				e.preventDefault();
																				commitEditCantidad(it._key);
																			} else if (e.key === 'Escape') {
																				e.preventDefault();
																				cancelEditCantidad();
																			}
																		}}
																	/>
																) : (
																	<>
																		{fmtCantidad(it.Cantidad)}
																		{avisoCant ? (
																			<span className={styles.cantWarnHint} aria-label={avisoCant}>
																				{' '}
																				!
																			</span>
																		) : null}
																	</>
																)}
															</td>
															<td>{it.IdUnidad || '—'}</td>
															<td className={styles.mono}>{fmtMoney(it.ImporteUnitario)}</td>
															<td className={`${styles.mono} ${styles.colTotal}`}>
																{fmtMoney(it.ImporteTotal)}
															</td>
															<td className={styles.pacienteCell}>
																{it.PacienteNombre || it.IdPaciente != null ? (
																	<>
																		<div className={styles.pacienteNombre}>
																			{it.PacienteNombre || `Pac. ${it.IdPaciente}`}
																		</div>
																		{metaPacienteCorta(it) ? (
																			<div className={styles.pacienteMeta}>{metaPacienteCorta(it)}</div>
																		) : it.IdPaciente != null && it.PacienteNombre ? (
																			<div className={styles.pacienteMeta}>#{it.IdPaciente}</div>
																		) : null}
																	</>
																) : (
																	<span className={styles.muted}>—</span>
																)}
															</td>
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
														);
													})
												)}
											</tbody>
										</table>
									</div>
									<div className={styles.totals}>
										<div className={styles.totalItem}>
											<span className={styles.totalLabel}>Total bultos</span>
											<span className={styles.totalValue}>{fmtCantidad(totalBultos)}</span>
										</div>
										<div className={`${styles.totalItem} ${styles.totalItemPrimary}`}>
											<span className={styles.totalLabel}>Total remito</span>
											<span className={styles.totalValue}>{fmtMoney(totalRemito)}</span>
										</div>
									</div>
								</>
							) : (
								<div className={styles.remitoObsPanel}>
									<label className={styles.remitoObsLabel} htmlFor="remito-observaciones">
										Notas del remito
									</label>
									<textarea
										id="remito-observaciones"
										className={styles.remitoObsTextarea}
										rows={10}
										value={observaciones}
										onChange={(e) => {
											const v = e.target.value;
											setObservaciones(v);
											if (v.trim()) setObsDotVisible(false);
										}}
										placeholder="Observaciones…"
										autoFocus
									/>
								</div>
							)}
						</div>
					</section>

					<footer className={styles.remitoFooter}>
						<div className={styles.remitoFooterActions}>
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
					</footer>
				</div>
			</Modal>

			<ConfirmDialog
				open={confirmCantOpen}
				title="Cantidades anómalas"
				message={confirmCantMsg}
				confirmLabel="Guardar igual"
				cancelLabel="Revisar"
				busy={saving}
				onCancel={() => setConfirmCantOpen(false)}
				onConfirm={() => void ejecutarGuardadoRemito()}
			/>

			{/* Candidatos medicación/descartables de internaciones (RSM) */}
			<Modal
				isOpen={candidatosOpen}
				onClose={() => setCandidatosOpen(false)}
				title="Medicación de internaciones"
				size="xlarge"
			>
				<p className={styles.muted} style={{ margin: '0 0 0.75rem' }}>
					Tipo M · sin expirar · no excluidas
					{candidatosMeta
						? ` · sector ${candidatosMeta.sector} · ${candidatosMeta.visitas} internaciones · ${fecha}`
						: ''}
				</p>
				<div className={styles.tableWrap} style={{ maxHeight: 420 }}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Paciente</th>
								<th>Indicación</th>
								<th>Frec.</th>
								<th>Cant.</th>
								<th>Pend.</th>
								<th>Producto</th>
								<th className={styles.colActions}>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{candidatos.length === 0 ? (
								<tr>
									<td colSpan={7} className={styles.empty}>
										No hay líneas para cargar.
									</td>
								</tr>
							) : (
								candidatos.map((c) => (
									<tr key={c.NroIndicacion}>
										<td className={styles.pacienteCell}>
											<div className={styles.pacienteNombre}>{c.PacienteNombre || '—'}</div>
											<div className={styles.pacienteMeta}>
												{[
													c.Cama ? `cama ${c.Cama}` : '',
													obraSocialCorta(c.ObraSocial),
													`vis. ${c.NumeroVisita}`,
												]
													.filter(Boolean)
													.join(' · ')}
											</div>
										</td>
										<td>
											<div>{c.DescripcionProducto}</div>
											<div className={styles.muted}>
												{c.TipoIndicacionDescripcion || 'M'} · ind. {c.NroIndicacion}
											</div>
										</td>
										<td>{c.Frecuencia || '—'}</td>
										<td className={styles.mono}>{c.Cantidad}</td>
										<td className={styles.mono}>{c.CantidadPendiente}</td>
										<td className={styles.mono}>
											{c.IdProducto != null ? c.IdProducto : (
												<span className={styles.muted}>sin match</span>
											)}
										</td>
										<td className={styles.colActions}>
											<button
												type="button"
												className={styles.actionDelete}
												title="Excluir de entrega (no vuelve a aparecer)"
												disabled={excluyendoId === c.NroIndicacion}
												onClick={() => void excluirCandidato(c.NroIndicacion)}
											>
												<Ban size={16} />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				<div className={styles.modalActions}>
					<button type="button" className={styles.btnGhost} onClick={() => setCandidatosOpen(false)}>
						Cerrar
					</button>
					<button
						type="button"
						className={styles.btnPrimary}
						disabled={!candidatos.some((c) => c.IdProducto != null)}
						onClick={() => aplicarCandidatos(candidatos)}
					>
						Agregar al remito
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
					<div className={styles.full} data-resaltar="item-producto">
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
					<div className={styles.field} data-resaltar="item-cantidad">
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
					<div className={styles.full} data-resaltar="item-paciente">
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
