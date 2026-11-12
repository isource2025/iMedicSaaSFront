'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Ban,
	Bell,
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
import { IoCloseCircleOutline } from 'react-icons/io5';
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
	MedicacionPendienteServicio,
	MedicacionPendienteServiciosResp,
	ProductoStock,
	RemitoCabecera,
	RemitoDeposito,
	RemitoItem,
	RemitoProveedor,
	RemitoTipo,
} from '@/app/types/almacenStock';
import styles from '../stock.module.css';

const STATUS_ANULADO = 0;

type DraftItem = RemitoItem & { _key: string };

type RemitoMainTab = 'items' | 'agrupados' | 'obs';
type ItemsSortKey =
	| 'IdProducto'
	| 'DescripcionProducto'
	| 'Cantidad'
	| 'IdUnidad'
	| 'ImporteUnitario'
	| 'ImporteTotal'
	| 'PacienteNombre';
type SortDir = 'asc' | 'desc';

type ItemAgrupado = {
	IdProducto: number;
	DescripcionProducto: string;
	IdUnidad: string | null;
	Cantidad: number;
	ImporteUnitario: number | null;
	ImporteTotal: number;
	lineas: number;
	pacientes: number;
};

type AgrupadosSortKey =
	| 'IdProducto'
	| 'DescripcionProducto'
	| 'Cantidad'
	| 'IdUnidad'
	| 'ImporteUnitario'
	| 'ImporteTotal'
	| 'lineas'
	| 'pacientes';

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

function esRemitoAnulado(row: Pick<RemitoCabecera, 'IdStatus'>) {
	return Number(row.IdStatus) === STATUS_ANULADO;
}

