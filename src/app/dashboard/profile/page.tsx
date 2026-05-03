'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	BadgeCheck,
	Building2,
	Calendar,
	ChevronLeft,
	ChevronRight,
	FileText,
	Filter,
	IdCard,
	MapPin,
	Pencil,
	Receipt,
	RefreshCw,
	Save,
	ShieldCheck,
	TrendingUp,
	User,
	X,
} from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
	XAxis,
	YAxis,
} from 'recharts';
import Loader from '@/app/components/Loader/Loader';
import {
	miPerfilService,
	type MiPerfilResponse,
	type ProduccionFila,
	type ProduccionMesResponse,
} from '@/app/services/miPerfilService';
import styles from './profile.module.css';

type TabId = 'resumen' | 'produccion';

const PIE_COLORS = ['#0891b2', '#0e7490', '#164e63', '#06b6d4', '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626'];
const BAR_COLORS = ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc'];

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

/** Tooltip del gráfico de torta: nombre completo de la obra social de la porción */
function PieObraSocialTooltip(props: {
	active?: boolean;
	payload?: Array<{ name?: string; value?: number; payload?: { name?: string; value?: number } }>;
}) {
	const { active, payload } = props;
	if (!active || !payload?.length) return null;
	const item = payload[0];
	const nombre = item.payload?.name ?? item.name ?? '—';
	const valor = Number(item.payload?.value ?? item.value ?? 0);
	return (
		<div className={styles.pieTooltip}>
			<div className={styles.pieTooltipKicker}>Obra social</div>
			<div className={styles.pieTooltipNombre}>{nombre}</div>
			<div className={styles.pieTooltipMonto}>
				Facturado: <strong>${formatImporte(valor)}</strong>
			</div>
		</div>
	);
}

function normalizarCobertura(row: ProduccionFila) {
	const cobertura = String(row.cobertura || '').trim();
	return cobertura || '(Sin convenio)';
}

function tieneValorEconomico(row: ProduccionFila) {
	return (
		Math.abs(Number(row.total) || 0) > 0 ||
		Math.abs(Number(row.importeUnitario) || 0) > 0 ||
		Math.abs(Number(row.porcentajeFacturado) || 0) > 0
	);
}

