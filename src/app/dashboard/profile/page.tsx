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
	User,
	X,
} from 'lucide-react';
import Loader from '@/app/components/Loader/Loader';
import {
	miPerfilService,
	type MiPerfilResponse,
	type ProduccionFila,
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

function formatHora(s?: string | null) {
	if (!s) return '—';
	return String(s).slice(0, 5);
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
	const registrosValorizados = useMemo(
		() => (prod?.registros || []).filter(tieneValorEconomico).length,
		[prod?.registros],
	);

	const profileRows = useMemo(
		() =>
			EDITABLE_PROFILE_FIELDS.map((key) => ({
				key,
				label: formatLabel(key),
				value: profileForm[key] ?? '',
			})),
		[profileForm],
	);

	const registrosUnicos = useMemo(() => {
		const all = prod?.registros || [];
		const seen = new Set<string>();
		const unique: ProduccionFila[] = [];
		for (const row of all) {
			const dedupKey = `${row.id}::${row.idMatch || ''}::${row.codigoPractica}::${row.fecha || ''}::${row.dniPaciente || ''}`;
			if (seen.has(dedupKey)) continue;
			seen.add(dedupKey);
			unique.push(row);
		}
		return unique;
	}, [prod?.registros]);

	const coberturaOptions = useMemo(() => {
		const values = new Set<string>();
		for (const row of registrosUnicos) {
			const cobertura = normalizarCobertura(row);
			if (cobertura) values.add(cobertura);
		}
		return Array.from(values).sort((a, b) => a.localeCompare(b, 'es'));
	}, [registrosUnicos]);

	const registrosFiltrados = useMemo(() => {
		const cob = (selectedCobertura || '').trim();
		const filtered = registrosUnicos.filter((r) => {
			if (cob && normalizarCobertura(r) !== cob) return false;
			if (estadoValorizacion === 'valorizadas' && !tieneValorEconomico(r)) return false;
			if (estadoValorizacion === 'no-valorizadas' && tieneValorEconomico(r)) return false;
			return true;
		});
		if (typeof window !== 'undefined') {
			// eslint-disable-next-line no-console
			console.debug('[Producción] filtros aplicados', {
				cobertura: cob || '(todas)',
				valorizacion: estadoValorizacion,
				entradaBackend: prod?.registros?.length || 0,
				entradaUnicos: registrosUnicos.length,
				salida: filtered.length,
				muestraCoberturas: filtered.slice(0, 5).map((r) => normalizarCobertura(r)),
				muestraValores: filtered.slice(0, 5).map((r) => Number(r.total) || 0),
			});
		}
		return filtered;
	}, [registrosUnicos, selectedCobertura, estadoValorizacion, prod?.registros?.length]);

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
						<aside className={styles.filtersPanel}>
							<div className={styles.filtersPanelHead}>
								<div className={styles.filtersIcon}>
									<Filter size={20} />
								</div>
								<div>
									<h2>Filtros</h2>
									<p>Primero se consulta por período. Luego la cobertura y valorización filtran la tabla visible.</p>
								</div>
							</div>

							<div className={styles.filterGroup}>
								<span className={styles.filterGroupLabel}>
									<Calendar size={13} strokeWidth={2.5} aria-hidden />
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

							<div className={styles.filterGroup}>
								<span className={styles.filterGroupLabel}>
									<Building2 size={13} strokeWidth={2.5} aria-hidden />
									Cobertura
								</span>
								<select
									className={styles.dateInput}
									value={selectedCobertura}
									onChange={(e) => setSelectedCobertura(e.target.value)}
									disabled={!prod?.registros?.length}
								>
									<option value="">Todas las coberturas</option>
									{coberturaOptions.map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
							</div>

							<div className={styles.filterGroup}>
								<span className={styles.filterGroupLabel}>
									<BadgeCheck size={13} strokeWidth={2.5} aria-hidden />
									Valorización
								</span>
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
									<option value="valorizadas">Solo valorizadas</option>
									<option value="no-valorizadas">Solo no valorizadas</option>
								</select>
							</div>

							<div className={styles.filterActions}>
								<button
									type="button"
									className={styles.btnApply}
									disabled={loadProd}
									onClick={() => void cargarProduccionConFiltros(fechaDesde, fechaHasta)}
								>
									<RefreshCw size={14} /> Aplicar período
								</button>
								<button
									type="button"
									className={styles.btnGhost}
									disabled={loadProd}
									onClick={() => {
										setSelectedCobertura('');
										setEstadoValorizacion('todas');
										setPaginaActual(1);
									}}
								>
									Limpiar tabla
								</button>
							</div>
						</aside>

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

									<div className={styles.statsRow}>
										<div className={styles.statCard}>
											<div className={styles.statIcon}>
												<Receipt size={20} />
											</div>
											<div>
												<div className={styles.statLabel}>Prácticas</div>
												<div className={styles.statValue}>{totalesFiltrados.lineas}</div>
												<div className={styles.statHint}>{prod.totales.lineas} total(es) en el período</div>
											</div>
										</div>
										<div className={styles.statCard}>
											<div className={styles.statIcon}>
												<BadgeCheck size={20} />
											</div>
											<div>
												<div className={styles.statLabel}>Valorizadas</div>
												<div className={styles.statValue}>{registrosFiltrados.filter(tieneValorEconomico).length}</div>
												<div className={styles.statHint}>Con total, importe o % mayor a 0</div>
											</div>
										</div>
										<div className={styles.statCard}>
											<div className={styles.statIcon}>
												<FileText size={20} />
											</div>
											<div>
												<div className={styles.statLabel}>Cantidad</div>
												<div className={styles.statValue}>{totalesFiltrados.cantidad.toLocaleString('es-AR')}</div>
												<div className={styles.statHint}>Total de prácticas filtradas</div>
											</div>
										</div>
										<div className={styles.statCard}>
											<div className={styles.statIcon}>
												<ShieldCheck size={20} />
											</div>
											<div>
												<div className={styles.statLabel}>Total valorizado</div>
												<div className={styles.statValue}>{formatImporte(totalesFiltrados.total)}</div>
												<div className={styles.statHint}>Importe final filtrado</div>
											</div>
										</div>
									</div>

									<div className={styles.tableHeaderRow}>
										<div>
											<h3 className={styles.tableSectionTitle}>Detalle de prácticas</h3>
											<p className={styles.tableSubtitle}>
												Cobertura: <strong>{selectedCobertura || 'Todas'}</strong> · Valorización:{' '}
												<strong>
													{estadoValorizacion === 'todas'
														? 'Todas'
														: estadoValorizacion === 'valorizadas'
															? 'Solo valorizadas'
															: 'Solo no valorizadas'}
												</strong>{' '}
												· Período: {prod.totales.lineas} → Filtradas: {registrosFiltrados.length}
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
															<th>Fecha</th>
															<th>Hora</th>
															<th>Cód. práctica</th>
															<th>Descripción</th>
															<th className={styles.num}>Cantidad</th>
															<th>DNI paciente</th>
															<th>Nombre paciente</th>
															<th>Cobertura (OS)</th>
															<th className={styles.num}>% facturado</th>
															<th className={styles.num}>Importe unitario</th>
															<th className={styles.num}>Total</th>
														</tr>
													</thead>
													<tbody>
														{registrosPaginados.map((row: ProduccionFila, idx: number) => (
															<tr
																key={`${row.id}-${row.idMatch || ''}-${row.codigoPractica}-${row.fecha || ''}-${row.dniPaciente || ''}-${idx}`}
															>
																<td>{row.fecha || '—'}</td>
																<td className={styles.fieldMono}>{formatHora(row.hora)}</td>
																<td className={styles.fieldMono}>{row.codigoPractica || '—'}</td>
																<td>{row.descripcionPractica || '—'}</td>
																<td className={styles.num}>{Number(row.cantidad)}</td>
																<td className={styles.fieldMono}>{row.dniPaciente || '—'}</td>
																<td>{row.nombrePaciente || '—'}</td>
																<td>{normalizarCobertura(row)}</td>
																<td className={styles.num}>{Number(row.porcentajeFacturado)}</td>
																<td className={styles.num}>{formatImporte(Number(row.importeUnitario))}</td>
																<td className={styles.num}>{formatImporte(Number(row.total))}</td>
															</tr>
														))}
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