/** Origen → destino y signo de cantidad según el sentido del tipo. */
function trayectoRemito(
	row: RemitoCabecera,
	sentidoTipo?: string | null,
): { desde: string; hacia: string; entrada: boolean; cant: number } {
	const tag = tagSentido(row.Sentido || sentidoTipo);
	const entrada = tag === 'Entrada';
	const dep =
		(row.DepositoNombre || '').trim() ||
		(row.IdDeposito != null ? `Dep. ${row.IdDeposito}` : '—');
	const destDep = (row.DepositoDestNombre || '').trim();
	const proveedor = (row.ProveedorNombre || '').trim();
	const cliente = (row.ClienteNombre || '').trim();
	const dest =
		destDep ||
		(entrada ? proveedor : '') ||
		cliente ||
		(String(row.TipoCbte || '').toUpperCase() === 'RSP' ? 'Paciente' : '') ||
		'—';
	if (entrada) {
		return {
			desde: dest !== '—' ? dest : proveedor || 'Externo',
			hacia: dep,
			entrada: true,
			cant: Math.abs(Number(row.Bultos) || 0),
		};
	}
	return {
		desde: dep,
		hacia: dest,
		entrada: false,
		cant: Math.abs(Number(row.Bultos) || 0),
	};
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
/** Cantidad de remito: solo enteros (sin decimales). */
function parseCantidadEntera(raw: string | number | null | undefined): number | null {
	const s = String(raw ?? '')
		.trim()
		.replace(',', '.');
	if (!s) return null;
	const n = Number(s);
	if (!Number.isFinite(n) || n === 0) return null;
	if (!Number.isInteger(n)) return null;
	return n;
}

function soloDigitosCantidad(raw: string) {
	// Permite "-" al inicio (ajustes) y solo dígitos; bloquea punto/coma.
	const neg = raw.trim().startsWith('-');
	const digits = raw.replace(/[^\d]/g, '');
	if (!digits) return neg ? '-' : '';
	return neg ? `-${digits}` : digits;
}

function motivoCantidadSospechosa(cant: number, idUnidad?: string | null): string | null {
	const n = Number(cant);
	if (!Number.isFinite(n) || n === 0) return null;
	const abs = Math.abs(n);
	if (abs > 500) {
		return 'cantidad muy alta — revisá si la indicación es continuo u otro error de carga';
	}
	return null;
}

function fmtCantidad(n?: number | null) {
	if (n == null || !Number.isFinite(Number(n))) return '—';
	return String(Math.round(Number(n)));
}

function ordenTiposPorSentido(a: RemitoTipo, b: RemitoTipo) {
	const ra = tagSentido(a.Sentido) === 'Entrada' ? 0 : tagSentido(a.Sentido) === 'Salida' ? 1 : 2;
	const rb = tagSentido(b.Sentido) === 'Entrada' ? 0 : tagSentido(b.Sentido) === 'Salida' ? 1 : 2;
	if (ra !== rb) return ra - rb;
	return nombreTipoRemito(a).localeCompare(nombreTipoRemito(b), 'es');
}

function cmpSortVal(a: string | number | null | undefined, b: string | number | null | undefined, dir: SortDir) {
	const mul = dir === 'asc' ? 1 : -1;
	const av = a == null || a === '' ? null : a;
	const bv = b == null || b === '' ? null : b;
	if (av == null && bv == null) return 0;
	if (av == null) return 1;
	if (bv == null) return -1;
	if (typeof av === 'number' && typeof bv === 'number') {
		if (av === bv) return 0;
		return av < bv ? -mul : mul;
	}
	return String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' }) * mul;
}

function toggleSort<K extends string>(
	prev: { key: K; dir: SortDir } | null,
	key: K,
): { key: K; dir: SortDir } {
	if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
	return { key, dir: 'asc' };
}

function agruparItemsPorCodigo(items: RemitoItem[]): ItemAgrupado[] {
	const map = new Map<number, ItemAgrupado & { _unitarios: Set<string>; _pacientes: Set<string> }>();
	for (const it of items) {
		const id = Number(it.IdProducto);
		if (!Number.isFinite(id)) continue;
		const cant = Number(it.Cantidad) || 0;
		const total = Number(it.ImporteTotal) || 0;
		const unit = Number(it.ImporteUnitario);
		const pacKey =
			it.IdPaciente != null
				? `id:${it.IdPaciente}`
				: (it.PacienteNombre || '').trim()
					? `n:${(it.PacienteNombre || '').trim().toUpperCase()}`
					: '';
		let g = map.get(id);
		if (!g) {
			g = {
				IdProducto: id,
				DescripcionProducto: (it.DescripcionProducto || '').trim() || `Código ${id}`,
				IdUnidad: (it.IdUnidad || '').trim() || null,
				Cantidad: 0,
				ImporteUnitario: null,
				ImporteTotal: 0,
				lineas: 0,
				pacientes: 0,
				_unitarios: new Set(),
				_pacientes: new Set(),
			};
			map.set(id, g);
		}
		g.Cantidad += cant;
		g.ImporteTotal += total;
		g.lineas += 1;
		if (Number.isFinite(unit)) g._unitarios.add(String(unit));
		if (pacKey) g._pacientes.add(pacKey);
		const u = (it.IdUnidad || '').trim();
		if (u && !g.IdUnidad) g.IdUnidad = u;
		else if (u && g.IdUnidad && u.toUpperCase() !== g.IdUnidad.toUpperCase()) g.IdUnidad = 'varios';
		const desc = (it.DescripcionProducto || '').trim();
		if (desc && (!g.DescripcionProducto || g.DescripcionProducto.startsWith('Código '))) {
			g.DescripcionProducto = desc;
		}
	}
	return Array.from(map.values())
		.map(({ _unitarios, _pacientes, ...rest }) => ({
			...rest,
			ImporteUnitario:
				_unitarios.size === 1
					? Number(Array.from(_unitarios)[0])
					: rest.Cantidad !== 0
						? rest.ImporteTotal / rest.Cantidad
						: null,
			pacientes: _pacientes.size,
		}))
		.sort((a, b) => a.IdProducto - b.IdProducto);
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
	const [remitoMainTab, setRemitoMainTab] = useState<RemitoMainTab>('items');
	/** Punto en solapa Observaciones: se limpia al entrar a la solapa. */
	const [obsDotVisible, setObsDotVisible] = useState(false);
	const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
	const [itemsSort, setItemsSort] = useState<{ key: ItemsSortKey; dir: SortDir } | null>(null);
	const [agrupadosSort, setAgrupadosSort] = useState<{
		key: AgrupadosSortKey;
		dir: SortDir;
	} | null>({ key: 'IdProducto', dir: 'asc' });
	const [detailSort, setDetailSort] = useState<{ key: ItemsSortKey; dir: SortDir } | null>(null);
	const [detailTab, setDetailTab] = useState<'items' | 'agrupados'>('items');
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
	const [anularTarget, setAnularTarget] = useState<RemitoCabecera | null>(null);
	const [anulando, setAnulando] = useState(false);
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
	const [pendienteMed, setPendienteMed] = useState<MedicacionPendienteServiciosResp | null>(null);
	const [pendienteMedLoading, setPendienteMedLoading] = useState(false);
	const [pendienteMedError, setPendienteMedError] = useState<string | null>(null);
	const [autoOpenCandidatos, setAutoOpenCandidatos] = useState(false);

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

	const draftItemsSorted = useMemo(() => {
		if (!itemsSort) return draftItems;
		const { key, dir } = itemsSort;
		return [...draftItems].sort((a, b) => {
			const av =
				key === 'PacienteNombre'
					? a.PacienteNombre || (a.IdPaciente != null ? String(a.IdPaciente) : '')
					: a[key];
			const bv =
				key === 'PacienteNombre'
					? b.PacienteNombre || (b.IdPaciente != null ? String(b.IdPaciente) : '')
					: b[key];
			return cmpSortVal(av as string | number | null | undefined, bv as string | number | null | undefined, dir);
		});
	}, [draftItems, itemsSort]);

	const draftAgrupados = useMemo(() => agruparItemsPorCodigo(draftItems), [draftItems]);

	const draftAgrupadosSorted = useMemo(() => {
		if (!agrupadosSort) return draftAgrupados;
		const { key, dir } = agrupadosSort;
		return [...draftAgrupados].sort((a, b) => cmpSortVal(a[key], b[key], dir));
	}, [draftAgrupados, agrupadosSort]);

	const detailItemsSorted = useMemo(() => {
		const list = detail?.items || [];
		if (!detailSort) return list;
		const { key, dir } = detailSort;
		return [...list].sort((a, b) => {
			const av =
				key === 'PacienteNombre'
					? a.PacienteNombre || (a.IdPaciente != null ? String(a.IdPaciente) : '')
					: a[key];
			const bv =
				key === 'PacienteNombre'
					? b.PacienteNombre || (b.IdPaciente != null ? String(b.IdPaciente) : '')
					: b[key];
			return cmpSortVal(av as string | number | null | undefined, bv as string | number | null | undefined, dir);
		});
	}, [detail?.items, detailSort]);

	const detailAgrupadosSorted = useMemo(() => {
		const agrupados = agruparItemsPorCodigo(detail?.items || []);
		if (!agrupadosSort) return agrupados;
		const { key, dir } = agrupadosSort;
		return [...agrupados].sort((a, b) => cmpSortVal(a[key], b[key], dir));
	}, [detail?.items, agrupadosSort]);

	const renderSortIcon = (active: boolean, dir?: SortDir) => {
		if (!active) return <ArrowUpDown size={12} className={styles.thSortIcon} aria-hidden />;
		return dir === 'desc' ? (
			<ArrowDown size={12} className={styles.thSortIconActive} aria-hidden />
		) : (
			<ArrowUp size={12} className={styles.thSortIconActive} aria-hidden />
		);
	};

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

	const loadPendienteMed = useCallback(async (fechaIso?: string) => {
		setPendienteMedLoading(true);
		setPendienteMedError(null);
		try {
			const data = await almacenStockService.medicacionPendienteServicios(fechaIso || todayISO());
			setPendienteMed(data);
		} catch (e) {
			setPendienteMed(null);
			setPendienteMedError(mensajeDeError(e, 'No se pudo consultar medicación pendiente'));
		} finally {
			setPendienteMedLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		void loadPendienteMed();
	}, [loadPendienteMed]);

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
			setDetailTab('items');
			setDetailSort(null);
			setDetailOpen(true);
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo abrir el remito'));
		}
	};

	const openCreate = async (opts?: {
		tipo?: string;
		idDepositoDest?: number | null;
		abrirCandidatos?: boolean;
	}) => {
		const quiereRsm = !!opts?.tipo || opts?.abrirCandidatos || opts?.idDepositoDest != null;
		const defaultTipo = quiereRsm
			? tipos.find((t) => String(t.IdTipo).toUpperCase() === 'RSM')?.IdTipo ||
				opts?.tipo ||
				tipos[0]?.IdTipo ||
				'RSM'
			: tipos[0]?.IdTipo || 'REM';
		const defaultDep = depositos[0]?.IdDeposito ?? '';
		const dest =
			opts?.idDepositoDest != null && Number.isFinite(Number(opts.idDepositoDest))
				? Number(opts.idDepositoDest)
				: '';
		setEditingId(null);
		skipTipoReset.current = true;
		setFecha(todayISO());
		setTipoCbte(defaultTipo);
		setIdDeposito(defaultDep);
		setIdDepositoDest(dest);
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
		setItemsSort(null);
		setAgrupadosSort({ key: 'IdProducto', dir: 'asc' });
		setEditingItemKey(null);
		setAutoOpenCandidatos(!!(opts?.abrirCandidatos && dest !== ''));
		try {
			const prox = await almacenStockService.proximoNroRemito(defaultTipo, new Date().getFullYear());
			setNro(prox.nro);
			setGrupo(prox.grupo);
			setLetra(prox.letra || 'X');
		} catch {
			setNro(1);
		}
		setModalOpen(true);
		void loadPendienteMed(todayISO());
	};

	const abrirRemitoPendienteServicio = (svc: MedicacionPendienteServicio) => {
		if (!canCreate) {
			toast.info('No tenés permiso para crear remitos');
			return;
		}
		if (svc.IdDeposito == null) {
			toast.error(
				`El sector ${svc.SectorNombre || svc.ValorSector} no tiene depósito con IdSector vinculado`,
			);
			return;
		}
		void openCreate({
			tipo: 'RSM',
			idDepositoDest: svc.IdDeposito,
			abrirCandidatos: true,
		});
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
		setItemsSort(null);
		setAgrupadosSort({ key: 'IdProducto', dir: 'asc' });
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

	const pedirAnularRemito = (row: RemitoCabecera) => {
		if (!canDelete) return;
		if (esRemitoAnulado(row)) {
			toast.error('El remito ya está anulado');
			return;
		}
		setAnularTarget(row);
	};

	const confirmarAnularRemito = async () => {
		const row = anularTarget;
		if (!row || !canDelete) return;
		setAnulando(true);
		try {
			await almacenStockService.eliminarRemito(row.IdTransaccion);
			toast.success('Remito anulado');
			setAnularTarget(null);
			if (detail?.IdTransaccion === row.IdTransaccion) {
				setDetailOpen(false);
				setDetail(null);
			}
			await load();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo anular el remito'));
		} finally {
			setAnulando(false);
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
			Cantidad: String(Math.round(Number(it.Cantidad) || 0) || 1),
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
		const cant = parseCantidadEntera(itemForm.Cantidad);
		const unit = Number(itemForm.ImporteUnitario);
		if (!Number.isFinite(idProd) || idProd <= 0 || !itemForm.DescripcionProducto.trim()) {
			avisarCampo('item-producto', 'Seleccioná un producto válido de la tabla Productos');
			return;
		}
		if (cant == null) {
			avisarCampo('item-cantidad', 'La cantidad debe ser un número entero (sin decimales)');
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
				const cant = Math.round(Number(l.CantidadSugerida) || Number(l.CantidadPendiente) || 0);
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
			void loadPendienteMed(fecha);
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo excluir la indicación'));
		} finally {
			setExcluyendoId(null);
		}
	};

	useEffect(() => {
		if (!modalOpen || !autoOpenCandidatos) return;
		if (!esSalidaServicio || idDepositoDest === '') {
			setAutoOpenCandidatos(false);
			return;
		}
		setAutoOpenCandidatos(false);
		void cargarCandidatosServicio();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- abrir candidatos una sola vez al prefill RSM
	}, [modalOpen, autoOpenCandidatos, esSalidaServicio, idDepositoDest]);

	useEffect(() => {
		if (!editingCantKey) return;
		cantInputRef.current?.focus();
		cantInputRef.current?.select();
	}, [editingCantKey]);

	const startEditCantidad = (key: string, cant: number) => {
		setEditingCantKey(key);
		setEditingCantValue(String(Math.round(Number(cant) || 0)));
	};

	const cancelEditCantidad = () => {
		setEditingCantKey(null);
		setEditingCantValue('');
	};

	const commitEditCantidad = (key: string) => {
		const cant = parseCantidadEntera(editingCantValue);
		if (cant == null) {
			toast.error('La cantidad debe ser un número entero (sin decimales)');
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
			void loadPendienteMed(fecha);
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
			const cant = parseCantidadEntera(editingCantValue);
			if (cant == null) {
				toast.error('La cantidad debe ser un número entero (sin decimales)');
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
					<button
						type="button"
						className={styles.btnGhost}
						onClick={() => {
							void load();
							void loadPendienteMed();
						}}
						disabled={loading || pendienteMedLoading}
					>
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

			{(pendienteMedLoading || pendienteMedError || (pendienteMed && pendienteMed.totalServicios > 0)) && (
				<section
					className={styles.pendienteBudget}
					aria-live="polite"
					aria-label="Medicación pendiente de entregar"
				>
					<div className={styles.pendienteBudgetHead}>
						<span className={styles.pendienteBudgetIcon} aria-hidden>
							<Bell size={12} />
						</span>
						<div className={styles.pendienteBudgetText}>
							<strong>
								{pendienteMedLoading
									? 'Consultando pendientes…'
									: pendienteMedError
										? 'Pendientes no disponibles'
										: `Sin entregar · ${pendienteMed?.totalServicios}`}
							</strong>
							{!pendienteMedLoading && !pendienteMedError && pendienteMed ? (
								<span>
									{pendienteMed.totalLineas} ind. · {pendienteMed.totalVisitas} pac. ·{' '}
									{fmtDate(pendienteMed.fecha)}
								</span>
							) : pendienteMedError ? (
								<span title={pendienteMedError}>{pendienteMedError}</span>
							) : null}
						</div>
						{!pendienteMedLoading && (
							<button
								type="button"
								className={styles.pendienteBudgetRefresh}
								onClick={() => void loadPendienteMed()}
								title="Actualizar pendientes"
							>
								<RefreshCw size={11} />
							</button>
						)}
					</div>
					{!pendienteMedLoading && !pendienteMedError && pendienteMed && pendienteMed.servicios.length > 0 ? (
						<div className={styles.pendienteBudgetChips}>
							{pendienteMed.servicios.map((svc) => (
								<button
									key={svc.ValorSector}
									type="button"
									className={styles.pendienteBudgetChip}
									disabled={!canCreate || svc.IdDeposito == null}
									title={
										svc.IdDeposito == null
											? 'Sin depósito vinculado a este sector'
											: canCreate
												? `Abrir remito RSM · ${svc.SectorNombre || svc.ValorSector} · ${svc.Lineas} ind. · ${svc.Pacientes} pac.`
												: 'Sin permiso para crear remitos'
									}
									onClick={() => abrirRemitoPendienteServicio(svc)}
								>
									<span className={styles.pendienteBudgetChipName}>
										{svc.SectorNombre || svc.ValorSector}
									</span>
									<span className={styles.pendienteBudgetChipMeta}>
										{svc.Lineas}·{svc.Pacientes}
									</span>
								</button>
							))}
						</div>
					) : null}
				</section>
			)}

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
									<th>De → A</th>
									<th>Cant.</th>
									<th>Observaciones</th>
									<th>Importe</th>
									{(canEdit || canDelete) && <th className={styles.colActions}>Acciones</th>}
								</tr>
							</thead>
							<tbody>
								{items.map((row) => {
									const anulado = esRemitoAnulado(row);
									const sentidoTipo = tipos.find((t) => t.IdTipo === row.TipoCbte)?.Sentido;
									const tag = tagSentido(row.Sentido || sentidoTipo);
									const mov = trayectoRemito(row, sentidoTipo);
									const obs = (row.Observaciones || '').trim();
									return (
										<tr
											key={row.IdTransaccion}
											className={anulado ? styles.rowAnulado : undefined}
											onClick={() => void openDetail(row)}
										>
											<td className={styles.mono}>{row.IdTransaccion}</td>
											<td>{fmtDate(row.Fecha)}</td>
											<td>
												<span className={styles.tipoCell}>
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
													{anulado ? (
														<span className={styles.badgeAnulado}>Anulado</span>
													) : null}
												</span>
											</td>
											<td className={styles.mono}>{row.NroRemitoFmt}</td>
											<td>
												<div className={styles.trayecto} title={`${mov.desde} → ${mov.hacia}`}>
													<span className={styles.trayectoDesde}>{mov.desde}</span>
													<span className={styles.trayectoFlecha} aria-hidden>
														→
													</span>
													<span className={styles.trayectoHacia}>{mov.hacia}</span>
												</div>
											</td>
											<td
												className={styles.mono}
												title={mov.entrada ? `Entrada · ${mov.cant}` : `Salida · ${mov.cant}`}
											>
												{mov.cant}
											</td>
											<td className={styles.obsCell} title={obs || undefined}>
												{obs || '—'}
											</td>
											<td className={styles.mono}>{fmtMoney(row.ImportePPP)}</td>
											{(canEdit || canDelete) && (
												<td className={styles.colActions}>
													<div className={styles.rowActions}>
														{canEdit && !anulado && (
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
														{canDelete && !anulado && (
															<button
																type="button"
																className={styles.actionDelete}
																title="Anular"
																aria-label={`Anular remito ${row.NroRemitoFmt || row.IdTransaccion}`}
																onClick={(e) => {
																	e.stopPropagation();
																	pedirAnularRemito(row);
																}}
															>
																<IoCloseCircleOutline color="#e11d48" size={18} />
															</button>
														)}
													</div>
												</td>
											)}
										</tr>
									);
								})}
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
											detail.Sentido ||
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
												{esRemitoAnulado(detail) ? (
													<span className={styles.badgeAnulado}>Anulado</span>
												) : null}
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
						<div className={styles.remitoPanelTabs} role="tablist" aria-label="Vista de ítems">
							<button
								type="button"
								role="tab"
								aria-selected={detailTab === 'items'}
								className={`${styles.remitoPanelTab}${
									detailTab === 'items' ? ` ${styles.remitoPanelTabActive}` : ''
								}`}
								onClick={() => setDetailTab('items')}
							>
								Ítems
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={detailTab === 'agrupados'}
								className={`${styles.remitoPanelTab}${
									detailTab === 'agrupados' ? ` ${styles.remitoPanelTabActive}` : ''
								}`}
								onClick={() => setDetailTab('agrupados')}
							>
								Por código
								{detailAgrupadosSorted.length > 0 ? (
									<span className={styles.remitoTabCount}>{detailAgrupadosSorted.length}</span>
								) : null}
							</button>
						</div>
						<div className={styles.tableWrap}>
							{detailTab === 'items' ? (
								<table className={styles.table}>
									<thead>
										<tr>
											{(
												[
													['IdProducto', 'Cód Prod'],
													['DescripcionProducto', 'Descripción'],
													['Cantidad', 'Cantidad'],
													['IdUnidad', 'U Med'],
													['ImporteUnitario', 'Imp. unitario'],
													['ImporteTotal', 'Importe total'],
													['PacienteNombre', 'Paciente'],
												] as [ItemsSortKey, string][]
											).map(([key, label]) => {
												const active = detailSort?.key === key;
												return (
													<th key={key}>
														<button
															type="button"
															className={`${styles.thSort}${active ? ` ${styles.thSortActive}` : ''}`}
															onClick={() => setDetailSort((prev) => toggleSort(prev, key))}
															aria-label={`Ordenar por ${label}`}
														>
															{label}
															{renderSortIcon(!!active, detailSort?.dir)}
														</button>
													</th>
												);
											})}
										</tr>
									</thead>
									<tbody>
										{detailItemsSorted.map((it, idx) => (
											<tr key={`${it.IdTransaccion}-${it.Renglon ?? idx}`}>
												<td className={styles.mono}>{it.IdProducto}</td>
												<td>{it.DescripcionProducto || '—'}</td>
												<td className={styles.mono}>{fmtCantidad(it.Cantidad)}</td>
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
							) : (
								<table className={styles.table}>
									<thead>
										<tr>
											{(
												[
													['IdProducto', 'Cód'],
													['DescripcionProducto', 'Descripción'],
													['Cantidad', 'Cant. total'],
													['IdUnidad', 'U Med'],
													['ImporteUnitario', 'Imp. unit.'],
													['ImporteTotal', 'Total'],
													['lineas', 'Líneas'],
													['pacientes', 'Pacientes'],
												] as [AgrupadosSortKey, string][]
											).map(([key, label]) => {
												const active = agrupadosSort?.key === key;
												return (
													<th key={key}>
														<button
															type="button"
															className={`${styles.thSort}${active ? ` ${styles.thSortActive}` : ''}`}
															onClick={() => setAgrupadosSort((prev) => toggleSort(prev, key))}
															aria-label={`Ordenar por ${label}`}
														>
															{label}
															{renderSortIcon(!!active, agrupadosSort?.dir)}
														</button>
													</th>
												);
											})}
										</tr>
									</thead>
									<tbody>
										{detailAgrupadosSorted.map((g) => (
											<tr key={g.IdProducto}>
												<td className={styles.mono}>{g.IdProducto}</td>
												<td>{g.DescripcionProducto || '—'}</td>
												<td className={styles.mono}>{fmtCantidad(g.Cantidad)}</td>
												<td>{g.IdUnidad || '—'}</td>
												<td className={styles.mono}>
													{g.ImporteUnitario != null ? fmtMoney(g.ImporteUnitario) : '—'}
												</td>
												<td className={`${styles.mono} ${styles.colTotal}`}>
													{fmtMoney(g.ImporteTotal)}
												</td>
												<td className={styles.mono}>{g.lineas}</td>
												<td className={styles.mono}>{g.pacientes || '—'}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
						<div className={styles.totals}>
							{detailTab === 'agrupados' ? (
								<div className={styles.totalItem}>
									<span className={styles.totalLabel}>Códigos</span>
									<span className={styles.totalValue}>{detailAgrupadosSorted.length}</span>
								</div>
							) : null}
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
								{canDelete && !esRemitoAnulado(detail) && (
									<button
										type="button"
										className={styles.btnGhost}
										onClick={() => pedirAnularRemito(detail)}
									>
										<IoCloseCircleOutline color="#e11d48" size={18} aria-hidden />
										Anular
									</button>
								)}
								{canEdit && !esRemitoAnulado(detail) && (
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
					{editingId == null &&
					!pendienteMedLoading &&
					pendienteMed &&
					pendienteMed.totalServicios > 0 ? (
						<section
							className={`${styles.pendienteBudget} ${styles.pendienteBudgetModal}`}
							aria-label="Medicación pendiente de entregar"
						>
							<div className={styles.pendienteBudgetHead}>
								<span className={styles.pendienteBudgetIcon} aria-hidden>
									<Bell size={12} />
								</span>
								<div className={styles.pendienteBudgetText}>
									<strong>Pendientes</strong>
									<span>
										{pendienteMed.totalServicios} · {pendienteMed.totalLineas} ind.
									</span>
								</div>
							</div>
							<div className={styles.pendienteBudgetChips}>
								{pendienteMed.servicios.map((svc) => (
									<button
										key={`modal-${svc.ValorSector}`}
										type="button"
										className={`${styles.pendienteBudgetChip}${
											idDepositoDest !== '' && Number(idDepositoDest) === Number(svc.IdDeposito)
												? ` ${styles.pendienteBudgetChipActive}`
												: ''
										}`}
										disabled={svc.IdDeposito == null}
										title={
											svc.IdDeposito == null
												? 'Sin depósito vinculado'
												: `Usar ${svc.SectorNombre || svc.ValorSector} como destino RSM · ${svc.Lineas} ind. · ${svc.Pacientes} pac.`
										}
										onClick={() => {
											const rsm =
												tipos.find((t) => String(t.IdTipo).toUpperCase() === 'RSM')?.IdTipo ||
												'RSM';
											skipTipoReset.current = true;
											setTipoCbte(rsm);
											if (svc.IdDeposito != null) {
												setIdDepositoDest(svc.IdDeposito);
												setRemitoMainTab('items');
												setAutoOpenCandidatos(true);
											}
										}}
									>
										<span className={styles.pendienteBudgetChipName}>
											{svc.SectorNombre || svc.ValorSector}
										</span>
										<span className={styles.pendienteBudgetChipMeta}>
											{svc.Lineas}·{svc.Pacientes}
										</span>
									</button>
								))}
							</div>
						</section>
					) : null}
					<section className={`${styles.remitoCabCard} ${styles.remitoCabCompact}`}>
						<div className={styles.remitoCabCardBody}>
							<div className={styles.remitoCabRow}>
								<div className={`${styles.field} ${styles.remitoFecha}`}>
									<label>Fecha</label>
									<input
										type="date"
										value={fecha}
										onChange={(e) => {
											const v = e.target.value;
											setFecha(v);
											void loadPendienteMed(v);
										}}
									/>
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
										aria-selected={remitoMainTab === 'agrupados'}
										className={`${styles.remitoPanelTab}${
											remitoMainTab === 'agrupados' ? ` ${styles.remitoPanelTabActive}` : ''
										}`}
										onClick={() => {
											setRemitoMainTab('agrupados');
											if (observaciones.trim()) setObsDotVisible(true);
										}}
									>
										Por código
										{draftAgrupados.length > 0 ? (
											<span className={styles.remitoTabCount}>{draftAgrupados.length}</span>
										) : null}
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
										remitoMainTab === 'obs' ? ` ${styles.remitoTableHeadActionsHidden}` : ''
									}`}
									aria-hidden={remitoMainTab === 'obs'}
								>
									{esSalidaServicio && (
										<button
											type="button"
											className={styles.btnGhost}
											disabled={cargandoCandidatos || remitoMainTab === 'obs'}
											tabIndex={remitoMainTab === 'obs' ? -1 : undefined}
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
										disabled={remitoMainTab === 'obs'}
										tabIndex={remitoMainTab === 'obs' ? -1 : undefined}
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
													{(
														[
															['IdProducto', 'Cód.'],
															['DescripcionProducto', 'Descripción'],
															['Cantidad', 'Cant.'],
															['IdUnidad', 'U.Med'],
															['ImporteUnitario', 'Imp. unit.'],
															['ImporteTotal', 'Total'],
															['PacienteNombre', 'Paciente'],
														] as [ItemsSortKey, string][]
													).map(([key, label]) => {
														const active = itemsSort?.key === key;
														return (
															<th key={key}>
																<button
																	type="button"
																	className={`${styles.thSort}${active ? ` ${styles.thSortActive}` : ''}`}
																	onClick={() => setItemsSort((prev) => toggleSort(prev, key))}
																	aria-label={`Ordenar por ${label}`}
																>
																	{label}
																	{renderSortIcon(!!active, itemsSort?.dir)}
																</button>
															</th>
														);
													})}
													<th className={styles.colActions}>Acciones</th>
												</tr>
											</thead>
											<tbody>
												{draftItemsSorted.length === 0 ? (
													<tr>
														<td colSpan={8} className={styles.muted} style={{ textAlign: 'center' }}>
															Sin ítems — usá «Agregar ítem»
														</td>
													</tr>
												) : (
													draftItemsSorted.map((it) => {
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
																		inputMode="numeric"
																		pattern="[0-9-]*"
																		value={editingCantValue}
																		aria-label={`Cantidad de ${it.DescripcionProducto || it.IdProducto}`}
																		onChange={(e) =>
																			setEditingCantValue(soloDigitosCantidad(e.target.value))
																		}
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
							) : remitoMainTab === 'agrupados' ? (
								<>
									<div className={`${styles.tableWrap} ${styles.remitoTableScroll}`}>
										<table className={styles.table}>
											<thead>
												<tr>
													{(
														[
															['IdProducto', 'Cód.'],
															['DescripcionProducto', 'Descripción'],
															['Cantidad', 'Cant. total'],
															['IdUnidad', 'U.Med'],
															['ImporteUnitario', 'Imp. unit.'],
															['ImporteTotal', 'Total'],
															['lineas', 'Líneas'],
															['pacientes', 'Pacientes'],
														] as [AgrupadosSortKey, string][]
													).map(([key, label]) => {
														const active = agrupadosSort?.key === key;
														return (
															<th key={key}>
																<button
																	type="button"
																	className={`${styles.thSort}${active ? ` ${styles.thSortActive}` : ''}`}
																	onClick={() =>
																		setAgrupadosSort((prev) => toggleSort(prev, key))
																	}
																	aria-label={`Ordenar por ${label}`}
																>
																	{label}
																	{renderSortIcon(!!active, agrupadosSort?.dir)}
																</button>
															</th>
														);
													})}
												</tr>
											</thead>
											<tbody>
												{draftAgrupadosSorted.length === 0 ? (
													<tr>
														<td colSpan={8} className={styles.muted} style={{ textAlign: 'center' }}>
															Sin artículos — cargá ítems en la solapa Ítems
														</td>
													</tr>
												) : (
													draftAgrupadosSorted.map((g) => (
														<tr key={g.IdProducto}>
															<td className={styles.mono}>{g.IdProducto}</td>
															<td>{g.DescripcionProducto || '—'}</td>
															<td className={styles.mono}>{fmtCantidad(g.Cantidad)}</td>
															<td>{g.IdUnidad || '—'}</td>
															<td className={styles.mono}>
																{g.ImporteUnitario != null ? fmtMoney(g.ImporteUnitario) : '—'}
															</td>
															<td className={`${styles.mono} ${styles.colTotal}`}>
																{fmtMoney(g.ImporteTotal)}
															</td>
															<td className={styles.mono}>{g.lineas}</td>
															<td className={styles.mono}>{g.pacientes || '—'}</td>
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
									<div className={styles.totals}>
										<div className={styles.totalItem}>
											<span className={styles.totalLabel}>Códigos</span>
											<span className={styles.totalValue}>{draftAgrupados.length}</span>
										</div>
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

			<ConfirmDialog
				open={anularTarget != null}
				title="Anular remito"
				message={
					anularTarget
						? Number(anularTarget.IdTransaccionOrig) > 0
							? `¿Anular el remito «${anularTarget.NroRemitoFmt || anularTarget.IdTransaccion}»? Es el comprobante generado automáticamente del remito ${anularTarget.IdTransaccionOrig}: se anulan ambos, se revierte el stock y no se puede deshacer.`
							: `¿Anular el remito «${anularTarget.NroRemitoFmt || anularTarget.IdTransaccion}»? Esta acción no se puede deshacer: se revierte el stock, se anula también el remito vinculado si existe, y el número queda consumido.`
						: ''
				}
				confirmLabel="Anular"
				cancelLabel="Cancelar"
				tone="danger"
				busy={anulando}
				onCancel={() => {
					if (!anulando) setAnularTarget(null);
				}}
				onConfirm={() => void confirmarAnularRemito()}
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
							step={1}
							min={1}
							inputMode="numeric"
							value={itemForm.Cantidad}
							onChange={(e) =>
								setItemForm((f) => ({ ...f, Cantidad: soloDigitosCantidad(e.target.value) }))
							}
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
