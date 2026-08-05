'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
	Plus,
	RefreshCw,
	Package,
	FileText,
	ClipboardCheck,
	Truck,
	Boxes,
	History,
	Warehouse,
	Search,
	X,
	ArrowRight,
	PackageCheck,
	Settings,
	GitBranch,
	AlertTriangle,
	Pill,
	Syringe,
	Box,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import { almacenService } from '@/app/services/almacenService';
import { usePermiso } from '@/app/hooks/usePermiso';
import type {
	AlmacenActa,
	AlmacenArticulo,
	AlmacenArticulosPage,
	AlmacenDeposito,
	AlmacenDepositoResumen,
	AlmacenMovimiento,
	AlmacenOrden,
	AlmacenOrigen,
	AlmacenProveedor,
	AlmacenResumen,
	AlmacenSolicitud,
	AlmacenStockRow,
	AlmacenTab,
	AlmacenTrazabilidadDetalle,
	AlmacenVademecumEstado,
	SolicitudItem,
} from '@/app/types/almacen';
import SolicitudProvisionWorkspace from '@/app/components/Almacen/SolicitudProvisionWorkspace';
import AlmacenConfigPanel from '@/app/components/Almacen/AlmacenConfigPanel';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { useToast } from '@/app/components/UI/ToastProvider';
import Modal from '@/app/components/UI/Modal';
import styles from './almacen.module.css';

const ART_PAGE_SIZE = 40;
const ART_CACHE_MAX = 10; // ~400 artículos cacheados máx.

/** Proceso de provisión */
const PROCESS_CARDS: { id: AlmacenTab; label: string; hint: string; icon: typeof Package }[] = [
	{ id: 'solicitudes', label: 'Solicitudes', hint: 'Pedidos del origen a Almacén', icon: FileText },
	{ id: 'ordenes', label: 'Órdenes', hint: 'Pedido al proveedor (vía Compras)', icon: ClipboardCheck },
	{ id: 'actas', label: 'Actas de recepción', hint: 'Ingreso de mercadería a Almacén', icon: PackageCheck },
	{
		id: 'trazabilidad',
		label: 'Trazabilidad',
		hint: 'Solicitud → orden → acta → servicio y depósitos',
		icon: GitBranch,
	},
];

/** Inventario y catálogo (operación de stock y maestros) */
const CATALOG_CARDS: { id: AlmacenTab; label: string; hint: string; icon: typeof Package }[] = [
	{ id: 'stock', label: 'Stock', hint: 'Disponible por depósito', icon: Boxes },
	{ id: 'depositos', label: 'Depósitos', hint: 'Resumen y detalle por unidad', icon: Warehouse },
	{ id: 'articulos', label: 'Artículos', hint: 'Catálogo', icon: Package },
	{ id: 'proveedores', label: 'Proveedores', hint: 'Proveedores del hospital', icon: Truck },
	{ id: 'movimientos', label: 'Movimientos', hint: 'Kardex entradas y salidas', icon: History },
	{ id: 'config', label: 'Configuración', hint: 'Depósitos, sectores, rubros', icon: Settings },
];

const ALL_SECTIONS = [...PROCESS_CARDS, ...CATALOG_CARDS];

const SEEN_SOL_KEY = 'almacen.solicitudes.seenAt';
const SEEN_STOCK_KEY = 'almacen.stock.min.seenAt';

function tipoUnitIcon(tipoCodigo?: string | null, tipoNombre?: string | null) {
	const t = `${tipoCodigo || ''} ${tipoNombre || ''}`.toUpperCase();
	if (t.includes('MEDI') || t.includes('MEDIC')) return Pill;
	if (t.includes('DESC') || t.includes('DESCART')) return Syringe;
	return Box;
}

function badgeClass(estado: string): string {
	const e = (estado || '').toUpperCase();
	if (['APROBADA', 'RECIBIDA', 'COMPLETADA', 'CONFIRMADA'].includes(e)) return styles.badgeOk;
	if (['EMITIDA', 'SOLICITADA', 'EN_COMPRA', 'PARCIAL', 'BORRADOR'].includes(e)) return styles.badgeInfo;
	if (['RECHAZADA', 'ANULADA'].includes(e)) return styles.badgeDanger;
	return styles.badgeMuted;
}

function fmtMoney(n?: number | null) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function fmtDate(v?: string | null) {
	if (!v) return '—';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
	return d.toLocaleDateString('es-AR');
}

function emptyItem(): SolicitudItem {
	return { Codigo: '', Descripcion: '', Observaciones: '', Cantidad: 1, IdArticulo: null };
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
	return (
		<div className={styles.empty}>
			<Package size={36} strokeWidth={1.25} color="#94a3b8" />
			<p className={styles.emptyTitle}>{title}</p>
			<p className={styles.emptyHint}>{hint}</p>
		</div>
	);
}