function formatLabel(key: string) {
	const spaced = key.replace(/([A-Z])/g, ' $1').trim();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const EDITABLE_PROFILE_FIELDS = [
	'ApellidoNombre',
	'NumeroDocumento',
	'Telefono',
	'Domicilio',
	'Nacionalidad',
	'FechaNacimiento',
	'Sexo',
	'EstadoCivil',
	'MatriculaProvincial',
	'MatriculaNacional',
	'ValorEspecialidad',
	'ValorFunciones',
	'ValorCategoria',
	'ValorClase',
	'LugarTrabajo',
	'LugarCobro',
	'NumeroSocio',
	'ConvenioFacturacion',
	'IdEspecialidadME',
] as const;

const PROFILE_FIELD_GROUPS = [
	{
		title: 'Datos personales',
		description: 'Identificación, contacto y datos civiles.',
		keys: ['ApellidoNombre', 'NumeroDocumento', 'Telefono', 'Domicilio', 'Nacionalidad', 'FechaNacimiento', 'Sexo', 'EstadoCivil'],
	},
	{
		title: 'Matrículas y práctica',
		description: 'Credenciales y datos vinculados a la atención.',
		keys: ['MatriculaProvincial', 'MatriculaNacional', 'ValorEspecialidad', 'IdEspecialidadME', 'ValorFunciones'],
	},
	{
		title: 'Administración',
		description: 'Categorías internas, cobro y facturación.',
		keys: ['ValorCategoria', 'ValorClase', 'LugarTrabajo', 'LugarCobro', 'NumeroSocio', 'ConvenioFacturacion'],
	},
] as const;

export default function MiPerfilPage() {
	const def = defaultMonthRange();
	const [tab, setTab] = useState<TabId>('resumen');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [perfil, setPerfil] = useState<MiPerfilResponse['data'] | null>(null);
	const [editing, setEditing] = useState(false);
	const [savingProfile, setSavingProfile] = useState(false);
	const [profileForm, setProfileForm] = useState<Record<string, string>>({});
	const [fotoDataUrl, setFotoDataUrl] = useState<string | null>(null);
	const [fotoLoading, setFotoLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const [fechaDesde, setFechaDesde] = useState(def.desde);
	const [fechaHasta, setFechaHasta] = useState(def.hasta);
	const [selectedCobertura, setSelectedCobertura] = useState<string>('');
	const [estadoValorizacion, setEstadoValorizacion] = useState<'todas' | 'valorizadas' | 'no-valorizadas'>(
		'todas',
	);
	const [paginaActual, setPaginaActual] = useState(1);

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
			const initialForm: Record<string, string> = {};
			const p = (res.data.personal || {}) as Record<string, unknown>;
			for (const key of EDITABLE_PROFILE_FIELDS) {
				initialForm[key] = p[key] == null ? '' : String(p[key]);
			}
			setProfileForm(initialForm);
			setFotoDataUrl(res.data.fotoPerfil?.dataUrl || null);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'No se pudo cargar el perfil';
			setError(msg);
			setPerfil(null);
		} finally {
			setLoading(false);
		}
	}, []);

	const cargarProduccionConFiltros = useCallback(
		async (desde: string, hasta: string) => {
			setProdErr(null);
			setLoadProd(true);
			try {
				const prodRes = await miPerfilService.obtenerProduccionMes({ desde, hasta });
				if (!prodRes.success) throw new Error('Respuesta inválida (producción)');
				setProd(prodRes.data);
				setSelectedCobertura('');
				setEstadoValorizacion('todas');
				setPaginaActual(1);
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
		void cargarProduccionConFiltros(fechaDesde, fechaHasta);
		// Solo al entrar a la pestaña: no depende de fechas ni convenios para permitir editar y aplicar después.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial al cambiar de pestaña
	}, [tab, cargarProduccionConFiltros]);

	const resumen = perfil?.resumenOperador;
	const nombrePerfil = profileForm.ApellidoNombre || resumen?.ApellidoNombrePersonal || 'Sin nombre';
	const documentoPerfil = profileForm.NumeroDocumento || '—';
	const matriculaPerfil = profileForm.MatriculaProvincial || resumen?.Matricula || '—';
	const profileRows = useMemo(
		() =>
			EDITABLE_PROFILE_FIELDS.map((key) => ({
				key,
				label: formatLabel(key),
				value: profileForm[key] ?? '',
			})),
		[profileForm],
	);

	const coberturaOptions = useMemo(() => {
		const values = new Set<string>();
		for (const row of prod?.registros || []) {
			const cobertura = normalizarCobertura(row);
			if (cobertura) values.add(cobertura);
		}
		return Array.from(values).sort((a, b) => a.localeCompare(b, 'es'));
	}, [prod?.registros]);

	const registrosFiltrados = useMemo(() => {
		const cob = (selectedCobertura || '').trim();
		return (prod?.registros || []).filter((r) => {
			if (cob && normalizarCobertura(r) !== cob) return false;
			if (estadoValorizacion === 'valorizadas' && !tieneValorEconomico(r)) return false;
			if (estadoValorizacion === 'no-valorizadas' && tieneValorEconomico(r)) return false;
			return true;
		});
	}, [prod?.registros, selectedCobertura, estadoValorizacion]);

	const totalesFiltrados = useMemo(
		() =>
			registrosFiltrados.reduce(
				(acc, row) => ({
					lineas: acc.lineas + 1,
					total: acc.total + (Number(row.total) || 0),
					cantidad: acc.cantidad + (Number(row.cantidad) || 0),
				}),
				{ lineas: 0, total: 0, cantidad: 0 },
			),
		[registrosFiltrados],
	);

	/** Facturación por obra social (solo valorizadas) para gráfico de torta */
	const chartPorOS = useMemo(() => {
		const map = new Map<string, number>();
		for (const r of registrosFiltrados) {
			if (!tieneValorEconomico(r)) continue;
			const os = normalizarCobertura(r);
			map.set(os, (map.get(os) || 0) + (Number(r.total) || 0));
		}
		return Array.from(map.entries())
			.map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
			.filter((x) => x.value > 0)
			.sort((a, b) => b.value - a.value)
			.slice(0, 9);
	}, [registrosFiltrados]);

	/** Top 8 prácticas por importe facturado para gráfico de barras */
	const chartTopPracticas = useMemo(() => {
		const map = new Map<string, { total: number; count: number; desc: string }>();
		for (const r of registrosFiltrados) {
			if (!tieneValorEconomico(r)) continue;
			const key = r.codigoPractica;
			const ex = map.get(key);
			if (ex) {
				ex.total += Number(r.total) || 0;
				ex.count += 1;
			} else {
				map.set(key, { total: Number(r.total) || 0, count: 1, desc: r.descripcionPractica || key });
			}
		}
		return Array.from(map.values())
			.filter((x) => x.total > 0)
			.sort((a, b) => b.total - a.total)
			.slice(0, 8)
			.map((x) => ({
				name: x.desc.length > 28 ? x.desc.slice(0, 26) + '…' : x.desc,
				fullName: x.desc,
				total: Math.round(x.total * 100) / 100,
				count: x.count,
			}));
	}, [registrosFiltrados]);

	/** KPIs mejorados */
	const kpiValorizadas = useMemo(() => registrosFiltrados.filter(tieneValorEconomico).length, [registrosFiltrados]);
	const kpiNoValorizadas = registrosFiltrados.length - kpiValorizadas;
	const kpiPctValorizacion =
		registrosFiltrados.length > 0 ? Math.round((kpiValorizadas / registrosFiltrados.length) * 100) : 0;
	const kpiTopOS = chartPorOS[0] ?? null;
	const kpiTopOSPct =
		totalesFiltrados.total > 0 && kpiTopOS
			? Math.round((kpiTopOS.value / totalesFiltrados.total) * 100)
			: 0;
	const kpiRendicionesUnicas = useMemo(
		() => new Set(registrosFiltrados.map((r) => r.nroRendicion).filter((n) => n != null && n > 0)).size,
		[registrosFiltrados],
	);

	const filasPorPagina = 50;
	const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / filasPorPagina));
	const registrosPaginados = useMemo(() => {
		const inicio = (paginaActual - 1) * filasPorPagina;
		return registrosFiltrados.slice(inicio, inicio + filasPorPagina);
	}, [paginaActual, registrosFiltrados]);

	useEffect(() => {
		setPaginaActual(1);
	}, [selectedCobertura, estadoValorizacion]);

	useEffect(() => {
		if (paginaActual > totalPaginas) setPaginaActual(totalPaginas);
	}, [paginaActual, totalPaginas]);

	const onChangeProfileField = (key: string, value: string) => {
		setProfileForm((prev) => ({ ...prev, [key]: value }));
	};

	const guardarPerfil = async () => {
		setSavingProfile(true);
		setError(null);
		try {
			const res = await miPerfilService.actualizarPerfil(profileForm);
			if (!res.success) throw new Error('No se pudo guardar el perfil');
			setPerfil(res.data);
			setEditing(false);
		} catch (e: unknown) {
			setError(apiErrorMessage(e, 'No se pudo guardar el perfil'));
		} finally {
			setSavingProfile(false);
		}
	};

	const onSeleccionarFoto = async (file?: File) => {
		if (!file) return;
		setFotoLoading(true);
		setError(null);
		try {
			const res = await miPerfilService.actualizarFotoPerfil(file);
			if (!res.success) throw new Error(res.mensaje || 'No se pudo actualizar la foto');
			const fotoRes = await miPerfilService.obtenerFotoPerfil();
			setFotoDataUrl(fotoRes.data?.dataUrl || null);
		} catch (e: unknown) {
			setError(apiErrorMessage(e, 'No se pudo actualizar la foto de perfil'));
		} finally {
			setFotoLoading(false);
		}
	};

	const eliminarFoto = async () => {
		setFotoLoading(true);
		setError(null);
		try {
			const res = await miPerfilService.eliminarFotoPerfil();
			if (!res.success) throw new Error(res.mensaje || 'No se pudo eliminar la foto');
			setFotoDataUrl(null);
		} catch (e: unknown) {
			setError(apiErrorMessage(e, 'No se pudo eliminar la foto de perfil'));
		} finally {
			setFotoLoading(false);
		}
	};

	return (
		<div className={styles.container}>

			{loading && (
				<div className={styles.loaderWrap}>
					<Loader />
				</div>
			)}
			{error && <p className={styles.err}>{error}</p>}

			{!loading && tab === 'resumen' && perfil && (
				<div className={styles.stack}>
					<section className={styles.profileShell}>
						<div className={styles.profileCard}>
							<div className={styles.profileCover}>
							</div>
							<div className={styles.profileTop}>
								<div className={styles.avatarBox}>
									{fotoDataUrl ? (
										<img src={fotoDataUrl} alt="Foto de perfil" className={styles.avatarImg} />
									) : (
										<div className={styles.avatarFallback}>
											<User size={42} strokeWidth={2} />
										</div>
									)}
									<div className={styles.avatarActions}>
										<button
											type="button"
											className={styles.linkAction}
											disabled={fotoLoading}
											onClick={() => fileInputRef.current?.click()}
										>
											Cambiar foto
										</button>
										<button
											type="button"
											className={styles.linkDanger}
											disabled={fotoLoading || !fotoDataUrl}
											onClick={() => void eliminarFoto()}
										>
											Eliminar
										</button>
										<input
											ref={fileInputRef}
											type="file"
											accept="image/*"
											style={{ display: 'none' }}
											onChange={(e) => void onSeleccionarFoto(e.target.files?.[0])}
										/>
									</div>
								</div>
								<div className={styles.profileHeadText}>
									<h2>{nombrePerfil}</h2>
									<p>Documento {documentoPerfil} · Usuario {resumen?.NombreRed || '—'}</p>
									<div className={styles.profileChips}>
										<span>
											<IdCard size={14} /> Mat. prov. {profileForm.MatriculaProvincial || '—'}
										</span>
										<span>
											<ShieldCheck size={14} /> Mat. nac. {profileForm.MatriculaNacional || '—'}
										</span>
										<span>
											<Building2 size={14} /> {profileForm.LugarTrabajo || 'Sin lugar de trabajo'}
										</span>
									</div>
								</div>
								<div className={styles.profileActions}>
									{editing ? (
										<>
											<button
												type="button"
												className={styles.btnApply}
												disabled={savingProfile}
												onClick={() => void guardarPerfil()}
											>
												<Save size={14} /> Guardar cambios
											</button>
											<button
												type="button"
												className={styles.btnGhost}
												disabled={savingProfile}
												onClick={() => setEditing(false)}
											>
												<X size={14} /> Cancelar
											</button>
										</>
									) : (
										<>
											<button type="button" className={styles.btnGhost} onClick={() => setEditing(true)}>
												<Pencil size={14} /> Editar perfil
											</button>
											<button
												type="button"
												className={styles.btnProduction}
												onClick={() => setTab('produccion')}
											>
												<Receipt size={14} /> Ver producción
											</button>
										</>
									)}
								</div>
							</div>
						</div>

						<aside className={styles.profileAside}>
							<div className={styles.asideCard}>
								<div className={styles.asideIcon}>
									<MapPin size={20} />
								</div>
								<span>Ubicación laboral</span>
								<strong>{profileForm.LugarTrabajo || '—'}</strong>
								<p>Lugar de trabajo configurado.</p>
							</div>
							<div className={styles.asideCard}>
								<div className={styles.asideIcon}>
									<FileText size={20} />
								</div>
								<span>Cobro</span>
								<strong>{profileForm.LugarCobro || '—'}</strong>
								<p>Referencia administrativa del perfil.</p>
							</div>
						</aside>
					</section>

					<section className={styles.profileDetails}>
						{PROFILE_FIELD_GROUPS.map((group) => (
							<div className={styles.detailGroup} key={group.title}>
								<div className={styles.detailGroupHead}>
									<h3>{group.title}</h3>
									<p>{group.description}</p>
								</div>
								<div className={styles.profileRows}>
									{profileRows
										.filter((row) => (group.keys as readonly string[]).includes(row.key))
										.map((row) => (
											<div className={styles.profileRow} key={row.key}>
												<div className={styles.profileRowLabel}>{row.label}</div>
												<div className={styles.profileRowValue}>
													{editing ? (
														<input
															className={styles.profileInput}
															value={row.value}
															onChange={(ev) => onChangeProfileField(row.key, ev.target.value)}
														/>
													) : (
														row.value || '—'
													)}
												</div>
												<div className={styles.profileRowEdit}>{editing && <Pencil size={13} />}</div>
											</div>
										))}
								</div>
							</div>
						))}
					</section>
				</div>
			)}

			{tab === 'produccion' && (
				<div className={styles.stack}>
					<section className={styles.productionShell}>
						{/* ── Barra de filtros horizontal ── */}
						<div className={styles.filtersBar}>
							<div className={styles.filtersBarLeft}>
								<div className={styles.filtersIcon}>
									<Filter size={16} />
								</div>
								<span className={styles.filtersPanelTitle}>Filtros</span>
							</div>

							<div className={styles.filterField}>
								<label className={styles.filterFieldLabel}>
									<Calendar size={11} strokeWidth={2.5} aria-hidden />
									Desde
								</label>
								<input
									type="date"
									className={styles.dateInput}
									value={fechaDesde}
									onChange={(ev) => setFechaDesde(ev.target.value)}
								/>
							</div>

							<div className={styles.filterField}>
								<label className={styles.filterFieldLabel}>
									<Calendar size={11} strokeWidth={2.5} aria-hidden />
									Hasta
								</label>
								<input
									type="date"
									className={styles.dateInput}
									value={fechaHasta}
									onChange={(ev) => setFechaHasta(ev.target.value)}
								/>
							</div>

							<div className={styles.filterField}>
								<label className={styles.filterFieldLabel}>
									<Building2 size={11} strokeWidth={2.5} aria-hidden />
									Cobertura
								</label>
								<select
									className={styles.dateInput}
									value={selectedCobertura}
									onChange={(e) => setSelectedCobertura(e.target.value)}
									disabled={!prod?.registros?.length}
								>
									<option value="">Todas</option>
									{coberturaOptions.map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
							</div>

							<div className={styles.filterField}>
								<label className={styles.filterFieldLabel}>
									<BadgeCheck size={11} strokeWidth={2.5} aria-hidden />
									Valorización
								</label>
								<select
									className={styles.dateInput}
									value={estadoValorizacion}
									onChange={(e) =>
										setEstadoValorizacion(
											e.target.value as 'todas' | 'valorizadas' | 'no-valorizadas',
										)
									}
								>
									<option value="todas">Todas</option>
									<option value="valorizadas">Valorizadas</option>
									<option value="no-valorizadas">No valorizadas</option>
								</select>
							</div>

							<button
								type="button"
								className={`${styles.btnApply} ${styles.filterBarBtn}`}
								disabled={loadProd}
								onClick={() => void cargarProduccionConFiltros(fechaDesde, fechaHasta)}
							>
								<RefreshCw size={13} /> Aplicar
							</button>
							<button
								type="button"
								className={`${styles.btnGhost} ${styles.filterBarBtn}`}
								disabled={loadProd}
								onClick={() => {
									setSelectedCobertura('');
									setEstadoValorizacion('todas');
									setPaginaActual(1);
								}}
							>
								Limpiar
							</button>
						</div>

						{/* ── Contenido principal ── */}
						<div className={styles.productionMain}>
							{loadProd && (
								<div className={styles.loaderWrap}>
									<Loader />
								</div>
							)}
							{prodErr && <p className={styles.err}>{prodErr}</p>}
							{prod && !loadProd && (
								<>
									<div className={styles.productionHeader}>
										<div>
											<span className={styles.sectionBadge}>
												<Receipt size={14} strokeWidth={2.5} aria-hidden />
												Producción del período
											</span>
											<h2>Prácticas unificadas</h2>
											<p>
												Del <strong>{prod.periodo.desdeCalendario}</strong> al{' '}
												<strong>{prod.periodo.hastaCalendario}</strong>
												{prod.mensaje ? ` · ${prod.mensaje}` : ''}
											</p>
										</div>
										<div className={styles.activeFilters}>
											<span>{selectedCobertura || 'Todas las coberturas'}</span>
											<span>
												{estadoValorizacion === 'todas'
													? 'Todas'
													: estadoValorizacion === 'valorizadas'
														? 'Valorizadas'
														: 'No valorizadas'}
											</span>
										</div>
									</div>

									{/* ── KPIs mejorados ── */}
									<div className={styles.statsRow}>
										{/* Facturado */}
										<div className={`${styles.statCard} ${styles.statCardPrimary}`}>
											<div className={styles.statIcon}><Receipt size={18} /></div>
											<div className={styles.statBody}>
												<div className={styles.statLabel}>Facturado</div>
												<div className={`${styles.statValue} ${styles.statValueLarge}`}>
													${formatImporte(totalesFiltrados.total)}
												</div>
												<div className={styles.statHint}>
													{kpiNoValorizadas > 0
														? `${kpiNoValorizadas} práctica${kpiNoValorizadas > 1 ? 's' : ''} pendiente${kpiNoValorizadas > 1 ? 's' : ''} de valorizar`
														: 'Todas valorizadas ✓'}
												</div>
											</div>
										</div>

										{/* Tasa de valorización */}
										<div className={styles.statCard}>
											<div className={styles.statIcon}><BadgeCheck size={18} /></div>
											<div className={styles.statBody}>
												<div className={styles.statLabel}>Valorización</div>
												<div className={styles.statValue}>
													{kpiPctValorizacion}
													<span className={styles.statUnit}>%</span>
												</div>
												<div className={styles.statProgress}>
													<div
														className={styles.statProgressBar}
														style={{ width: `${kpiPctValorizacion}%` }}
													/>
												</div>
												<div className={styles.statHint}>
													{kpiValorizadas} de {registrosFiltrados.length} prácticas
												</div>
											</div>
										</div>

										{/* OS principal */}
										<div className={styles.statCard}>
											<div className={styles.statIcon}><Building2 size={18} /></div>
											<div className={styles.statBody}>
												<div className={styles.statLabel}>OS principal</div>
												<div className={styles.statValueOs} title={kpiTopOS?.name ?? '—'}>
													{kpiTopOS?.name ?? '—'}
												</div>
												<div className={styles.statHint}>
													{kpiTopOS
														? `$${formatImporte(kpiTopOS.value)} · ${kpiTopOSPct}% del total`
														: 'Sin datos valorizados'}
												</div>
											</div>
										</div>

										{/* Rendiciones */}
										<div className={styles.statCard}>
											<div className={styles.statIcon}><TrendingUp size={18} /></div>
											<div className={styles.statBody}>
												<div className={styles.statLabel}>Rendiciones</div>
												<div className={styles.statValue}>{kpiRendicionesUnicas}</div>
												<div className={styles.statHint}>
													{totalesFiltrados.lineas} prest. · {totalesFiltrados.cantidad.toLocaleString('es-AR')} unidades
												</div>
											</div>
										</div>
									</div>

									{/* ── Gráficos ── */}
									{chartPorOS.length > 0 && (
										<div className={styles.chartsRow}>
											{/* Torta: facturación por OS */}
											<div className={styles.chartCard}>
												<div className={styles.chartCardHead}>
													<span className={styles.chartCardTitle}>Facturación por obra social</span>
													<span className={styles.chartCardSub}>Distribución del importe valorizado</span>
												</div>
												<ResponsiveContainer width="100%" height={260}>
													<PieChart>
														<Pie
															data={chartPorOS}
															cx="50%"
															cy="50%"
															innerRadius="38%"
															outerRadius="65%"
															paddingAngle={2}
															dataKey="value"
														>
															{chartPorOS.map((_, i) => (
																<Cell
																	key={i}
																	fill={PIE_COLORS[i % PIE_COLORS.length]}
																/>
															))}
														</Pie>
														<RechartsTooltip content={PieObraSocialTooltip} />
														<Legend
															iconType="circle"
															iconSize={8}
															formatter={(v: string) => (
																<span style={{ fontSize: 11, color: '#475569' }}>
																	{v.length > 22 ? v.slice(0, 20) + '…' : v}
																</span>
															)}
														/>
													</PieChart>
												</ResponsiveContainer>
											</div>

											{/* Barras horizontales: top prácticas */}
											<div className={styles.chartCard}>
												<div className={styles.chartCardHead}>
													<span className={styles.chartCardTitle}>Top prácticas facturadas</span>
													<span className={styles.chartCardSub}>Por importe total valorizado</span>
												</div>
												<ResponsiveContainer width="100%" height={260}>
													<BarChart
														data={chartTopPracticas}
														layout="vertical"
														margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
													>
														<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
														<XAxis
															type="number"
															tickFormatter={(v: number) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
															tick={{ fontSize: 11, fill: '#94a3b8' }}
															axisLine={false}
															tickLine={false}
														/>
														<YAxis
															type="category"
															dataKey="name"
															width={110}
															tick={{ fontSize: 10, fill: '#475569' }}
															axisLine={false}
															tickLine={false}
														/>
														<RechartsTooltip
															cursor={{ fill: 'rgba(14,165,233,0.06)' }}
															formatter={(v: number, _n: string, p: { payload?: { fullName?: string; count?: number } }) => [
																`$${formatImporte(v)} (${p?.payload?.count ?? ''} prest.)`,
																p?.payload?.fullName ?? 'Importe',
															]}
															contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
														/>
														<Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={18}>
															{chartTopPracticas.map((_, i) => (
																<Cell
																	key={i}
																	fill={BAR_COLORS[i % BAR_COLORS.length]}
																/>
															))}
														</Bar>
													</BarChart>
												</ResponsiveContainer>
											</div>
										</div>
									)}

									<div className={styles.tableHeaderRow}>
										<div>
											<h3 className={styles.tableSectionTitle}>Detalle de prácticas</h3>
											<p className={styles.tableSubtitle}>
												{registrosFiltrados.length} de {prod.totales.lineas} prácticas del período
											</p>
										</div>
										<span className={styles.tableCount}>
											Mostrando {registrosPaginados.length} de {registrosFiltrados.length}
										</span>
									</div>
									{registrosFiltrados.length === 0 ? (
										<div className={styles.empty}>Sin movimientos en el período seleccionado.</div>
									) : (
										<>
											<div className={styles.tableWrap}>
												<table className={styles.table}>
													<thead>
														<tr>
															<th className={styles.colFecha}>Fecha</th>
															<th className={styles.colRendicion}>Rendición</th>
															<th className={styles.colPractica}>Práctica</th>
															<th className={styles.num}>Cant.</th>
															<th className={styles.colPaciente}>Paciente</th>
															<th className={styles.colCobertura}>Cobertura</th>
															<th className={styles.num}>% Fact.</th>
															<th className={styles.num}>Imp. unitario</th>
															<th className={styles.num}>Total</th>
														</tr>
													</thead>
													<tbody>
														{registrosPaginados.map((row: ProduccionFila, idx: number) => {
															const valor = tieneValorEconomico(row);
															return (
																<tr
																	key={`${row.id}-${row.idMatch || ''}-${row.codigoPractica}-${row.fecha || ''}-${row.dniPaciente || ''}-${idx}`}
																	className={valor ? styles.rowValor : styles.rowSinValor}
																>
																	<td className={styles.colFecha}>
																		<div className={styles.fechaCell}>
																			<Calendar size={13} aria-hidden />
																			<span>{row.fecha || '—'}</span>
																		</div>
																	</td>
																	<td className={styles.colRendicion}>
																		{row.nroRendicion != null && row.nroRendicion > 0 ? (
																			<span className={styles.rendicionTag}>{row.nroRendicion}</span>
																		) : (
																			<span className={styles.rendicionTagEmpty}>Pendiente</span>
																		)}
																	</td>
																	<td className={styles.colPractica}>
																		<div className={styles.practicaCell}>
																			<span className={styles.practicaCode}>{row.codigoPractica || '—'}</span>
																			<span className={styles.practicaDesc} title={row.descripcionPractica || ''}>
																				{row.descripcionPractica || '—'}
																			</span>
																		</div>
																	</td>
																	<td className={styles.num}>
																		<span className={styles.qtyPill}>{Number(row.cantidad)}</span>
																	</td>
																	<td className={styles.colPaciente}>
																		<div className={styles.pacienteCell}>
																			<span className={styles.pacienteNombre}>
																				{row.nombrePaciente || 'Sin nombre'}
																			</span>
																			<span className={styles.pacienteDni}>
																				DNI {row.dniPaciente || '—'}
																			</span>
																		</div>
																	</td>
																	<td className={styles.colCobertura}>
																		<span className={styles.coberturaTag}>{normalizarCobertura(row)}</span>
																	</td>
																	<td className={styles.num}>
																		{Number(row.porcentajeFacturado)}
																		<span className={styles.percentMark}>%</span>
																	</td>
																	<td className={styles.num}>
																		{valor ? (
																			<span className={styles.amount}>${formatImporte(Number(row.importeUnitario))}</span>
																		) : (
																			<span className={styles.amountMuted}>—</span>
																		)}
																	</td>
																	<td className={styles.num}>
																		{valor ? (
																			<span className={styles.amountStrong}>${formatImporte(Number(row.total))}</span>
																		) : (
																			<span className={styles.badgePending}>Sin valorizar</span>
																		)}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
											<div className={styles.pagination}>
												<button
													type="button"
													className={styles.pageButton}
													disabled={paginaActual <= 1}
													onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
												>
													<ChevronLeft size={15} /> Anterior
												</button>
												<span className={styles.pageInfo}>
													Página {paginaActual} de {totalPaginas}
												</span>
												<button
													type="button"
													className={styles.pageButton}
													disabled={paginaActual >= totalPaginas}
													onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
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
		</div>
	);
}