export default function AlmacenClient() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { puede, puedeSubmodulo } = usePermiso();
	const appToast = useToast();

	const tabParam = (searchParams.get('tab') as AlmacenTab) || 'solicitudes';
	const tab: AlmacenTab = ALL_SECTIONS.some((t) => t.id === tabParam) ? tabParam : 'solicitudes';

	const [resumen, setResumen] = useState<AlmacenResumen | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [solNotify, setSolNotify] = useState(false);
	const [stockNotify, setStockNotify] = useState(false);
	/** Filtro depósito en stock: código del depósito (por defecto el principal) */
	const [stockDep, setStockDep] = useState<string>('');
	const [stockSoloMin, setStockSoloMin] = useState(false);

	const [stock, setStock] = useState<AlmacenStockRow[]>([]);
	const [depResumen, setDepResumen] = useState<AlmacenDepositoResumen[]>([]);
	/** Detalle de depósito abierto dentro de la pestaña Depósitos */
	const [depDetalle, setDepDetalle] = useState<AlmacenDepositoResumen | null>(null);
	const [depDetalleStock, setDepDetalleStock] = useState<AlmacenStockRow[]>([]);
	const [depDetalleSearch, setDepDetalleSearch] = useState('');
	const [depDetalleSoloMin, setDepDetalleSoloMin] = useState(false);
	const [depDetalleLoading, setDepDetalleLoading] = useState(false);
	const [depAlertDismissed, setDepAlertDismissed] = useState(false);
	const [depAlertOpen, setDepAlertOpen] = useState(false);
	const [depAlertItems, setDepAlertItems] = useState<AlmacenStockRow[]>([]);
	const [depAlertLoading, setDepAlertLoading] = useState(false);
	const [vadEstado, setVadEstado] = useState<AlmacenVademecumEstado | null>(null);
	const [articulos, setArticulos] = useState<AlmacenArticulo[]>([]);
	const [artPage, setArtPage] = useState(1);
	const [artTotal, setArtTotal] = useState(0);
	const artsCacheRef = useRef(new Map<string, AlmacenArticulosPage>());
	const [proveedores, setProveedores] = useState<AlmacenProveedor[]>([]);
	const [solicitudes, setSolicitudes] = useState<AlmacenSolicitud[]>([]);
	const [ordenes, setOrdenes] = useState<AlmacenOrden[]>([]);
	const [actas, setActas] = useState<AlmacenActa[]>([]);
	const [movimientos, setMovimientos] = useState<AlmacenMovimiento[]>([]);
	const [trazabilidad, setTrazabilidad] = useState<AlmacenMovimiento[]>([]);
	const [traceDetalle, setTraceDetalle] = useState<AlmacenTrazabilidadDetalle | null>(null);
	const [traceLoading, setTraceLoading] = useState(false);
	const [depositos, setDepositos] = useState<AlmacenDeposito[]>([]);
	const [solOrigenes, setSolOrigenes] = useState<AlmacenOrigen[]>([]);

	const [modal, setModal] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [detail, setDetail] = useState<AlmacenSolicitud | AlmacenOrden | AlmacenActa | null>(null);

	// forms
	const [artForm, setArtForm] = useState({
		id: 0,
		codigo: '',
		descripcion: '',
		unidadMedida: 'UNIDAD',
		stockMinimo: 0,
		observaciones: '',
	});
	const [provForm, setProvForm] = useState({
		id: 0,
		razonSocial: '',
		cuit: '',
		direccion: '',
		telefono: '',
		email: '',
		observaciones: '',
	});
	const [solForm, setSolForm] = useState({
		destino: '',
		justificacion: '',
		solicitante: '',
		costoEstimado: '',
		estado: 'SOLICITADA',
		items: [emptyItem()] as SolicitudItem[],
	});
	const [ordForm, setOrdForm] = useState({
		idProveedor: '',
		idSolicitud: '',
		nroConcurso: '',
		nroAdjudicacion: '',
		tipoOperacion: 'DIRECTA',
		condPago: 'CONTADO',
		lugarEntrega: '',
		items: [
			{
				descripcion: '',
				cantidad: '' as string,
				precioUnitario: '' as string,
				observaciones: '',
				idArticulo: null as number | null,
				unidadMedida: '' as string,
			},
		],
	});
	const [fromSolId, setFromSolId] = useState<number | null>(null);
	/** Contexto visible/link de la solicitud origen al armar una orden */
	const [fromSolRef, setFromSolRef] = useState<{ id: number; nro: string; origen?: string | null } | null>(null);
	/** Si se abrió detalle de solicitud desde el modal de orden (volver a la orden) */
	const [ordenDraftOpen, setOrdenDraftOpen] = useState(false);
	const [fromOrdenId, setFromOrdenId] = useState<number | null>(null);
	const [ordenDetail, setOrdenDetail] = useState<AlmacenOrden | null>(null);
	const [actaForm, setActaForm] = useState({
		nroFactura: '',
		descuento: 0,
		items: [] as { idOrdenItem?: number; idArticulo?: number | null; descripcion: string; marca: string; lote: string; cantidad: number; precioUnitario: number; renglon?: number }[],
	});
	const [estadoForm, setEstadoForm] = useState({ id: 0, estado: 'APROBADA', costoEstimado: '', aprobador: '' });
	const [ajusteForm, setAjusteForm] = useState({ idArticulo: '', idDeposito: '', lote: '', cantidad: '', observaciones: '' });

	const principalDepositoNombre = useMemo(() => {
		const p = depositos.find((d) => d.EsPrincipal === true || d.EsPrincipal === 1) || depositos[0];
		return p?.Nombre || '';
	}, [depositos]);

	const bajoMinimoByCodigo = useMemo(() => {
		const map = new Map<string, number>();
		for (const row of resumen?.bajoMinimoPorDeposito || []) {
			map.set(row.codigo, Number(row.bajoMinimo) || 0);
		}
		return map;
	}, [resumen]);

	const loadDepDetalleStock = useCallback(
		async (dep: AlmacenDepositoResumen, searchTerm = depDetalleSearch, soloMin = depDetalleSoloMin) => {
			setDepDetalleLoading(true);
			try {
				const rows = await almacenService.listarStock({
					idDeposito: dep.IdDeposito,
					search: searchTerm || undefined,
					bajoMinimo: soloMin || undefined,
					incluirCero: true,
				});
				setDepDetalleStock(rows);
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : 'Error al cargar detalle del depósito');
				setDepDetalleStock([]);
			} finally {
				setDepDetalleLoading(false);
			}
		},
		[depDetalleSearch, depDetalleSoloMin],
	);

	const openDepDetalle = useCallback(
		async (d: AlmacenDepositoResumen) => {
			setDepDetalle(d);
			setDepDetalleSearch('');
			setDepDetalleSoloMin(false);
			setDepAlertDismissed(false);
			setDepAlertOpen(false);
			setDepAlertItems([]);
			await loadDepDetalleStock(d, '', false);
		},
		[loadDepDetalleStock],
	);

	const openDepAlertas = useCallback(async () => {
		if (!depDetalle) return;
		setDepAlertOpen(true);
		setDepAlertLoading(true);
		try {
			const rows = await almacenService.listarStock({
				idDeposito: depDetalle.IdDeposito,
				bajoMinimo: true,
				incluirCero: true,
			});
			setDepAlertItems(rows);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al cargar alertas del depósito');
			setDepAlertItems([]);
		} finally {
			setDepAlertLoading(false);
		}
	}, [depDetalle]);

	const openTraceDetalle = useCallback(async (idArticulo: number) => {
		if (!idArticulo) return;
		setTraceLoading(true);
		setTraceDetalle(null);
		setModal('trace');
		try {
			const data = await almacenService.detalleTrazabilidadArticulo(idArticulo);
			setTraceDetalle(data);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al cargar trazabilidad del artículo');
			setModal(null);
		} finally {
			setTraceLoading(false);
		}
	}, []);

	const loadResumen = useCallback(async () => {
		try {
			const r = await almacenService.resumen();
			setResumen(r);
			const pendientes = Number(r.solicitudesPendientes) || 0;
			const alerts = (r.bajoMinimoPorDeposito || []).filter((d) => Number(d.bajoMinimo) > 0);
			const stockAlertTotal = alerts.reduce((acc, d) => acc + (Number(d.bajoMinimo) || 0), 0);
			if (typeof window !== 'undefined') {
				const now = Date.now();
				const solSeen = Number(localStorage.getItem(SEEN_SOL_KEY) || '0');
				const stockSeen = Number(localStorage.getItem(SEEN_STOCK_KEY) || '0');
				const solToasted = localStorage.getItem(`${SEEN_SOL_KEY}.toastAt`);
				const stockToasted = localStorage.getItem(`${SEEN_STOCK_KEY}.toastAt`);
				const toastBucket = String(Math.floor(now / (5 * 60 * 1000)));

				if (pendientes > 0 && (!solSeen || now - solSeen > 5 * 60 * 1000)) {
					setSolNotify(true);
					if (solToasted !== toastBucket) {
						localStorage.setItem(`${SEEN_SOL_KEY}.toastAt`, toastBucket);
						appToast.warning(
							pendientes === 1
								? 'Hay 1 solicitud pendiente de revisión'
								: `Hay ${pendientes} solicitudes pendientes de revisión`,
							{
								title: 'Solicitudes',
								duration: 5500,
								actionLabel: 'Ver',
								onAction: () => {
									localStorage.setItem(SEEN_SOL_KEY, String(Date.now()));
									setSolNotify(false);
									router.push('/dashboard/almacen');
								},
							},
						);
					}
				} else if (pendientes <= 0) {
					setSolNotify(false);
				}

				if (stockAlertTotal > 0 && (!stockSeen || now - stockSeen > 5 * 60 * 1000)) {
					setStockNotify(true);
					if (pendientes <= 0 && stockToasted !== toastBucket) {
						localStorage.setItem(`${SEEN_STOCK_KEY}.toastAt`, toastBucket);
						const top = alerts[0];
						appToast.warning(
							top
								? `${top.nombre}: ${top.bajoMinimo} bajo mínimo`
								: `${stockAlertTotal} artículos bajo stock mínimo`,
							{
								title: 'Stock',
								duration: 5500,
								actionLabel: 'Ver',
								onAction: () => {
									localStorage.setItem(SEEN_STOCK_KEY, String(Date.now()));
									setStockNotify(false);
									router.push('/dashboard/almacen?tab=depositos');
								},
							},
						);
					}
				} else if (stockAlertTotal <= 0) {
					setStockNotify(false);
				}
			}
		} catch {
			/* ignore if sin permiso stock */
		}
	}, [appToast, router]);

	const markSolicitudesSeen = useCallback(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(SEEN_SOL_KEY, String(Date.now()));
		}
		setSolNotify(false);
	}, []);

	const markStockSeen = useCallback(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(SEEN_STOCK_KEY, String(Date.now()));
		}
		setStockNotify(false);
	}, []);

	const setTab = (t: AlmacenTab) => {
		if (t === 'solicitudes') markSolicitudesSeen();
		if (t === 'stock' || t === 'depositos') markStockSeen();
		if (t !== 'depositos') setDepDetalle(null);
		if (t === 'articulos') setArtPage(1);
		const q = t === 'solicitudes' ? '/dashboard/almacen' : `/dashboard/almacen?tab=${t}`;
		router.push(q);
	};

	const clearArtsCache = useCallback(() => {
		artsCacheRef.current.clear();
	}, []);

	const loadArticulosPage = useCallback(
		async (page: number, searchTerm: string, force = false) => {
			const key = `${searchTerm.trim().toLowerCase()}|${page}|${ART_PAGE_SIZE}`;
			if (!force) {
				const hit = artsCacheRef.current.get(key);
				if (hit) {
					setArticulos(hit.items);
					setArtTotal(hit.total);
					setArtPage(hit.page);
					return hit;
				}
			}
			const data = await almacenService.listarArticulos({
				search: searchTerm,
				page,
				pageSize: ART_PAGE_SIZE,
			});
			const pageData: AlmacenArticulosPage = {
				items: data.items || [],
				total: data.total || 0,
				page: data.page || page,
				pageSize: data.pageSize || ART_PAGE_SIZE,
			};
			const cache = artsCacheRef.current;
			if (cache.size >= ART_CACHE_MAX) {
				const first = cache.keys().next().value;
				if (first != null) cache.delete(first);
			}
			cache.set(key, pageData);
			setArticulos(pageData.items);
			setArtTotal(pageData.total);
			setArtPage(pageData.page);
			return pageData;
		},
		[],
	);

	const loadTab = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const deps = await almacenService.listarDepositos().catch(() => [] as AlmacenDeposito[]);
			setDepositos(deps);

			let depCodigo = stockDep;
			if (tab === 'stock' || tab === 'depositos') {
				if (!depCodigo || depCodigo === 'all') {
					const principal =
						deps.find((d) => d.EsPrincipal === true || d.EsPrincipal === 1) || deps[0];
					if (principal) {
						depCodigo = principal.Codigo;
						setStockDep(principal.Codigo);
					}
				}
			}

			if (tab === 'stock') {
				const stockParams: {
					search?: string;
					codigoDeposito?: string;
					idDeposito?: number;
					bajoMinimo?: boolean;
					incluirCero?: boolean;
				} = {
					search,
					bajoMinimo: stockSoloMin || undefined,
					incluirCero: true,
				};
				if (depCodigo) {
					if (/^\d+$/.test(depCodigo)) {
						stockParams.idDeposito = Number(depCodigo);
					} else {
						stockParams.codigoDeposito = depCodigo;
					}
				}
				setStock(await almacenService.listarStock(stockParams));
			} else if (tab === 'depositos') {
				const resumenDeps = await almacenService.resumenDepositos();
				setDepResumen(resumenDeps);
				if (depDetalle?.IdDeposito) {
					const refreshed = resumenDeps.find((d) => d.IdDeposito === depDetalle.IdDeposito);
					if (refreshed) {
						setDepDetalle(refreshed);
						await loadDepDetalleStock(refreshed);
					}
				}
			} else if (tab === 'articulos') {
				await loadArticulosPage(artPage, search);
				const est = await almacenService.estadoVademecum().catch(() => null);
				setVadEstado(est);
			} else if (tab === 'proveedores') {
				setProveedores(await almacenService.listarProveedores(search));
			} else if (tab === 'solicitudes') {
				setSolicitudes(await almacenService.listarSolicitudes({ search }));
				const [provs, orgs] = await Promise.all([
					almacenService.listarProveedores().catch(() => [] as AlmacenProveedor[]),
					almacenService.listarOrigenes({ todos: true }).catch(() => [] as AlmacenOrigen[]),
				]);
				setProveedores(provs);
				setSolOrigenes(orgs);
			} else if (tab === 'ordenes') {
				setOrdenes(await almacenService.listarOrdenes({ search }));
				const provs = await almacenService.listarProveedores().catch(() => [] as AlmacenProveedor[]);
				setProveedores(provs);
			} else if (tab === 'actas') {
				setActas(await almacenService.listarActas(search));
			} else if (tab === 'trazabilidad') {
				setTrazabilidad(
					await almacenService.listarTrazabilidad({ search, limit: 200 }).catch(() => []),
				);
			} else if (tab === 'movimientos') {
				setMovimientos(await almacenService.listarMovimientos({ limit: 150 }));
			}
			await loadResumen();
			if (tab === 'solicitudes') {
				if (typeof window !== 'undefined') {
					localStorage.setItem(SEEN_SOL_KEY, String(Date.now()));
				}
				setSolNotify(false);
			}
			if (tab === 'stock' || tab === 'depositos') {
				if (typeof window !== 'undefined') {
					localStorage.setItem(SEEN_STOCK_KEY, String(Date.now()));
				}
				setStockNotify(false);
			}
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al cargar almacén');
		} finally {
			setLoading(false);
		}
	}, [
		tab,
		search,
		artPage,
		loadResumen,
		stockDep,
		stockSoloMin,
		depDetalle?.IdDeposito,
		loadDepDetalleStock,
		loadArticulosPage,
	]);

	useEffect(() => {
		void loadTab();
	}, [loadTab]);

	const canCreate = useMemo(
		() => ({
			articulos: puede('ALMACEN.ARTICULOS.CREAR'),
			proveedores: puede('ALMACEN.PROVEEDORES.CREAR'),
			solicitudes: puede('ALMACEN.SOLICITUDES.CREAR'),
			solEdit: puede('ALMACEN.SOLICITUDES.EDITAR') || puede('ALMACEN.SOLICITUDES.CREAR'),
			artEdit: puede('ALMACEN.ARTICULOS.EDITAR'),
			provEdit: puede('ALMACEN.PROVEEDORES.EDITAR'),
			ordenes: puede('ALMACEN.ORDENES.CREAR'),
			actas: puede('ALMACEN.ACTAS.CREAR'),
			stock: puede('ALMACEN.STOCK.GESTIONAR'),
			gestSol: puede('ALMACEN.SOLICITUDES.GESTIONAR'),
			config: puede('ALMACEN.CONFIG.VER') || puede('ALMACEN.CONFIG.EDITAR'),
			configEdit: puede('ALMACEN.CONFIG.EDITAR'),
		}),
		[puede],
	);

	const closeModal = () => {
		// Si mirabas la solicitud “en contexto” desde una orden, volvé a la orden
		if (modal === 'viewSol' && ordenDraftOpen) {
			setDetail(null);
			setModal('orden');
			return;
		}
		setModal(null);
		setDetail(null);
		setFromSolId(null);
		setFromSolRef(null);
		setOrdenDraftOpen(false);
		setFromOrdenId(null);
		setOrdenDetail(null);
		setTraceDetalle(null);
	};

	const openSolicitudContext = async (idSolicitud: number) => {
		try {
			const sol = await almacenService.obtenerSolicitud(idSolicitud);
			setDetail(sol);
			setModal('viewSol');
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'No se pudo abrir la solicitud');
		}
	};

	const submitArticulo = async () => {
		setSaving(true);
		try {
			if (artForm.id) {
				await almacenService.actualizarArticulo(artForm.id, {
					descripcion: artForm.descripcion,
					unidadMedida: artForm.unidadMedida,
					stockMinimo: Number(artForm.stockMinimo) || 0,
					observaciones: artForm.observaciones || undefined,
				});
			} else {
				await almacenService.crearArticulo({
					codigo: artForm.codigo,
					descripcion: artForm.descripcion,
					unidadMedida: artForm.unidadMedida,
					stockMinimo: Number(artForm.stockMinimo) || 0,
					observaciones: artForm.observaciones || undefined,
				});
			}
			closeModal();
			setArtForm({ id: 0, codigo: '', descripcion: '', unidadMedida: 'UNIDAD', stockMinimo: 0, observaciones: '' });
			clearArtsCache();
			await loadTab();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al guardar artículo');
		} finally {
			setSaving(false);
		}
	};

	const submitProveedor = async () => {
		if (!provForm.razonSocial.trim()) {
			setError('La razón social es obligatoria');
			return;
		}
		setSaving(true);
		try {
			const body = {
				razonSocial: provForm.razonSocial,
				cuit: provForm.cuit,
				direccion: provForm.direccion,
				telefono: provForm.telefono,
				email: provForm.email,
				observaciones: provForm.observaciones || undefined,
			};
			if (provForm.id) {
				await almacenService.actualizarProveedor(provForm.id, body);
			} else {
				await almacenService.crearProveedor(body);
			}
			closeModal();
			setProvForm({ id: 0, razonSocial: '', cuit: '', direccion: '', telefono: '', email: '', observaciones: '' });
			await loadTab();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al guardar proveedor');
		} finally {
			setSaving(false);
		}
	};

	const submitSolicitud = async () => {
		setSaving(true);
		try {
			await almacenService.crearSolicitud({
				destino: solForm.destino,
				justificacion: solForm.justificacion,
				solicitante: solForm.solicitante,
				costoEstimado: solForm.costoEstimado ? Number(solForm.costoEstimado) : null,
				estado: solForm.estado,
				items: solForm.items
					.filter((i) => i.Descripcion && i.Cantidad > 0)
					.map((i) => ({
						codigo: i.Codigo,
						descripcion: i.Descripcion,
						observaciones: i.Observaciones,
						cantidad: i.Cantidad,
						idArticulo: i.IdArticulo,
					})),
			});
			closeModal();
			await loadTab();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al crear solicitud');
		} finally {
			setSaving(false);
		}
	};

	const submitEstado = async () => {
		setSaving(true);
		try {
			await almacenService.cambiarEstadoSolicitud(estadoForm.id, {
				estado: estadoForm.estado,
				costoEstimado: estadoForm.costoEstimado ? Number(estadoForm.costoEstimado) : undefined,
				aprobador: estadoForm.aprobador || undefined,
			});
			closeModal();
			await loadTab();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al cambiar estado');
		} finally {
			setSaving(false);
		}
	};

	const openOrdenFromSol = async (idSolicitud: number) => {
		try {
			const sol = await almacenService.obtenerSolicitud(idSolicitud);
			const provs = await almacenService.listarProveedores();
			setProveedores(provs);
			setFromSolId(idSolicitud);
			setFromSolRef({
				id: idSolicitud,
				nro: sol.NroPedido || String(idSolicitud),
				origen: sol.Origen || sol.Destino,
			});
			setOrdenDraftOpen(true);
			setOrdForm({
				idProveedor: '',
				idSolicitud: String(idSolicitud),
				nroConcurso: '',
				nroAdjudicacion: '',
				tipoOperacion: 'DIRECTA',
				condPago: 'CONTADO',
				lugarEntrega: principalDepositoNombre,
				items: (sol.items || []).map((it) => ({
					descripcion: it.Descripcion,
					cantidad: String(Number(it.Cantidad) || ''),
					precioUnitario: '',
					observaciones: it.Observaciones || '',
					idArticulo: it.IdArticulo ?? null,
					unidadMedida: it.UnidadMedida || '',
				})),
			});
			setModal('orden');
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al preparar orden');
		}
	};

	const submitOrden = async () => {
		if (!ordForm.idProveedor) {
			setError('Seleccioná un proveedor');
			return;
		}
		const items = ordForm.items
			.map((it) => ({
				descripcion: it.descripcion,
				cantidad: Number(String(it.cantidad).replace(',', '.')),
				precioUnitario: Number(String(it.precioUnitario).replace(',', '.') || 0),
				observaciones: it.observaciones,
				idArticulo: it.idArticulo,
			}))
			.filter((it) => it.descripcion && it.cantidad > 0);
		if (!items.length) {
			setError('Agregá al menos un renglón con cantidad válida');
			return;
		}
		setSaving(true);
		try {
			const body = {
				idProveedor: Number(ordForm.idProveedor),
				idSolicitud: fromSolId || (ordForm.idSolicitud ? Number(ordForm.idSolicitud) : null),
				nroConcurso: ordForm.nroConcurso || undefined,
				nroAdjudicacion: ordForm.nroAdjudicacion || undefined,
				tipoOperacion: ordForm.tipoOperacion,
				condPago: ordForm.condPago,
				lugarEntrega: ordForm.lugarEntrega,
				items,
			};
			if (fromSolId) {
				await almacenService.crearOrdenDesdeSolicitud(fromSolId, body);
			} else {
				await almacenService.crearOrden(body);
			}
			closeModal();
			setTab('ordenes');
			await loadTab();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al crear orden');
		} finally {
			setSaving(false);
		}
	};

	const openActaFromOrden = async (idOrden: number) => {
		try {
			const orden = await almacenService.obtenerOrden(idOrden);
			setFromOrdenId(idOrden);
			setOrdenDetail(orden);
			setActaForm({
				nroFactura: '',
				descuento: 0,
				items: (orden.items || []).map((it) => {
					const pendiente = Number(it.Cantidad) - Number(it.CantidadRecibida || 0);
					return {
						idOrdenItem: it.IdItem,
						idArticulo: it.IdArticulo,
						descripcion: it.Descripcion,
						marca: '',
						lote: 'SL',
						cantidad: Math.max(0, pendiente),
						precioUnitario: Number(it.PrecioUnitario),
						renglon: it.Renglon,
					};
				}),
			});
			setModal('acta');
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al preparar acta');
		}
	};

	const submitActa = async () => {
		if (!fromOrdenId || !ordenDetail) return;
		setSaving(true);
		try {
			await almacenService.crearActa({
				idOrden: fromOrdenId,
				idDeposito: ordenDetail.IdDeposito,
				idProveedor: ordenDetail.IdProveedor,
				nroExpediente: ordenDetail.NroExpediente,
				nroFactura: actaForm.nroFactura || undefined,
				descuento: Number(actaForm.descuento) || 0,
				items: actaForm.items
					.filter((i) => i.cantidad > 0)
					.map((i) => ({
						idOrdenItem: i.idOrdenItem,
						idArticulo: i.idArticulo,
						descripcion: i.descripcion,
						marca: i.marca,
						lote: i.lote || 'SL',
						cantidad: Number(i.cantidad),
						precioUnitario: Number(i.precioUnitario),
						renglon: i.renglon,
					})),
			});
			closeModal();
			setTab('actas');
			await loadTab();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al crear acta');
		} finally {
			setSaving(false);
		}
	};

	const submitAjuste = async () => {
		setSaving(true);
		try {
			await almacenService.ajusteStock({
				idArticulo: Number(ajusteForm.idArticulo),
				idDeposito: Number(ajusteForm.idDeposito),
				lote: ajusteForm.lote || '',
				cantidad: Number(ajusteForm.cantidad),
				observaciones: ajusteForm.observaciones,
			});
			closeModal();
			await loadTab();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al ajustar stock');
		} finally {
			setSaving(false);
		}
	};

	const viewSolicitud = async (id: number) => {
		try {
			setDetail(await almacenService.obtenerSolicitud(id));
			setModal('viewSol');
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error');
		}
	};

	const viewOrden = async (id: number) => {
		try {
			setDetail(await almacenService.obtenerOrden(id));
			setModal('viewOrd');
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error');
		}
	};

	const viewActa = async (id: number) => {
		try {
			setDetail(await almacenService.obtenerActa(id));
			setModal('viewActa');
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error');
		}
	};

	const activeTabMeta = ALL_SECTIONS.find((t) => t.id === tab);

	const primaryActionLabel =
		tab === 'articulos'
			? 'Nuevo artículo'
			: tab === 'proveedores'
				? 'Nuevo proveedor'
				: tab === 'solicitudes'
					? 'Nueva solicitud'
					: tab === 'ordenes'
						? 'Nueva orden'
						: tab === 'stock'
							? 'Ajuste de stock'
							: null;

	if (!puedeSubmodulo('ALMACEN', 'STOCK') && !puedeSubmodulo('ALMACEN', 'SOLICITUDES') && !puedeSubmodulo('ALMACEN', 'ARTICULOS')) {
		return (
			<div className={styles.wrap}>
				<div className={styles.error}>No tenés permisos para el módulo Almacén.</div>
			</div>
		);
	}

	return (
		<div className={styles.wrap}>
			<header className={styles.header}>
				<div className={styles.titleLeft}>
					<div className={styles.titleIcon}>
						<Warehouse size={24} />
					</div>
					<div className={styles.titleBlock}>
						<h1>Almacén</h1>
						<p>Provisión, recepción y control de stock del hospital</p>
					</div>
				</div>
				<div className={styles.headerActions}>
					<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => void loadTab()}>
						<RefreshCw size={15} /> Actualizar
					</button>
				</div>
			</header>

			<nav className={styles.navShell} aria-label="Secciones de almacén">
				<div className={`${styles.navGroup} ${styles.navGroupProvision}`}>
					<span className={styles.navGroupLabel}>Provisión</span>
					<p className={styles.navGroupHint}>Flujo de compra y recepción: solicitudes, órdenes, actas y trazabilidad completa.</p>
					<div className={styles.navGrid}>
						{PROCESS_CARDS.map((card) => {
							const Icon = card.icon;
							const showDot = card.id === 'solicitudes' && solNotify;
							return (
								<button
									key={card.id}
									type="button"
									className={`${styles.navCard} ${tab === card.id ? styles.navCardActive : ''}`}
									onClick={() => setTab(card.id)}
								>
									<span className={styles.navCardIcon}>
										<Icon size={18} strokeWidth={1.75} />
										{showDot ? <span className={styles.navDot} aria-label="Hay novedades" /> : null}
									</span>
									<span className={styles.navCardText}>
										<span className={styles.navCardTitle}>{card.label}</span>
										<span className={styles.navCardHint}>{card.hint}</span>
									</span>
								</button>
							);
						})}
					</div>
				</div>
				<div className={styles.navDivider} aria-hidden />
				<div className={`${styles.navGroup} ${styles.navGroupCatalog}`}>
					<span className={styles.navGroupLabel}>Inventario y catálogo</span>
					<p className={styles.navGroupHint}>Stock operativo, depósitos, maestros y kardex.</p>
					<div className={styles.navGridSmall}>
						{CATALOG_CARDS.map((card) => {
							const Icon = card.icon;
							const showDot = (card.id === 'depositos' || card.id === 'stock') && stockNotify;
							return (
								<button
									key={card.id}
									type="button"
									className={`${styles.navCardSm} ${tab === card.id ? styles.navCardActive : ''}`}
									onClick={() => setTab(card.id)}
								>
									<span className={styles.navCardIconSm}>
										<Icon size={16} strokeWidth={1.75} />
										{showDot ? <span className={styles.navDot} aria-label="Hay alertas de stock" /> : null}
									</span>
									<span className={styles.navCardText}>
										<span className={styles.navCardTitle}>{card.label}</span>
										<span className={styles.navCardHint}>{card.hint}</span>
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</nav>

			{error ? (
				<Modal isOpen={!!error} onClose={() => setError(null)} title="Atención" size="small" priority="high">
					<p className={styles.errorModalMsg}>{error}</p>
					<div className={styles.errorModalActions}>
						<button
							type="button"
							className={`${styles.btn} ${styles.btnPrimary}`}
							onClick={() => setError(null)}
						>
							Entendido
						</button>
					</div>
				</Modal>
			) : null}

			<section className={styles.panel}>
				{!(tab === 'depositos' && depDetalle) ? (
					<div className={styles.panelTop}>
						<div className={styles.panelTitleRow}>
							<div>
								<h2 className={styles.panelTitle}>{activeTabMeta?.label || 'Almacén'}</h2>
								{activeTabMeta && <p className={styles.panelSubtitle}>{activeTabMeta.hint}</p>}
							</div>
						</div>
						<div className={styles.toolbar}>
							{tab !== 'solicitudes' ? (
								<div className={styles.searchWrap}>
									<Search size={15} className={styles.searchIcon} />
									<input
										className={styles.search}
										placeholder={
											tab === 'stock'
												? 'Buscar por código o descripción…'
												: tab === 'proveedores'
													? 'Buscar proveedor o CUIT…'
													: 'Buscar…'
										}
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												if (tab === 'articulos' && artPage !== 1) setArtPage(1);
												else void loadTab();
											}
										}}
									/>
								</div>
							) : (
								<div />
							)}
							<div className={styles.actions}>
								{tab === 'articulos' && canCreate.articulos && (
									<button
										type="button"
										className={`${styles.btn} ${styles.btnPrimary}`}
										onClick={() => {
											setArtForm({
												id: 0,
												codigo: '',
												descripcion: '',
												unidadMedida: 'UNIDAD',
												stockMinimo: 0,
												observaciones: '',
											});
											setModal('articulo');
										}}
									>
										<Plus size={16} /> {primaryActionLabel}
									</button>
								)}
								{tab === 'proveedores' && canCreate.proveedores && (
									<button
										type="button"
										className={`${styles.btn} ${styles.btnPrimary}`}
										onClick={() => {
											setProvForm({
												id: 0,
												razonSocial: '',
												cuit: '',
												direccion: '',
												telefono: '',
												email: '',
												observaciones: '',
											});
											setModal('proveedor');
										}}
									>
										<Plus size={16} /> {primaryActionLabel}
									</button>
								)}
								{tab === 'ordenes' && canCreate.ordenes && (
									<button
										type="button"
										className={`${styles.btn} ${styles.btnPrimary}`}
										onClick={async () => {
											setFromSolId(null);
											setFromSolRef(null);
											setOrdenDraftOpen(false);
											const provs = await almacenService.listarProveedores().catch(() => []);
											const arts = await almacenService.listarArticulosOpciones('', 150).catch(() => []);
											setProveedores(provs);
											setArticulos(arts);
											setOrdForm({
												idProveedor: '',
												idSolicitud: '',
												nroConcurso: '',
												nroAdjudicacion: '',
												tipoOperacion: 'DIRECTA',
												condPago: 'CONTADO',
												lugarEntrega: principalDepositoNombre,
												items: [
													{
														descripcion: '',
														cantidad: '',
														precioUnitario: '',
														observaciones: '',
														idArticulo: null,
														unidadMedida: 'UNIDAD',
													},
												],
											});
											setModal('orden');
										}}
									>
										<Plus size={16} /> {primaryActionLabel}
									</button>
								)}
								{tab === 'stock' && canCreate.stock && (
									<button
										type="button"
										className={`${styles.btn} ${styles.btnSecondary}`}
										onClick={async () => {
											const arts = await almacenService.listarArticulosOpciones('', 150).catch(() => []);
											setArticulos(arts);
											setAjusteForm({
												idArticulo: '',
												idDeposito: String(depositos[0]?.IdDeposito || ''),
												lote: '',
												cantidad: '',
												observaciones: '',
											});
											setModal('ajuste');
										}}
									>
										{primaryActionLabel}
									</button>
								)}
							</div>
						</div>
					</div>
				) : null}

				<div className={styles.panelBody}>
					{loading ? (
						<div className={styles.loading}>
							<div className={styles.spinner} />
							Cargando…
						</div>
					) : (
						<>
			{tab === 'stock' && (
								<div className={styles.tableWrap}>
									<div className={styles.stockToolbar}>
										<div className={styles.stockChips} role="tablist" aria-label="Depósito">
											{depositos.map((d) => (
												<button
													key={d.IdDeposito}
													type="button"
													role="tab"
													aria-selected={stockDep === d.Codigo}
													className={`${styles.stockChip} ${stockDep === d.Codigo ? styles.stockChipActive : ''}`}
													onClick={() => setStockDep(d.Codigo)}
												>
													{d.Nombre}
													{d.EsPrincipal === true || d.EsPrincipal === 1 ? (
														<span className={styles.depTagInline}>principal</span>
													) : null}
													{(bajoMinimoByCodigo.get(d.Codigo) || 0) > 0 ? (
														<span className={styles.stockChipBadge}>
															{bajoMinimoByCodigo.get(d.Codigo)}
														</span>
													) : null}
												</button>
											))}
										</div>
										<label className={styles.stockMinCheck}>
											<input
												type="checkbox"
												checked={stockSoloMin}
												onChange={(e) => setStockSoloMin(e.target.checked)}
											/>
											Solo bajo mínimo
										</label>
									</div>
									<p className={styles.stockDepHint}>
										Stock del depósito seleccionado (por defecto el principal). Resumen por tipo de
										ítem en la sección Depósitos del catálogo.
									</p>
									{stock.length === 0 ? (
										<EmptyState
											title={stockSoloMin ? 'Sin artículos bajo mínimo' : 'Sin artículos en este depósito'}
											hint={
												stockSoloMin
													? 'No hay alertas de stock mínimo en este depósito.'
													: 'Importá el catálogo desde Vademécum (Artículos) o cargá stock con un Acta de recepción / ajuste.'
											}
										/>
									) : (
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Código</th>
													<th>Descripción</th>
													<th>Tipo</th>
													<th>Depósito</th>
													<th>Lote</th>
													<th>Cantidad</th>
													<th>Mínimo</th>
													<th>Estado</th>
												</tr>
											</thead>
											<tbody>
												{stock.map((r, i) => (
													<tr key={`${r.IdArticulo}-${r.IdDeposito}-${r.Lote}-${i}`}>
														<td className={styles.codeCell}>{r.Codigo}</td>
														<td>{r.Descripcion}</td>
														<td>{r.TipoNombre || '—'}</td>
														<td>
															{r.Deposito}
														</td>
														<td>{r.Lote || '—'}</td>
														<td>
															<strong>{r.Cantidad}</strong>
														</td>
														<td>{r.StockMinimo}</td>
														<td>
															{Number(r.BajoMinimo) === 1 || r.BajoMinimo === true ? (
																<span className={`${styles.badge} ${styles.badgeWarn}`}>Bajo mínimo</span>
															) : Number(r.Cantidad) <= 0 ? (
																<span className={`${styles.badge} ${styles.badgeDanger}`}>Sin stock</span>
															) : (
																<span className={`${styles.badge} ${styles.badgeOk}`}>OK</span>
															)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							)}

							{tab === 'depositos' && (
								<div className={styles.depOverview}>
									{depDetalle ? (
										<div className={styles.depDetailFlow}>
											<button
												type="button"
												className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
												onClick={() => {
													setDepDetalle(null);
													setDepDetalleStock([]);
													setDepAlertOpen(false);
													setDepAlertItems([]);
												}}
											>
												← Volver a depósitos
											</button>

											<div className={styles.depDetailShell} data-deposito={depDetalle.Codigo}>
												<header className={styles.depDetailShellHead}>
													<div className={styles.depDetailShellBrand}>
														<span className={styles.depDetailShellIcon} aria-hidden>
															<Warehouse size={20} strokeWidth={1.75} />
														</span>
														<div>
															<span className={styles.depDetailShellLabel}>Depósito seleccionado</span>
															<div className={styles.depDetailShellTitle}>
																<strong>{depDetalle.Nombre}</strong>
																<span className={styles.depCardCode}>{depDetalle.Codigo}</span>
																{(depDetalle.EsPrincipal === true || depDetalle.EsPrincipal === 1) && (
																	<span className={styles.depPrincipalTag}>Principal</span>
																)}
															</div>
														</div>
													</div>
												</header>

												<div className={styles.depDetailShellBody}>
													{!depAlertDismissed && depDetalle.bajoMinimo > 0 ? (
														<div className={styles.depAlertRow}>
															<button
																type="button"
																className={styles.depAlertCard}
																onClick={() => void openDepAlertas()}
																aria-expanded={depAlertOpen}
															>
																<span className={styles.depAlertBadge}>{depDetalle.bajoMinimo}</span>
																<div className={styles.depAlertCardText}>
																	<strong>Stock bajo mínimo</strong>
																	<span>
																		{depAlertOpen
																			? 'Lista expandida abajo'
																			: 'Artículos que requieren reposición en este depósito'}
																	</span>
																</div>
																<span className={styles.depAlertCta}>
																	{depAlertOpen ? 'Ocultar' : 'Ver detalle'}
																</span>
															</button>
															<button
																type="button"
																className={styles.depAlertClose}
																aria-label="Descartar alerta"
																onClick={(e) => {
																	e.stopPropagation();
																	setDepAlertDismissed(true);
																	setDepAlertOpen(false);
																}}
															>
																<X size={16} />
															</button>
														</div>
													) : null}

													{depAlertOpen ? (
														<section className={styles.depAlertPanel} aria-label="Artículos con alerta">
															<header className={styles.depAlertPanelHead}>
																<div>
																	<h3 className={styles.depChartTitle}>Artículos con alerta</h3>
																	<p className={styles.depChartSub}>
																		Bajo mínimo en {depDetalle.Nombre}
																	</p>
																</div>
																<button
																	type="button"
																	className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
																	onClick={() => setDepAlertOpen(false)}
																>
																	Cerrar lista
																</button>
															</header>
															{depAlertLoading ? (
																<div className={styles.loading}>
																	<div className={styles.spinner} />
																	Cargando alertas…
																</div>
															) : depAlertItems.length === 0 ? (
																<p className={styles.fieldHint}>No hay artículos bajo mínimo en este momento.</p>
															) : (
																<div className={styles.tableWrap}>
																	<table className={styles.table}>
																		<thead>
																			<tr>
																				<th>Código</th>
																				<th>Descripción</th>
																				<th>Tipo</th>
																				<th>Cantidad</th>
																				<th>Mínimo</th>
																				<th>Estado</th>
																			</tr>
																		</thead>
																		<tbody>
																			{depAlertItems.map((r, i) => (
																				<tr key={`alert-${r.IdArticulo}-${r.Lote}-${i}`}>
																					<td className={styles.codeCell}>{r.Codigo}</td>
																					<td>{r.Descripcion}</td>
																					<td>{r.TipoNombre || '—'}</td>
																					<td>
																						<strong>{r.Cantidad}</strong>
																					</td>
																					<td>{r.StockMinimo}</td>
																					<td>
																						<span className={`${styles.badge} ${styles.badgeWarn}`}>Bajo mínimo</span>
																					</td>
																				</tr>
																			))}
																		</tbody>
																	</table>
																</div>
															)}
														</section>
													) : null}

													<section className={styles.depChartSection} aria-label="Composición por tipo">
														<header className={styles.depChartHead}>
															<h3 className={styles.depChartTitle}>Composición por tipo de unidad</h3>
															<p className={styles.depChartSub}>
																Principales tipos y resto agrupado en Otros
															</p>
														</header>
														<div className={styles.depTipoGrid}>
															{depDetalle.porTipo.length === 0 ? (
																<p className={styles.fieldHint}>Sin artículos tipados aún.</p>
															) : (
																depDetalle.porTipo.map((t) => {
																	const Icon = tipoUnitIcon(t.tipoCodigo, t.tipoNombre);
																	const tone =
																		t.porcentaje < 40
																			? styles.depTipoCardLow
																			: t.porcentaje < 70
																				? styles.depTipoCardMid
																				: styles.depTipoCardOk;
																	return (
																		<div
																			key={`${depDetalle.IdDeposito}-${t.tipoCodigo}`}
																			className={`${styles.depTipoCard} ${tone}`}
																		>
																			<div className={styles.depTipoCardTop}>
																				<span className={styles.depTipoIcon}>
																					<Icon size={18} strokeWidth={1.75} />
																				</span>
																				<div>
																					<strong>{t.tipoNombre}</strong>
																					<span className={styles.depTipoCode}>{t.tipoCodigo || '—'}</span>
																				</div>
																				<span className={styles.depTipoPct}>{t.porcentaje}%</span>
																			</div>
																			<div className={styles.depBarTrack} aria-hidden>
																				<div
																					className={`${styles.depBarFill} ${
																						t.porcentaje < 40
																							? styles.depBarLow
																							: t.porcentaje < 70
																								? styles.depBarMid
																								: styles.depBarOk
																					}`}
																					style={{ width: `${Math.max(4, Math.min(100, t.porcentaje))}%` }}
																				/>
																			</div>
																			<div className={styles.depTipoMeta}>
																				<span>{t.items} ítems</span>
																				<span>Stock {Number(t.stockTotal).toLocaleString('es-AR')}</span>
																			</div>
																		</div>
																	);
																})
															)}
														</div>
													</section>

													<section className={styles.depDetailStockSection}>
														<header className={styles.depChartHead}>
															<h3 className={styles.depChartTitle}>Stock del depósito</h3>
															<p className={styles.depChartSub}>Inventario interno de {depDetalle.Nombre}</p>
														</header>
														<div className={styles.stockToolbar}>
															<div className={styles.searchWrap} style={{ flex: 1 }}>
																<Search size={15} className={styles.searchIcon} />
																<input
																	className={styles.search}
																	placeholder="Buscar en este depósito…"
																	value={depDetalleSearch}
																	onChange={(e) => setDepDetalleSearch(e.target.value)}
																	onKeyDown={(e) => {
																		if (e.key === 'Enter') {
																			void loadDepDetalleStock(depDetalle, depDetalleSearch, depDetalleSoloMin);
																		}
																	}}
																/>
															</div>
															<label className={styles.stockMinCheck}>
																<input
																	type="checkbox"
																	checked={depDetalleSoloMin}
																	onChange={(e) => {
																		const v = e.target.checked;
																		setDepDetalleSoloMin(v);
																		void loadDepDetalleStock(depDetalle, depDetalleSearch, v);
																	}}
																/>
																Solo bajo mínimo
															</label>
															<button
																type="button"
																className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
																onClick={() =>
																	void loadDepDetalleStock(depDetalle, depDetalleSearch, depDetalleSoloMin)
																}
															>
																Buscar
															</button>
														</div>
														{depDetalleLoading ? (
															<div className={styles.loading}>
																<div className={styles.spinner} />
																Cargando detalle…
															</div>
														) : depDetalleStock.length === 0 ? (
															<EmptyState
																title="Sin ítems para mostrar"
																hint="Probá quitar el filtro o buscá por código/descripción."
															/>
														) : (
															<div className={styles.tableWrap}>
																<table className={styles.table}>
																	<thead>
																		<tr>
																			<th>Código</th>
																			<th>Descripción</th>
																			<th>Tipo</th>
																			<th>Cantidad</th>
																			<th>Mínimo</th>
																			<th>Estado</th>
																		</tr>
																	</thead>
																	<tbody>
																		{depDetalleStock.map((r, i) => (
																			<tr key={`${r.IdArticulo}-${r.Lote}-${i}`}>
																				<td className={styles.codeCell}>{r.Codigo}</td>
																				<td>{r.Descripcion}</td>
																				<td>{r.TipoNombre || '—'}</td>
																				<td>
																					<strong>{r.Cantidad}</strong>
																				</td>
																				<td>{r.StockMinimo}</td>
																				<td>
																					{Number(r.BajoMinimo) === 1 ? (
																						<span className={`${styles.badge} ${styles.badgeWarn}`}>Bajo mínimo</span>
																					) : Number(r.Cantidad) <= 0 ? (
																						<span className={`${styles.badge} ${styles.badgeDanger}`}>Sin stock</span>
																					) : (
																						<span className={`${styles.badge} ${styles.badgeOk}`}>OK</span>
																					)}
																				</td>
																			</tr>
																		))}
																	</tbody>
																</table>
															</div>
														)}
													</section>
												</div>
											</div>
										</div>
									) : depResumen.length === 0 ? (
										<EmptyState
											title="Sin depósitos"
											hint="Configurá depósitos en Configuración. El catálogo de artículos se sincroniza del vademécum cada 24 h."
										/>
									) : (
										<div className={styles.depCardGrid}>
											{depResumen.map((d) => (
												<button
													key={d.IdDeposito}
													type="button"
													className={styles.depCard}
													onClick={() => void openDepDetalle(d)}
												>
													<header className={styles.depCardHead}>
														<div>
															<strong className={styles.depCardTitle}>{d.Nombre}</strong>
															<span className={styles.depCardCode}>{d.Codigo}</span>
															{(d.EsPrincipal === true || d.EsPrincipal === 1) && (
																<span className={styles.depPrincipalTag}>Principal</span>
															)}
														</div>
														<span className={styles.depCardCta}>
															Ver detalle <ArrowRight size={14} />
														</span>
													</header>
													<div className={styles.depCardMeta}>
														<span>{d.itemsCatalogo} ítems</span>
														<span>Stock {Number(d.stockTotal).toLocaleString('es-AR')}</span>
														{d.bajoMinimo > 0 ? (
															<span className={styles.depWarn}>{d.bajoMinimo} bajo mínimo</span>
														) : (
															<span>Sin alertas</span>
														)}
													</div>
													<div className={styles.depBars}>
														{d.porTipo.length === 0 ? (
															<p className={styles.fieldHint}>Sin artículos tipados. Esperá la sync del vademécum o creá artículos.</p>
														) : (
															d.porTipo.map((t) => (
																<div key={`${d.IdDeposito}-${t.tipoCodigo}`} className={styles.depBarRow}>
																	<div className={styles.depBarLabels}>
																		<span>{t.tipoNombre}</span>
																		<span>
																			{t.porcentaje}% · {t.items} ítems
																		</span>
																	</div>
																	<div className={styles.depBarTrack} aria-hidden>
																		<div
																			className={`${styles.depBarFill} ${
																				t.porcentaje < 40
																					? styles.depBarLow
																					: t.porcentaje < 70
																						? styles.depBarMid
																						: styles.depBarOk
																			}`}
																			style={{ width: `${Math.max(2, Math.min(100, t.porcentaje))}%` }}
																		/>
																	</div>
																</div>
															))
														)}
													</div>
												</button>
											))}
										</div>
									)}
								</div>
							)}

							{tab === 'articulos' && (
								<div className={styles.tableWrap}>
									{vadEstado?.disponible ? (
										<p className={styles.stockDepHint}>
											Vademécum hospitalario: {Number(vadEstado.enVademecum).toLocaleString('es-AR')} ítems
											activos · En almacén (origen VADE):{' '}
											{Number(vadEstado.importados).toLocaleString('es-AR')}
											{vadEstado.ultimaSync
												? ` · Última sync automática: ${fmtDate(vadEstado.ultimaSync)}`
												: ' · La sincronización automática corre cada 24 h'}
											. No carga cantidades de stock.
										</p>
									) : vadEstado && !vadEstado.disponible ? (
										<p className={styles.stockDepHint}>{vadEstado.mensaje || 'Vademécum no disponible'}</p>
									) : null}
									{articulos.length === 0 ? (
										<EmptyState
											title="Catálogo vacío"
											hint="La sincronización automática del vademécum se ejecuta cada 24 h. También podés crear artículos manualmente."
										/>
									) : (
										<>
											<table className={styles.table}>
												<thead>
													<tr>
														<th>Código</th>
														<th>Descripción</th>
														<th>Tipo</th>
														<th>Unidad</th>
														<th>Stock total</th>
														<th>Mínimo</th>
														<th></th>
													</tr>
												</thead>
												<tbody>
													{articulos.map((a) => (
														<tr key={a.IdArticulo}>
															<td className={styles.codeCell}>{a.Codigo}</td>
															<td>{a.Descripcion}</td>
															<td>{a.TipoNombre || '—'}</td>
															<td>{a.UnidadMedida || '—'}</td>
															<td>
																<strong>{a.StockTotal ?? 0}</strong>
															</td>
															<td>{a.StockMinimo}</td>
															<td>
																<div className={styles.rowActions}>
																	{canCreate.artEdit && (
																		<button
																			type="button"
																			className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
																			onClick={() => {
																				setArtForm({
																					id: a.IdArticulo,
																					codigo: a.Codigo,
																					descripcion: a.Descripcion,
																					unidadMedida: a.UnidadMedida || 'UNIDAD',
																					stockMinimo: Number(a.StockMinimo) || 0,
																					observaciones: a.Observaciones || '',
																				});
																				setModal('articulo');
																			}}
																		>
																			Editar
																		</button>
																	)}
																	{canCreate.artEdit && (
																		<button
																			type="button"
																			className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
																			onClick={async () => {
																				if (!window.confirm(`¿Desactivar ${a.Codigo}?`)) return;
																				try {
																					await almacenService.eliminarArticulo(a.IdArticulo);
																					clearArtsCache();
																					await loadTab();
																				} catch (e: unknown) {
																					setError(e instanceof Error ? e.message : 'Error al eliminar');
																				}
																			}}
																		>
																			Borrar
																		</button>
																	)}
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
											{artTotal > ART_PAGE_SIZE ? (
												<div className={styles.pager}>
													<span className={styles.pagerInfo}>
														{(artPage - 1) * ART_PAGE_SIZE + 1}–
														{Math.min(artPage * ART_PAGE_SIZE, artTotal)} de {artTotal.toLocaleString('es-AR')}
													</span>
													<div className={styles.pagerBtns}>
														<button
															type="button"
															className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
															disabled={artPage <= 1 || loading}
															onClick={() => setArtPage((p) => Math.max(1, p - 1))}
														>
															<ChevronLeft size={16} /> Anterior
														</button>
														<span className={styles.pagerPage}>
															Pág. {artPage} / {Math.max(1, Math.ceil(artTotal / ART_PAGE_SIZE))}
														</span>
														<button
															type="button"
															className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
															disabled={artPage * ART_PAGE_SIZE >= artTotal || loading}
															onClick={() => setArtPage((p) => p + 1)}
														>
															Siguiente <ChevronRight size={16} />
														</button>
													</div>
												</div>
											) : null}
										</>
									)}
								</div>
							)}

							{tab === 'proveedores' && (
								<div className={styles.tableWrap}>
									{proveedores.length === 0 ? (
										<EmptyState title="Sin proveedores" hint="Registrá proveedores con CUIT y dirección." />
									) : (
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Razón social</th>
													<th>CUIT</th>
													<th>Dirección</th>
													<th>Teléfono</th>
													<th></th>
												</tr>
											</thead>
											<tbody>
												{proveedores.map((p) => (
													<tr key={p.IdProveedor}>
														<td>
															<strong>{p.RazonSocial}</strong>
														</td>
														<td className={styles.codeCell}>{p.CUIT || '—'}</td>
														<td>{p.Direccion || '—'}</td>
														<td>{p.Telefono || '—'}</td>
														<td>
															<div className={styles.rowActions}>
																{canCreate.provEdit && (
																	<button
																		type="button"
																		className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
																		onClick={() => {
																			setProvForm({
																				id: p.IdProveedor,
																				razonSocial: p.RazonSocial,
																				cuit: p.CUIT || '',
																				direccion: p.Direccion || '',
																				telefono: p.Telefono || '',
																				email: p.Email || '',
																				observaciones: p.Observaciones || '',
																			});
																			setModal('proveedor');
																		}}
																	>
																		Editar
																	</button>
																)}
																{canCreate.provEdit && (
																	<button
																		type="button"
																		className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
																		onClick={async () => {
																			if (!window.confirm(`¿Desactivar ${p.RazonSocial}?`)) return;
																			try {
																				await almacenService.eliminarProveedor(p.IdProveedor);
																				await loadTab();
																			} catch (e: unknown) {
																				setError(e instanceof Error ? e.message : 'Error al eliminar');
																			}
																		}}
																	>
																		Borrar
																	</button>
																)}
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							)}

							{tab === 'solicitudes' && (
								<div style={{ padding: '0.75rem 1rem 1rem' }}>
									<SolicitudProvisionWorkspace
										canCreate={!!canCreate.solicitudes}
										canEdit={!!canCreate.solEdit}
										canEnviar={!!canCreate.gestSol || !!canCreate.solicitudes}
										canGenerarOrden={!!canCreate.ordenes}
										canTransferir={!!canCreate.stock}
										onError={setError}
										onChanged={() => void loadResumen()}
										onGenerarOrden={(id) => void openOrdenFromSol(id)}
									/>
								</div>
							)}

							{tab === 'config' && (
								<div style={{ padding: '0.75rem 1rem 1rem' }}>
									{canCreate.config ? (
										<AlmacenConfigPanel canEdit={!!canCreate.configEdit} onError={setError} />
									) : (
										<div className={styles.error}>No tenés permiso para ver la configuración de almacén.</div>
									)}
								</div>
							)}

							{tab === 'ordenes' && (
								<div className={styles.tableWrap}>
									{ordenes.length === 0 ? (
										<EmptyState title="Sin órdenes" hint="Generá una orden desde una solicitud aprobada o creala manualmente." />
									) : (
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Nº orden</th>
													<th>Expediente</th>
													<th>Proveedor</th>
													<th>Total</th>
													<th>Estado</th>
													<th></th>
												</tr>
											</thead>
											<tbody>
												{ordenes.map((o) => (
													<tr key={o.IdOrden}>
														<td className={styles.codeCell}>{o.NroOrden}</td>
														<td>{o.NroExpediente || '—'}</td>
														<td>{o.Proveedor || '—'}</td>
														<td className={styles.money}>{fmtMoney(o.Total)}</td>
														<td>
															<span className={`${styles.badge} ${badgeClass(o.Estado)}`}>{o.Estado}</span>
														</td>
														<td>
															<div className={styles.rowActions}>
																<button
																	type="button"
																	className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
																	onClick={() => void viewOrden(o.IdOrden)}
																>
																	Ver
																</button>
																{canCreate.actas && ['EMITIDA', 'PARCIAL'].includes(o.Estado) && (
																	<button
																		type="button"
																		className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
																		onClick={() => void openActaFromOrden(o.IdOrden)}
																	>
																		Recibir <ArrowRight size={12} />
																	</button>
																)}
																{canCreate.ordenes && ['EMITIDA', 'BORRADOR'].includes(o.Estado) && (
																	<button
																		type="button"
																		className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
																		onClick={async () => {
																			if (!window.confirm(`¿Anular orden ${o.NroOrden}?`)) return;
																			try {
																				await almacenService.anularOrden(o.IdOrden);
																				await loadTab();
																			} catch (e: unknown) {
																				setError(e instanceof Error ? e.message : 'Error al anular orden');
																			}
																		}}
																	>
																		Anular
																	</button>
																)}
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							)}

							{tab === 'actas' && (
								<div className={styles.tableWrap}>
									{actas.length === 0 ? (
										<EmptyState title="Sin actas" hint="Confirmá la recepción desde una orden emitida (pestaña Órdenes → Recibir)." />
									) : (
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Nº acta</th>
													<th>Fecha</th>
													<th>Orden</th>
													<th>Proveedor</th>
													<th>Total</th>
													<th>Factura</th>
													<th></th>
												</tr>
											</thead>
											<tbody>
												{actas.map((a) => (
													<tr key={a.IdActa}>
														<td className={styles.codeCell}>{a.NroActa}</td>
														<td>{fmtDate(a.Fecha)}</td>
														<td>{a.NroOrden || a.IdOrden}</td>
														<td>{a.Proveedor || '—'}</td>
														<td className={styles.money}>{fmtMoney(a.Total)}</td>
														<td>{a.NroFactura || '—'}</td>
														<td>
															<button
																type="button"
																className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
																onClick={() => void viewActa(a.IdActa)}
															>
																Ver
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							)}

							{tab === 'trazabilidad' && (
								<div className={styles.tableWrap}>
									<p className={styles.stockDepHint}>
										Hacé click en un renglón para ver la línea de tiempo completa del artículo: fechas,
										documentos, estados y ubicaciones.
									</p>
									{trazabilidad.length === 0 ? (
										<EmptyState
											title="Sin trazabilidad aún"
											hint="Los movimientos aparecen al generar actas, salidas a servicios o ajustes de stock."
										/>
									) : (
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Fecha</th>
													<th>Evento</th>
													<th>Artículo</th>
													<th>Depósito</th>
													<th>Cant.</th>
													<th>Documento</th>
													<th>Cadena</th>
													<th>Operador</th>
												</tr>
											</thead>
											<tbody>
												{trazabilidad.map((m) => {
													const tipoDoc = (m.TipoDocumento || '').toUpperCase();
													const docLabel = m.NroDocumento
														? `${m.TipoDocumento || 'DOC'} ${m.NroDocumento}`
														: m.TipoDocumento
															? `${m.TipoDocumento} #${m.IdDocumento || '—'}`
															: '—';
													const parentLabel = m.NroDocumentoPadre
														? tipoDoc.includes('ACTA')
															? `← Orden ${m.NroDocumentoPadre}`
															: tipoDoc.includes('ORDEN') || tipoDoc === 'OP'
																? `← Sol. ${m.NroDocumentoPadre}`
																: `← ${m.NroDocumentoPadre}`
														: null;
													return (
														<tr
															key={m.IdMovimiento}
															className={styles.traceRow}
															onClick={() => void openTraceDetalle(m.IdArticulo)}
															title="Ver detalle de trazabilidad"
														>
															<td>{fmtDate(m.Fecha)}</td>
															<td>
																<span className={`${styles.badge} ${styles.badgeMuted}`}>{m.Tipo}</span>
															</td>
															<td>
																<span className={styles.codeCell}>{m.Codigo}</span> — {m.Descripcion}
															</td>
															<td>
																{m.Deposito}
																{m.DepositoCodigo ? (
																	<span className={styles.depCardCode}> {m.DepositoCodigo}</span>
																) : null}
															</td>
															<td>
																<strong>{m.Cantidad}</strong>
																{m.UnidadMedida ? ` ${m.UnidadMedida}` : ''}
															</td>
															<td className={styles.codeCell}>{docLabel}</td>
															<td>
																{parentLabel ? (
																	<span className={styles.traceChain}>{parentLabel}</span>
																) : (
																	<span className={styles.fieldHint}>{m.Observaciones || '—'}</span>
																)}
															</td>
															<td>{m.Operador || '—'}</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									)}
								</div>
							)}

							{tab === 'movimientos' && (
								<div className={styles.tableWrap}>
									{movimientos.length === 0 ? (
										<EmptyState title="Sin movimientos" hint="El kardex se completa con entradas (actas) y salidas o ajustes." />
									) : (
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Fecha</th>
													<th>Tipo</th>
													<th>Artículo</th>
													<th>Depósito</th>
													<th>Lote</th>
													<th>Cantidad</th>
													<th>Saldo</th>
													<th>Documento</th>
													<th>Operador</th>
												</tr>
											</thead>
											<tbody>
												{movimientos.map((m) => (
													<tr key={m.IdMovimiento}>
														<td>{fmtDate(m.Fecha)}</td>
														<td>
															<span className={`${styles.badge} ${styles.badgeMuted}`}>{m.Tipo}</span>
														</td>
														<td>
															<span className={styles.codeCell}>{m.Codigo}</span> — {m.Descripcion}
														</td>
														<td>{m.Deposito}</td>
														<td>{m.Lote || '—'}</td>
														<td>
															<strong>{m.Cantidad}</strong>
														</td>
														<td>{m.SaldoResultante ?? '—'}</td>
														<td>
															{m.TipoDocumento || '—'} {m.IdDocumento || ''}
														</td>
														<td>{m.Operador || '—'}</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							)}
						</>
					)}
				</div>
			</section>

			{/* ─── Modales ─── */}
			{modal === 'articulo' && (
				<div className={styles.overlay} onClick={closeModal}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h2>{artForm.id ? 'Editar artículo' : 'Nuevo artículo'}</h2>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={closeModal}>
								Cerrar
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.formGrid}>
								<div className={styles.field}>
									<label>Código</label>
									<input
										value={artForm.codigo}
										onChange={(e) => setArtForm({ ...artForm, codigo: e.target.value })}
										placeholder="2.133"
										readOnly={!!artForm.id}
										disabled={!!artForm.id}
										className={artForm.id ? styles.inputReadonly : undefined}
									/>
									{artForm.id ? (
										<span className={styles.fieldHint}>El código no se puede modificar</span>
									) : null}
								</div>
								<div className={`${styles.field} ${styles.fieldFull}`}>
									<label>Descripción</label>
									<input value={artForm.descripcion} onChange={(e) => setArtForm({ ...artForm, descripcion: e.target.value })} placeholder="Pilas medianas - UNIDAD X 1" />
								</div>
								<div className={styles.field}>
									<label>Unidad</label>
									<input value={artForm.unidadMedida} onChange={(e) => setArtForm({ ...artForm, unidadMedida: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Stock mínimo</label>
									<input type="number" value={artForm.stockMinimo} onChange={(e) => setArtForm({ ...artForm, stockMinimo: Number(e.target.value) })} />
								</div>
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>
								Cancelar
							</button>
							<button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving} onClick={() => void submitArticulo()}>
								{saving ? 'Guardando...' : 'Guardar'}
							</button>
						</div>
					</div>
				</div>
			)}

			{modal === 'proveedor' && (
				<div className={styles.overlay} onClick={closeModal}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h2>{provForm.id ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={closeModal}>
								Cerrar
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.formGrid}>
								<div className={`${styles.field} ${styles.fieldFull}`}>
									<label>Razón social</label>
									<input value={provForm.razonSocial} onChange={(e) => setProvForm({ ...provForm, razonSocial: e.target.value })} placeholder="PAPELERA LIBERTAD..." />
								</div>
								<div className={styles.field}>
									<label>CUIT</label>
									<input value={provForm.cuit} onChange={(e) => setProvForm({ ...provForm, cuit: e.target.value })} placeholder="30-71132714-9" />
								</div>
								<div className={styles.field}>
									<label>Dirección</label>
									<input value={provForm.direccion} onChange={(e) => setProvForm({ ...provForm, direccion: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Teléfono</label>
									<input value={provForm.telefono} onChange={(e) => setProvForm({ ...provForm, telefono: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Email</label>
									<input value={provForm.email} onChange={(e) => setProvForm({ ...provForm, email: e.target.value })} />
								</div>
								<div className={`${styles.field} ${styles.fieldFull}`}>
									<label>Observación</label>
									<textarea
										value={provForm.observaciones}
										onChange={(e) => setProvForm({ ...provForm, observaciones: e.target.value })}
										placeholder="Notas u observaciones del proveedor (opcional)"
										rows={3}
									/>
								</div>
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>
								Cancelar
							</button>
							<button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving} onClick={() => void submitProveedor()}>
								{saving ? 'Guardando...' : 'Guardar'}
							</button>
						</div>
					</div>
				</div>
			)}

			{modal === 'solicitud' && (
				<div className={styles.overlay} onClick={closeModal}>
					<div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h2>Solicitud de provisión</h2>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={closeModal}>
								Cerrar
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.formGrid}>
								<div className={`${styles.field} ${styles.fieldFull} ${styles.alSelectField}`}>
									<CustomSelect
										label="Origen (sector)"
										name="solFormOrigen"
										value={solForm.destino}
										isLoading={false}
										onChange={(v) => setSolForm({ ...solForm, destino: String(v || '') })}
										options={[
											{ value: '', label: 'Seleccionar…' },
											...solOrigenes.map((o) => ({
												value: String(o.IdSector),
												label: o.Nombre,
											})),
										]}
									/>
								</div>
								<div className={styles.field}>
									<label>Solicitante</label>
									<input value={solForm.solicitante} onChange={(e) => setSolForm({ ...solForm, solicitante: e.target.value })} />
								</div>
								<div className={`${styles.field} ${styles.fieldFull}`}>
									<label>Para ser utilizados en...</label>
									<input value={solForm.justificacion} onChange={(e) => setSolForm({ ...solForm, justificacion: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Costo estimado</label>
									<input type="number" value={solForm.costoEstimado} onChange={(e) => setSolForm({ ...solForm, costoEstimado: e.target.value })} />
								</div>
							</div>
							<div className={styles.itemsBox}>
								<table>
									<thead>
										<tr>
											<th>Código</th>
											<th>Descripción</th>
											<th>Obs.</th>
											<th>Cant.</th>
											<th></th>
										</tr>
									</thead>
									<tbody>
										{solForm.items.map((it, idx) => (
											<tr key={idx}>
												<td>
													<input
														value={it.Codigo || ''}
														onChange={(e) => {
															const items = [...solForm.items];
															items[idx] = { ...items[idx], Codigo: e.target.value };
															setSolForm({ ...solForm, items });
														}}
													/>
												</td>
												<td>
													<input
														value={it.Descripcion}
														onChange={(e) => {
															const items = [...solForm.items];
															items[idx] = { ...items[idx], Descripcion: e.target.value };
															setSolForm({ ...solForm, items });
														}}
													/>
												</td>
												<td>
													<input
														value={it.Observaciones || ''}
														onChange={(e) => {
															const items = [...solForm.items];
															items[idx] = { ...items[idx], Observaciones: e.target.value };
															setSolForm({ ...solForm, items });
														}}
														placeholder="C2"
													/>
												</td>
												<td>
													<input
														type="number"
														value={it.Cantidad}
														onChange={(e) => {
															const items = [...solForm.items];
															items[idx] = { ...items[idx], Cantidad: Number(e.target.value) };
															setSolForm({ ...solForm, items });
														}}
													/>
												</td>
												<td>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
														onClick={() => setSolForm({ ...solForm, items: solForm.items.filter((_, i) => i !== idx) })}
													>
														×
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setSolForm({ ...solForm, items: [...solForm.items, emptyItem()] })}>
								+ Renglón
							</button>
						</div>
						<div className={styles.modalFooter}>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>
								Cancelar
							</button>
							<button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving} onClick={() => void submitSolicitud()}>
								{saving ? 'Guardando...' : 'Crear solicitud'}
							</button>
						</div>
					</div>
				</div>
			)}

			{modal === 'estado' && (
				<div className={styles.overlay} onClick={closeModal}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h2>Aprobar / cambiar estado</h2>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={closeModal}>
								Cerrar
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.formGrid}>
								<div className={`${styles.field} ${styles.alSelectField}`}>
									<CustomSelect
										label="Estado"
										name="estadoSol"
										value={estadoForm.estado}
										isLoading={false}
										onChange={(v) => setEstadoForm({ ...estadoForm, estado: String(v || '') })}
										options={[
											{ value: 'APROBADA', label: 'APROBADA' },
											{ value: 'RECHAZADA', label: 'RECHAZADA' },
											{ value: 'SOLICITADA', label: 'SOLICITADA' },
											{ value: 'ANULADA', label: 'ANULADA' },
										]}
									/>
								</div>
								<div className={styles.field}>
									<label>Aprobador</label>
									<input value={estadoForm.aprobador} onChange={(e) => setEstadoForm({ ...estadoForm, aprobador: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Costo estimado</label>
									<input type="number" value={estadoForm.costoEstimado} onChange={(e) => setEstadoForm({ ...estadoForm, costoEstimado: e.target.value })} />
								</div>
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>
								Cancelar
							</button>
							<button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving} onClick={() => void submitEstado()}>
								Confirmar
							</button>
						</div>
					</div>
				</div>
			)}

			{modal === 'orden' && (
				<div className={styles.overlay} onClick={closeModal}>
					<div
						className={`${styles.modal} ${styles.modalOrden}`}
						onClick={(e) => e.stopPropagation()}
						role="dialog"
						aria-modal="true"
						aria-labelledby="orden-modal-title"
					>
						<div className={styles.modalHeader}>
							<div className={styles.modalTitleBlock}>
								<h2 id="orden-modal-title">Orden de provisión</h2>
								{fromSolRef && (
									<p className={styles.modalContext}>
										Desde{' '}
										<button
											type="button"
											className={styles.contextLink}
											onClick={() => void openSolicitudContext(fromSolRef.id)}
											title="Ver la solicitud de provisión origen"
										>
											solicitud {fromSolRef.nro}
										</button>
										{fromSolRef.origen ? (
											<span className={styles.modalContextMeta}> · {fromSolRef.origen}</span>
										) : null}
									</p>
								)}
							</div>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={closeModal}>
								Cerrar
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.formGrid}>
								<div className={`${styles.field} ${styles.fieldFull} ${styles.alSelectField}`}>
									<CustomSelect
										label="Proveedor"
										name="ordProveedor"
										value={ordForm.idProveedor}
										isLoading={false}
										onChange={(v) => setOrdForm({ ...ordForm, idProveedor: String(v || '') })}
										options={[
											{ value: '', label: 'Seleccionar…' },
											...proveedores.map((p) => ({
												value: String(p.IdProveedor),
												label: `${p.RazonSocial}${p.CUIT ? ` (${p.CUIT})` : ''}`,
											})),
										]}
									/>
								</div>
								<div className={styles.field}>
									<label>Nº concurso</label>
									<input value={ordForm.nroConcurso} onChange={(e) => setOrdForm({ ...ordForm, nroConcurso: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Nº adjudicación</label>
									<input value={ordForm.nroAdjudicacion} onChange={(e) => setOrdForm({ ...ordForm, nroAdjudicacion: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Tipo operación</label>
									<input value={ordForm.tipoOperacion} onChange={(e) => setOrdForm({ ...ordForm, tipoOperacion: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Condición de pago</label>
									<input value={ordForm.condPago} onChange={(e) => setOrdForm({ ...ordForm, condPago: e.target.value })} />
								</div>
								<div className={`${styles.field} ${styles.fieldFull}`}>
									<label>Lugar de entrega</label>
									<input value={ordForm.lugarEntrega} onChange={(e) => setOrdForm({ ...ordForm, lugarEntrega: e.target.value })} />
								</div>
							</div>
							<div className={`${styles.itemsBox} ${styles.itemsBoxOrden}`}>
								<table>
									<thead>
										<tr>
											<th>Descripción</th>
											<th>Unidad</th>
											<th>Observación</th>
											<th>Cantidad</th>
											<th>Precio unitario</th>
											<th>Subtotal</th>
										</tr>
									</thead>
									<tbody>
										{ordForm.items.map((it, idx) => {
											const cant = Number(String(it.cantidad).replace(',', '.')) || 0;
											const pu = Number(String(it.precioUnitario).replace(',', '.')) || 0;
											return (
												<tr key={idx}>
													<td>
														<input
															value={it.descripcion}
															onChange={(e) => {
																const items = [...ordForm.items];
																items[idx] = { ...items[idx], descripcion: e.target.value };
																setOrdForm({ ...ordForm, items });
															}}
														/>
													</td>
													<td className={styles.codeCell}>{it.unidadMedida || '—'}</td>
													<td>
														<input
															value={it.observaciones}
															onChange={(e) => {
																const items = [...ordForm.items];
																items[idx] = { ...items[idx], observaciones: e.target.value };
																setOrdForm({ ...ordForm, items });
															}}
														/>
													</td>
													<td>
														<input
															inputMode="decimal"
															value={it.cantidad}
															onChange={(e) => {
																const raw = e.target.value.replace(',', '.');
																if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
																const items = [...ordForm.items];
																items[idx] = { ...items[idx], cantidad: raw };
																setOrdForm({ ...ordForm, items });
															}}
														/>
													</td>
													<td>
														<input
															inputMode="decimal"
															value={it.precioUnitario}
															placeholder="0"
															onChange={(e) => {
																let raw = e.target.value.replace(',', '.');
																if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
																// sin ceros a la izquierda: "02" → "2"
																if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
																	raw = raw.replace(/^0+/, '') || '0';
																}
																const items = [...ordForm.items];
																items[idx] = { ...items[idx], precioUnitario: raw };
																setOrdForm({ ...ordForm, items });
															}}
														/>
													</td>
													<td className={styles.money}>{fmtMoney(cant * pu)}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>
								Cancelar
							</button>
							<button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving} onClick={() => void submitOrden()}>
								{saving ? 'Guardando...' : 'Emitir orden'}
							</button>
						</div>
					</div>
				</div>
			)}

			{modal === 'acta' && ordenDetail && (
				<div className={styles.overlay} onClick={closeModal}>
					<div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h2>Acta de recepción — Orden {ordenDetail.NroOrden}</h2>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={closeModal}>
								Cerrar
							</button>
						</div>
						<div className={styles.modalBody}>
							<p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
								Confirma recepción de mercadería del proveedor {ordenDetail.Proveedor || '—'} e ingresa stock al almacén.
							</p>
							<div className={styles.formGrid}>
								<div className={styles.field}>
									<label>Nº factura</label>
									<input value={actaForm.nroFactura} onChange={(e) => setActaForm({ ...actaForm, nroFactura: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Descuento</label>
									<input type="number" value={actaForm.descuento} onChange={(e) => setActaForm({ ...actaForm, descuento: Number(e.target.value) })} />
								</div>
							</div>
							<div className={styles.itemsBox}>
								<table>
									<thead>
										<tr>
											<th>Descripción</th>
											<th>Marca</th>
											<th>Lote</th>
											<th>Cant.</th>
											<th>P. unit.</th>
										</tr>
									</thead>
									<tbody>
										{actaForm.items.map((it, idx) => (
											<tr key={idx}>
												<td>{it.descripcion}</td>
												<td>
													<input
														value={it.marca}
														onChange={(e) => {
															const items = [...actaForm.items];
															items[idx] = { ...items[idx], marca: e.target.value };
															setActaForm({ ...actaForm, items });
														}}
													/>
												</td>
												<td>
													<input
														value={it.lote}
														onChange={(e) => {
															const items = [...actaForm.items];
															items[idx] = { ...items[idx], lote: e.target.value };
															setActaForm({ ...actaForm, items });
														}}
													/>
												</td>
												<td>
													<input
														type="number"
														value={it.cantidad}
														onChange={(e) => {
															const items = [...actaForm.items];
															items[idx] = { ...items[idx], cantidad: Number(e.target.value) };
															setActaForm({ ...actaForm, items });
														}}
													/>
												</td>
												<td className={styles.money}>{fmtMoney(it.precioUnitario)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>
								Cancelar
							</button>
							<button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving} onClick={() => void submitActa()}>
								{saving ? 'Confirmando...' : 'Confirmar recepción e ingresar stock'}
							</button>
						</div>
					</div>
				</div>
			)}

			{modal === 'ajuste' && (
				<div className={styles.overlay} onClick={closeModal}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h2>Ajuste de stock</h2>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={closeModal}>
								Cerrar
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.formGrid}>
								<div className={`${styles.field} ${styles.fieldFull} ${styles.alSelectField}`}>
									<CustomSelect
										label="Artículo"
										name="ajusteArt"
										value={ajusteForm.idArticulo}
										isLoading={false}
										onChange={(v) => setAjusteForm({ ...ajusteForm, idArticulo: String(v || '') })}
										options={[
											{ value: '', label: 'Seleccionar…' },
											...articulos.map((a) => ({
												value: String(a.IdArticulo),
												label: `${a.Codigo} — ${a.Descripcion}`,
											})),
										]}
									/>
								</div>
								<div className={`${styles.field} ${styles.alSelectField}`}>
									<CustomSelect
										label="Depósito"
										name="ajusteDep"
										value={ajusteForm.idDeposito}
										isLoading={false}
										onChange={(v) => setAjusteForm({ ...ajusteForm, idDeposito: String(v || '') })}
										options={depositos.map((d) => ({
											value: String(d.IdDeposito),
											label: d.Nombre,
										}))}
									/>
								</div>
								<div className={styles.field}>
									<label>Lote</label>
									<input value={ajusteForm.lote} onChange={(e) => setAjusteForm({ ...ajusteForm, lote: e.target.value })} />
								</div>
								<div className={styles.field}>
									<label>Cantidad (+/-)</label>
									<input type="number" value={ajusteForm.cantidad} onChange={(e) => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })} />
								</div>
								<div className={`${styles.field} ${styles.fieldFull}`}>
									<label>Observaciones</label>
									<input value={ajusteForm.observaciones} onChange={(e) => setAjusteForm({ ...ajusteForm, observaciones: e.target.value })} />
								</div>
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>
								Cancelar
							</button>
							<button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving} onClick={() => void submitAjuste()}>
								Aplicar
							</button>
						</div>
					</div>
				</div>
			)}

			{(modal === 'viewSol' || modal === 'viewOrd' || modal === 'viewActa') && detail && (
				<div className={styles.overlay} onClick={closeModal}>
					<div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<div className={styles.modalTitleBlock}>
								<h2>
									{modal === 'viewSol' && `Solicitud ${(detail as AlmacenSolicitud).NroPedido}`}
									{modal === 'viewOrd' && `Orden ${(detail as AlmacenOrden).NroOrden}`}
									{modal === 'viewActa' && `Acta ${(detail as AlmacenActa).NroActa}`}
								</h2>
								{modal === 'viewSol' && ordenDraftOpen && (
									<p className={styles.modalContext}>
										<button type="button" className={styles.contextLink} onClick={closeModal}>
											← Volver a la orden de provisión
										</button>
									</p>
								)}
							</div>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={closeModal}>
								{modal === 'viewSol' && ordenDraftOpen ? 'Volver' : 'Cerrar'}
							</button>
						</div>
						<div className={styles.modalBody}>
							{modal === 'viewSol' &&
								(() => {
									const s = detail as AlmacenSolicitud;
									return (
										<>
											<div className={styles.detailGrid}>
												<div className={styles.detailItem}>
													<span>Estado</span>
													<strong>
														<span className={`${styles.badge} ${badgeClass(s.Estado)}`}>{s.Estado}</span>
													</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Fecha</span>
													<strong>{fmtDate(s.FechaPedido)}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Origen</span>
													<strong>{s.Origen || s.Destino || '—'}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Solicitante</span>
													<strong>{s.Solicitante || '—'}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Costo estimado</span>
													<strong>{fmtMoney(s.CostoEstimado)}</strong>
												</div>
												<div className={`${styles.detailItem}`} style={{ gridColumn: '1 / -1' }}>
													<span>Para ser utilizados en…</span>
													<strong>{s.Justificacion || '—'}</strong>
												</div>
											</div>
											<div className={styles.itemsBox}>
												<table>
													<thead>
														<tr>
															<th>#</th>
															<th>Código</th>
															<th>Descripción</th>
															<th>Obs.</th>
															<th>Cant.</th>
														</tr>
													</thead>
													<tbody>
														{(s.items || []).map((it, i) => (
															<tr key={it.IdItem || i}>
																<td>{it.Renglon ?? i + 1}</td>
																<td>{it.Codigo || '—'}</td>
																<td>{it.Descripcion}</td>
																<td>{it.Observaciones || '—'}</td>
																<td>
																	<strong>{it.Cantidad}</strong>
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</>
									);
								})()}
							{modal === 'viewOrd' &&
								(() => {
									const o = detail as AlmacenOrden;
									return (
										<>
											<div className={styles.detailGrid}>
												<div className={styles.detailItem}>
													<span>Estado</span>
													<strong>
														<span className={`${styles.badge} ${badgeClass(o.Estado)}`}>{o.Estado}</span>
													</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Expediente</span>
													<strong>{o.NroExpediente || '—'}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Proveedor</span>
													<strong>{o.Proveedor || '—'}</strong>
												</div>
												{o.IdSolicitud ? (
													<div className={styles.detailItem}>
														<span>Solicitud origen</span>
														<strong>
															<button
																type="button"
																className={styles.contextLink}
																onClick={() => {
																	setOrdenDraftOpen(false);
																	void openSolicitudContext(Number(o.IdSolicitud));
																}}
															>
																{o.NroPedido ? `Solicitud ${o.NroPedido}` : `Solicitud #${o.IdSolicitud}`}
															</button>
														</strong>
													</div>
												) : null}
												<div className={styles.detailItem}>
													<span>CUIT</span>
													<strong>{o.ProveedorCUIT || '—'}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Tipo / pago</span>
													<strong>
														{o.TipoOperacion || '—'} · {o.CondPago || '—'}
													</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Total</span>
													<strong>{fmtMoney(o.Total)}</strong>
												</div>
												<div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
													<span>Lugar de entrega</span>
													<strong>{o.LugarEntrega || '—'}</strong>
												</div>
											</div>
											<div className={styles.itemsBox}>
												<table>
													<thead>
														<tr>
															<th>#</th>
															<th>Descripción</th>
															<th>Cant.</th>
															<th>Recibido</th>
															<th>P. unit.</th>
															<th>Subtotal</th>
														</tr>
													</thead>
													<tbody>
														{(o.items || []).map((it, i) => (
															<tr key={it.IdItem || i}>
																<td>{it.Renglon ?? i + 1}</td>
																<td>{it.Descripcion}</td>
																<td>{it.Cantidad}</td>
																<td>{it.CantidadRecibida ?? 0}</td>
																<td className={styles.money}>{fmtMoney(it.PrecioUnitario)}</td>
																<td className={styles.money}>{fmtMoney(it.Subtotal)}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</>
									);
								})()}
							{modal === 'viewActa' &&
								(() => {
									const a = detail as AlmacenActa;
									return (
										<>
											<div className={styles.detailGrid}>
												<div className={styles.detailItem}>
													<span>Fecha</span>
													<strong>{fmtDate(a.Fecha)}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Orden</span>
													<strong>{a.NroOrden || a.IdOrden}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Proveedor</span>
													<strong>{a.Proveedor || '—'}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Factura</span>
													<strong>{a.NroFactura || '—'}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Depósito</span>
													<strong>{a.DepositoNombre || '—'}</strong>
												</div>
												<div className={styles.detailItem}>
													<span>Total</span>
													<strong>{fmtMoney(a.Total)}</strong>
												</div>
											</div>
											<div className={styles.itemsBox}>
												<table>
													<thead>
														<tr>
															<th>#</th>
															<th>Descripción</th>
															<th>Marca</th>
															<th>Lote</th>
															<th>Cant.</th>
															<th>P. unit.</th>
															<th>Total</th>
														</tr>
													</thead>
													<tbody>
														{(a.items || []).map((it, i) => (
															<tr key={it.IdItem || i}>
																<td>{it.Renglon ?? i + 1}</td>
																<td>{it.Descripcion}</td>
																<td>{it.Marca || '—'}</td>
																<td>{it.Lote || '—'}</td>
																<td>{it.Cantidad}</td>
																<td className={styles.money}>{fmtMoney(it.PrecioUnitario)}</td>
																<td className={styles.money}>{fmtMoney(it.PrecioTotal)}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</>
									);
								})()}
						</div>
						<div className={styles.modalFooter}>
							<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>
								Cerrar
							</button>
						</div>
					</div>
				</div>
			)}

			{modal === 'trace' && (
				<div className={styles.overlay} onClick={closeModal}>
					<div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h2>Trazabilidad del artículo</h2>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
								onClick={closeModal}
							>
								Cerrar
							</button>
						</div>
						<div className={styles.modalBody}>
							{traceLoading || !traceDetalle ? (
								<div className={styles.loading}>
									<div className={styles.spinner} />
									Cargando línea de tiempo…
								</div>
							) : (
								<>
									<div className={styles.traceModalArt}>
										<strong>
											<span className={styles.codeCell}>{traceDetalle.articulo.Codigo}</span>
											{' — '}
											{traceDetalle.articulo.Descripcion}
										</strong>
										<span>
											{traceDetalle.articulo.UnidadMedida || '—'}
											{traceDetalle.articulo.TipoNombre
												? ` · ${traceDetalle.articulo.TipoNombre}`
												: ''}
											{' · ID '}
											{traceDetalle.articulo.IdArticulo}
										</span>
									</div>
									{traceDetalle.ubicaciones.length > 0 ? (
										<div className={styles.traceUbicaciones}>
											{traceDetalle.ubicaciones.map((u) => (
												<span key={u.IdDeposito} className={styles.traceUbicChip}>
													{u.Nombre}
													{u.Codigo ? ` (${u.Codigo})` : ''}
													<em>{u.Cantidad}</em>
												</span>
											))}
										</div>
									) : (
										<p className={styles.fieldHint}>Sin stock actual en depósitos activos.</p>
									)}
									{traceDetalle.timeline.length === 0 ? (
										<p className={styles.fieldHint}>No hay movimientos registrados para este artículo.</p>
									) : (
										<ul className={styles.traceTimeline}>
											{[...traceDetalle.timeline]
												.sort(
													(a, b) =>
														new Date(a.fecha).getTime() - new Date(b.fecha).getTime() ||
														a.idMovimiento - b.idMovimiento,
												)
												.map((ev) => (
													<li key={ev.idMovimiento} className={styles.traceEvent}>
														<span className={styles.traceEventDot} aria-hidden />
														<div className={styles.traceEventHead}>
															<time dateTime={ev.fecha}>
																{fmtDate(ev.fecha)}
																{ev.fecha ? ` · ${new Date(ev.fecha).toLocaleTimeString('es-AR')}` : ''}
															</time>
															<span className={`${styles.badge} ${styles.badgeMuted}`}>{ev.tipo}</span>
															{ev.documentoTipo ? (
																<span className={`${styles.badge} ${styles.badgeInfo}`}>
																	{ev.documentoTipo}
																	{ev.documentoNro
																		? ` ${ev.documentoNro}`
																		: ev.documentoId
																			? ` #${ev.documentoId}`
																			: ''}
																</span>
															) : null}
														</div>
														<div className={styles.traceEventMeta}>
															<span>
																Cant. <strong>{ev.cantidad}</strong>
																{ev.saldo != null ? ` → saldo ${ev.saldo}` : ''}
															</span>
															{ev.ubicacion ? (
																<span>
																	Ubicación{' '}
																	<strong>
																		{ev.ubicacion}
																		{ev.ubicacionCodigo ? ` (${ev.ubicacionCodigo})` : ''}
																	</strong>
																</span>
															) : null}
															{ev.lote ? (
																<span>
																	Lote <strong>{ev.lote}</strong>
																</span>
															) : null}
															{ev.documentoPadreNro ? (
																<span>
																	Origen doc. <strong>{ev.documentoPadreNro}</strong>
																</span>
															) : null}
															{ev.operador ? <span>Op. {ev.operador}</span> : null}
															{ev.observaciones ? <span>{ev.observaciones}</span> : null}
															<span className={styles.fieldHint}>Mov. #{ev.idMovimiento}</span>
														</div>
													</li>
												))}
										</ul>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
