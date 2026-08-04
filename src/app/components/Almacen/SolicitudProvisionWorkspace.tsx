'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Plus, Save, Send, Trash2, X, RefreshCw, Printer, ShoppingCart } from 'lucide-react';
import { almacenService } from '@/app/services/almacenService';
import { useAppContext } from '@/app/contexts/AppContext';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import type {
	AlmacenArticulo,
	AlmacenDeposito,
	AlmacenOrigen,
	AlmacenSolicitud,
	SolicitudItem,
} from '@/app/types/almacen';
import styles from '@/app/dashboard/almacen/almacen.module.css';

export type SolItemDraft = {
	IdArticulo?: number | null;
	Codigo: string;
	Descripcion: string;
	Observaciones: string;
	Cantidad: number;
	Existencia?: number;
	StockMinimo?: number;
	UnidadMedida?: string;
};

type TipoSol = 'COMPRA' | 'TRANSFERENCIA';

type Props = {
	canCreate: boolean;
	canEdit: boolean;
	canEnviar: boolean;
	canGenerarOrden?: boolean;
	canTransferir?: boolean;
	onError: (msg: string | null) => void;
	onChanged?: () => void;
	onGenerarOrden?: (idSolicitud: number) => void;
};

function emptyDraft(idSector: string, nombreOrigen: string, nroPedido = '') {
	return {
		id: null as number | null,
		nroPedido,
		fechaPedido: new Date().toISOString().slice(0, 10),
		idSector,
		origenNombre: nombreOrigen,
		estado: 'BORRADOR',
		tipoSolicitud: 'COMPRA' as TipoSol,
		idDepositoOrigen: '' as string,
		idDepositoDestino: '' as string,
		items: [] as SolItemDraft[],
	};
}

function fmtDate(v?: string | null) {
	if (!v) return '—';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
	return d.toLocaleDateString('es-AR');
}

function yesNo(v: unknown) {
	return v === 1 || v === true || v === 'SI' ? 'SI' : 'NO';
}

export default function SolicitudProvisionWorkspace({
	canCreate,
	canEdit,
	canEnviar,
	canGenerarOrden,
	canTransferir,
	onError,
	onChanged,
	onGenerarOrden,
}: Props) {
	const { sectorSeleccionado } = useAppContext();
	const [origenes, setOrigenes] = useState<AlmacenOrigen[]>([]);
	const [depositos, setDepositos] = useState<AlmacenDeposito[]>([]);
	const [idSector, setIdSector] = useState('');
	const [lista, setLista] = useState<AlmacenSolicitud[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<'idle' | 'new' | 'edit' | 'view'>('idle');
	const [draft, setDraft] = useState(() => emptyDraft('', ''));
	const [line, setLine] = useState({
		codigo: '',
		descripcion: '',
		observaciones: '',
		cantidad: 1,
		unidadMedida: '',
	});
	const [lookupBusy, setLookupBusy] = useState(false);
	const [catalogReady, setCatalogReady] = useState(false);
	const [receptorNombre, setReceptorNombre] = useState('Almacén');
	const [codeMatches, setCodeMatches] = useState<AlmacenArticulo[]>([]);
	const [codeDropOpen, setCodeDropOpen] = useState(false);
	const codeSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const codeBoxRef = useRef<HTMLDivElement | null>(null);

	const readonly = mode === 'view' || mode === 'idle' || (!canEdit && mode !== 'new');

	const origenActual = useMemo(
		() => origenes.find((o) => String(o.IdSector) === String(idSector)) || null,
		[origenes, idSector],
	);

	const loadCatalogos = useCallback(async () => {
		onError(null);
		try {
			const [orgs, deps] = await Promise.all([
				almacenService.listarOrigenes({ mios: true }),
				almacenService.listarDepositos().catch(() => [] as AlmacenDeposito[]),
			]);
			setOrigenes(orgs);
			setDepositos(deps.filter((d) => d.Activo !== false && d.Activo !== 0));
			const principal =
				deps.find((d) => d.EsPrincipal === true || d.EsPrincipal === 1) || deps[0];
			setReceptorNombre(principal?.Nombre || 'Almacén');

			const fromSession = sectorSeleccionado?.idSector
				? orgs.find((o) => String(o.IdSector) === String(sectorSeleccionado.idSector))
				: null;
			const pick = fromSession || orgs[0];
			if (pick) {
				setIdSector(String(pick.IdSector));
			} else {
				setIdSector('');
			}
			setCatalogReady(true);
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al cargar catálogos de almacén');
			setCatalogReady(true);
		}
	}, [onError, sectorSeleccionado?.idSector]);

	const loadLista = useCallback(async () => {
		if (!idSector) {
			setLista([]);
			return;
		}
		setLoading(true);
		onError(null);
		try {
			const sols = await almacenService.listarSolicitudes({ idSector });
			setLista(sols);
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al cargar solicitudes');
		} finally {
			setLoading(false);
		}
	}, [idSector, onError]);

	useEffect(() => {
		void loadCatalogos();
	}, [loadCatalogos]);

	useEffect(() => {
		if (catalogReady) void loadLista();
	}, [catalogReady, loadLista]);

	useEffect(() => {
		const onDoc = (e: MouseEvent) => {
			if (codeBoxRef.current && !codeBoxRef.current.contains(e.target as Node)) {
				setCodeDropOpen(false);
			}
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, []);

	useEffect(() => {
		if (codeSearchTimer.current) clearTimeout(codeSearchTimer.current);
		const q = line.codigo.trim();
		if (readonly || q.length < 1) {
			setCodeMatches([]);
			setCodeDropOpen(false);
			return;
		}
		codeSearchTimer.current = setTimeout(async () => {
			try {
				const page = await almacenService.listarArticulos({ search: q, page: 1, pageSize: 12 });
				setCodeMatches(page.items || []);
				setCodeDropOpen((page.items || []).length > 0);
			} catch {
				setCodeMatches([]);
				setCodeDropOpen(false);
			}
		}, 280);
		return () => {
			if (codeSearchTimer.current) clearTimeout(codeSearchTimer.current);
		};
	}, [line.codigo, readonly]);

	const cancelar = () => {
		setMode('idle');
		setDraft(emptyDraft(idSector, origenActual?.Nombre || ''));
		setCodeDropOpen(false);
	};

	const openNew = async () => {
		if (!canCreate) return;
		if (!idSector) {
			onError(
				'No tenés un sector origen asignado. Pedile a un administrador que te asigne sectores en Personal.',
			);
			return;
		}
		setMode('new');
		setLine({ codigo: '', descripcion: '', observaciones: '', cantidad: 1, unidadMedida: '' });
		try {
			const { nroPedido } = await almacenService.proximoNroPedido();
			setDraft(emptyDraft(idSector, origenActual?.Nombre || '', nroPedido));
		} catch {
			setDraft(emptyDraft(idSector, origenActual?.Nombre || '', ''));
		}
	};

	const openRow = async (id: number, as: 'edit' | 'view') => {
		setLoading(true);
		onError(null);
		try {
			const sol = await almacenService.obtenerSolicitud(id);
			const sec = sol.IdSector ? String(sol.IdSector) : idSector;
			if (sec) setIdSector(sec);
			const tipo: TipoSol =
				String(sol.TipoSolicitud || 'COMPRA').toUpperCase() === 'TRANSFERENCIA'
					? 'TRANSFERENCIA'
					: 'COMPRA';
			setDraft({
				id: sol.IdSolicitud,
				nroPedido: sol.NroPedido,
				fechaPedido: String(sol.FechaPedido || '').slice(0, 10),
				idSector: sec,
				origenNombre: sol.Origen || sol.Destino || '',
				estado: sol.Estado,
				tipoSolicitud: tipo,
				idDepositoOrigen: sol.IdDepositoOrigen != null ? String(sol.IdDepositoOrigen) : '',
				idDepositoDestino: sol.IdDepositoDestino != null ? String(sol.IdDepositoDestino) : '',
				items: (sol.items || []).map((it: SolicitudItem & { Existencia?: number; StockMinimo?: number }) => ({
					IdArticulo: it.IdArticulo,
					Codigo: it.Codigo || '',
					Descripcion: it.Descripcion,
					Observaciones: it.Observaciones || '',
					Cantidad: Number(it.Cantidad),
					Existencia: Number(it.Existencia ?? 0),
					StockMinimo: Number(it.StockMinimo ?? 0),
					UnidadMedida: it.UnidadMedida || '',
				})),
			});
			setMode(
				as === 'edit' && canEdit && ['BORRADOR', 'SOLICITADA', 'RECHAZADA'].includes(sol.Estado)
					? 'edit'
					: 'view',
			);
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al abrir solicitud');
		} finally {
			setLoading(false);
		}
	};

	const pickMatch = (art: AlmacenArticulo) => {
		setLine((prev) => ({
			...prev,
			codigo: art.Codigo,
			descripcion: art.Descripcion,
			cantidad: prev.cantidad || 1,
			unidadMedida: art.UnidadMedida || '',
		}));
		setCodeDropOpen(false);
		setCodeMatches([]);
	};

	const addLine = async () => {
		if (readonly) return;
		let codigo = line.codigo.trim();
		let descripcion = line.descripcion.trim();
		let idArticulo: number | null = null;
		let existencia = 0;
		let stockMinimo = 0;
		let unidadMedida = line.unidadMedida || '';

		if (codigo) {
			setLookupBusy(true);
			try {
				const art = await almacenService.buscarArticuloPorCodigo(codigo, {
					idSector: draft.idSector || idSector,
				});
				if (art) {
					idArticulo = art.IdArticulo;
					codigo = art.Codigo;
					descripcion = descripcion || art.Descripcion;
					existencia = Number(art.StockTotal || 0);
					stockMinimo = Number(art.StockMinimo || 0);
					unidadMedida = art.UnidadMedida || unidadMedida || '';
				}
			} catch {
				/* manual */
			} finally {
				setLookupBusy(false);
			}
		}
		if (!descripcion || line.cantidad <= 0) {
			onError('Ingresá descripción y cantidad del renglón');
			return;
		}
		setDraft((d) => ({
			...d,
			items: [
				...d.items,
				{
					IdArticulo: idArticulo,
					Codigo: codigo,
					Descripcion: descripcion,
					Observaciones: line.observaciones,
					Cantidad: Number(line.cantidad),
					Existencia: existencia,
					StockMinimo: stockMinimo,
					UnidadMedida: unidadMedida,
				},
			],
		}));
		setLine({ codigo: '', descripcion: '', observaciones: '', cantidad: 1, unidadMedida: '' });
		setCodeDropOpen(false);
		onError(null);
	};

	const removeLine = (idx: number) => {
		if (readonly) return;
		setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
	};

	const payload = useMemo(
		() => ({
			idSector: draft.idSector || idSector,
			origen: draft.origenNombre || origenActual?.Nombre,
			nroPedido: draft.nroPedido || undefined,
			fechaPedido: draft.fechaPedido,
			tipoSolicitud: draft.tipoSolicitud,
			idDepositoOrigen:
				draft.tipoSolicitud === 'TRANSFERENCIA' && draft.idDepositoOrigen
					? Number(draft.idDepositoOrigen)
					: null,
			idDepositoDestino:
				draft.tipoSolicitud === 'TRANSFERENCIA' && draft.idDepositoDestino
					? Number(draft.idDepositoDestino)
					: null,
			items: draft.items.map((it) => ({
				idArticulo: it.IdArticulo,
				codigo: it.Codigo,
				descripcion: it.Descripcion,
				observaciones: it.Observaciones,
				cantidad: it.Cantidad,
			})),
		}),
		[draft, idSector, origenActual],
	);

	const grabar = async (enviar: boolean) => {
		if (!canCreate && mode === 'new') return;
		if (!canEdit && mode === 'edit') return;
		if (!payload.idSector) {
			onError('Falta el sector origen del usuario');
			return;
		}
		if (payload.tipoSolicitud === 'TRANSFERENCIA') {
			if (!payload.idDepositoOrigen || !payload.idDepositoDestino) {
				onError('En transferencia, elegí depósito origen y destino');
				return;
			}
			if (payload.idDepositoOrigen === payload.idDepositoDestino) {
				onError('Origen y destino deben ser distintos');
				return;
			}
		}
		if (enviar && !draft.items.length) {
			onError('Agregá al menos un renglón antes de enviar');
			return;
		}
		setSaving(true);
		onError(null);
		try {
			let result: AlmacenSolicitud;
			const body = { ...payload, estado: enviar ? 'SOLICITADA' : 'BORRADOR' };
			if (mode === 'new' || !draft.id) {
				result = await almacenService.crearSolicitud(body);
			} else {
				result = await almacenService.actualizarSolicitud(draft.id, body);
				if (enviar && result.Estado === 'BORRADOR') {
					result = await almacenService.cambiarEstadoSolicitud(draft.id, { estado: 'SOLICITADA' });
				}
			}
			setMode('view');
			setDraft((d) => ({
				...d,
				id: result.IdSolicitud,
				nroPedido: result.NroPedido,
				estado: result.Estado,
				tipoSolicitud:
					String(result.TipoSolicitud || d.tipoSolicitud).toUpperCase() === 'TRANSFERENCIA'
						? 'TRANSFERENCIA'
						: 'COMPRA',
			}));
			await loadLista();
			onChanged?.();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al grabar');
		} finally {
			setSaving(false);
		}
	};

	const ejecutarTransferencia = async () => {
		if (!draft.id || !canTransferir) return;
		setSaving(true);
		onError(null);
		try {
			const result = await almacenService.ejecutarTransferenciaSolicitud(draft.id);
			setDraft((d) => ({ ...d, estado: result.Estado }));
			await loadLista();
			onChanged?.();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al transferir stock');
		} finally {
			setSaving(false);
		}
	};

	const stockClass = (existencia: number, min: number) => {
		if (min > 0 && existencia < min) return styles.stockLow;
		if (existencia <= 0) return styles.stockEmpty;
		return styles.stockOk;
	};

	const canEditRow = (s: AlmacenSolicitud) =>
		canEdit && ['BORRADOR', 'SOLICITADA', 'RECHAZADA'].includes(String(s.Estado || '').toUpperCase());

	const esTransfer = draft.tipoSolicitud === 'TRANSFERENCIA';
	const depOpts = [
		{ value: '', label: 'Elegir depósito…' },
		...depositos.map((d) => ({
			value: String(d.IdDeposito),
			label: `${d.Nombre}${d.Codigo ? ` (${d.Codigo})` : ''}`,
		})),
	];

	return (
		<div className={styles.solWorkspace}>
			<div className={styles.solTop}>
				<div className={styles.solDestCard}>
					<div className={styles.alSelectField}>
						<CustomSelect
							label="Origen (tu sector)"
							name="solOrigenSector"
							value={idSector}
							isLoading={!catalogReady}
							onChange={(v) => {
								setIdSector(String(v || ''));
								cancelar();
							}}
							options={
								origenes.length === 0
									? [{ value: '', label: 'Sin sectores asignados' }]
									: origenes.map((o) => ({
											value: String(o.IdSector),
											label: o.Nombre,
										}))
							}
							disabled={origenes.length === 0}
						/>
					</div>
					{origenes.length === 0 ? (
						<p className={styles.fieldHint}>
							Sin sectores en tu usuario. El origen se toma de los sectores/servicios asignados al
							personal que inició sesión.
						</p>
					) : null}
					{origenActual?.DepositoNombre ? (
						<span className={styles.fieldHint}>
							Stock del origen: {origenActual.DepositoNombre}
							{origenActual.DepositoCodigo ? ` (${origenActual.DepositoCodigo})` : ''}
						</span>
					) : (
						<span className={styles.fieldHint}>El receptor del pedido de compra es Almacén.</span>
					)}
					<p className={styles.solReceptor}>
						Receptor compra: <strong>{receptorNombre}</strong>
					</p>
					<div className={styles.solDestActions}>
						<button
							type="button"
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
							disabled={!canCreate || !idSector}
							onClick={() => void openNew()}
						>
							<Plus size={14} /> Nuevo
						</button>
						<button
							type="button"
							className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
							onClick={() => void loadLista()}
							aria-label="Actualizar"
						>
							<RefreshCw size={14} />
						</button>
					</div>
				</div>

				<div className={styles.solListCard}>
					<div className={styles.solListTitle}>
						Solicitudes
						{origenActual ? ` · ${origenActual.Nombre}` : ''}
					</div>
					<div className={styles.solListScroll}>
						{loading && lista.length === 0 ? (
							<div className={styles.loading}>Cargando…</div>
						) : lista.length === 0 ? (
							<p className={styles.emptyHint} style={{ padding: '1rem' }}>
								{idSector
									? 'No hay solicitudes de este origen.'
									: 'No hay sector origen para tu usuario.'}
							</p>
						) : (
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Solicitud</th>
										<th>Tipo</th>
										<th>Fecha</th>
										<th>Ú. modificación</th>
										<th>Emitido</th>
										<th>Satisfecho</th>
										<th className={styles.solActionsCol}></th>
									</tr>
								</thead>
								<tbody>
									{lista.map((s) => {
										const tipo =
											String(s.TipoSolicitud || 'COMPRA').toUpperCase() === 'TRANSFERENCIA'
												? 'Transferencia'
												: 'Compra';
										return (
											<tr
												key={s.IdSolicitud}
												className={`${styles.solRow} ${draft.id === s.IdSolicitud ? styles.solRowActive : ''}`}
											>
												<td className={styles.codeCell}>{s.NroPedido}</td>
												<td>
													<span
														className={`${styles.badge} ${
															tipo === 'Transferencia' ? styles.badgeInfo : styles.badgeMuted
														}`}
													>
														{tipo}
													</span>
												</td>
												<td>{fmtDate(s.FechaPedido)}</td>
												<td>{fmtDate(s.FechaUltimaMod || s.FechaAlta)}</td>
												<td>
													<span
														className={`${styles.badge} ${yesNo(s.Emitido) === 'SI' ? styles.badgeOk : styles.badgeMuted}`}
													>
														{yesNo(s.Emitido)}
													</span>
												</td>
												<td>
													<span
														className={`${styles.badge} ${yesNo(s.Satisfecho) === 'SI' ? styles.badgeOk : styles.badgeWarn}`}
													>
														{yesNo(s.Satisfecho)}
													</span>
												</td>
												<td className={styles.solActionsCol}>
													<span className={styles.solRowActions}>
														<button
															type="button"
															className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
															onClick={(e) => {
																e.stopPropagation();
																void openRow(s.IdSolicitud, 'view');
															}}
														>
															Ver
														</button>
														{canEditRow(s) ? (
															<button
																type="button"
																className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
																onClick={(e) => {
																	e.stopPropagation();
																	void openRow(s.IdSolicitud, 'edit');
																}}
															>
																Editar
															</button>
														) : null}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</div>

			{mode !== 'idle' && (
				<div className={styles.solDetail}>
					<div className={styles.solDetailHead}>
						<h3>
							{mode === 'new'
								? `Nueva solicitud · ${draft.nroPedido || '…'}`
								: `Solicitud ${draft.nroPedido || ''}`}
						</h3>
						{mode !== 'new' && (
							<span className={`${styles.badge} ${styles.badgeInfo}`}>{draft.estado}</span>
						)}
						<span
							className={`${styles.badge} ${esTransfer ? styles.badgeInfo : styles.badgeMuted}`}
						>
							{esTransfer ? 'Transferencia' : 'Compra / provisión'}
						</span>
					</div>

					<div className={styles.solParams}>
						<div className={styles.field}>
							<label>Origen</label>
							<input value={draft.origenNombre || origenActual?.Nombre || '—'} disabled />
						</div>
						<div className={styles.alSelectField}>
							{readonly ? (
								<div className={styles.field}>
									<label>Tipo de solicitud</label>
									<input
										value={esTransfer ? 'Movimiento entre depósitos' : 'Compra / provisión'}
										disabled
									/>
								</div>
							) : (
								<CustomSelect
									label="Tipo de solicitud"
									name="tipoSolicitud"
									value={draft.tipoSolicitud}
									isLoading={false}
									onChange={(v) =>
										setDraft({
											...draft,
											tipoSolicitud: String(v) === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'COMPRA',
										})
									}
									options={[
										{ value: 'COMPRA', label: 'Compra / provisión (puede generar orden)' },
										{ value: 'TRANSFERENCIA', label: 'Movimiento entre depósitos' },
									]}
								/>
							)}
						</div>
						{esTransfer ? (
							<>
								<div className={styles.alSelectField}>
									{readonly ? (
										<div className={styles.field}>
											<label>Depósito origen</label>
											<input
												value={
													depositos.find((d) => String(d.IdDeposito) === draft.idDepositoOrigen)
														?.Nombre || '—'
												}
												disabled
											/>
										</div>
									) : (
										<CustomSelect
											label="Depósito origen"
											name="depOrigen"
											value={draft.idDepositoOrigen}
											isLoading={false}
											onChange={(v) => setDraft({ ...draft, idDepositoOrigen: String(v || '') })}
											options={depOpts}
										/>
									)}
								</div>
								<div className={styles.alSelectField}>
									{readonly ? (
										<div className={styles.field}>
											<label>Depósito destino</label>
											<input
												value={
													depositos.find((d) => String(d.IdDeposito) === draft.idDepositoDestino)
														?.Nombre || '—'
												}
												disabled
											/>
										</div>
									) : (
										<CustomSelect
											label="Depósito destino"
											name="depDestino"
											value={draft.idDepositoDestino}
											isLoading={false}
											onChange={(v) => setDraft({ ...draft, idDepositoDestino: String(v || '') })}
											options={depOpts}
										/>
									)}
								</div>
							</>
						) : (
							<div className={styles.field}>
								<label>Receptor</label>
								<input value={receptorNombre} disabled />
							</div>
						)}
						<div className={styles.field}>
							<label>Nº pedido</label>
							<input
								value={draft.nroPedido || '…'}
								disabled
								readOnly
								className={styles.inputReadonly}
								title="Número generado automáticamente"
							/>
						</div>
						<div className={styles.field}>
							<label>Fecha pedido</label>
							<input
								type="date"
								value={draft.fechaPedido}
								disabled={readonly}
								onChange={(e) => setDraft({ ...draft, fechaPedido: e.target.value })}
							/>
						</div>
					</div>

					{!readonly && (
						<div className={styles.solAddLineBar}>
							<div className={styles.solAddLineBarHead}>
								<strong>Agregar renglón</strong>
								<span>Código, descripción, unidad y cantidad</span>
							</div>
							<div className={styles.solAddLine}>
								<div className={styles.solCodeWrap} ref={codeBoxRef}>
									<input
										placeholder="Código"
										value={line.codigo}
										autoComplete="off"
										onChange={(e) => setLine({ ...line, codigo: e.target.value })}
										onFocus={() => codeMatches.length > 0 && setCodeDropOpen(true)}
									/>
									{codeDropOpen && codeMatches.length > 0 ? (
										<ul className={styles.solCodeDrop} role="listbox">
											{codeMatches.map((a) => (
												<li key={a.IdArticulo}>
													<button
														type="button"
														className={styles.solCodeDropItem}
														onClick={() => pickMatch(a)}
													>
														<span className={styles.codeCell}>{a.Codigo}</span>
														<span className={styles.solCodeDropDesc}>{a.Descripcion}</span>
													</button>
												</li>
											))}
										</ul>
									) : null}
								</div>
								<input
									placeholder="Descripción"
									value={line.descripcion}
									onChange={(e) => setLine({ ...line, descripcion: e.target.value })}
									style={{ flex: 2 }}
								/>
								<input
									placeholder="Observaciones"
									value={line.observaciones}
									onChange={(e) => setLine({ ...line, observaciones: e.target.value })}
								/>
								<input
									placeholder="Unidad"
									value={line.unidadMedida}
									onChange={(e) => setLine({ ...line, unidadMedida: e.target.value })}
									style={{ maxWidth: 100 }}
									title="Unidad de medida"
								/>
								<input
									type="number"
									placeholder="Cant."
									value={line.cantidad}
									onChange={(e) => setLine({ ...line, cantidad: Number(e.target.value) })}
									style={{ maxWidth: 90 }}
								/>
								<button
									type="button"
									className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
									onClick={() => void addLine()}
									disabled={lookupBusy}
								>
									Agregar
								</button>
							</div>
						</div>
					)}

					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Código</th>
									<th>Descripción</th>
									<th>Unidad</th>
									<th>Observaciones</th>
									<th>Cant. pedida</th>
									<th>Exist. origen</th>
									<th>Cant. mín.</th>
									{!readonly && <th></th>}
								</tr>
							</thead>
							<tbody>
								{draft.items.length === 0 ? (
									<tr>
										<td colSpan={readonly ? 7 : 8} className={styles.empty}>
											Sin renglones. Escribí un código para ver coincidencias del catálogo.
										</td>
									</tr>
								) : (
									draft.items.map((it, idx) => (
										<tr key={idx}>
											<td className={styles.codeCell}>{it.Codigo || '—'}</td>
											<td>{it.Descripcion}</td>
											<td>{it.UnidadMedida || '—'}</td>
											<td>{it.Observaciones || '—'}</td>
											<td>
												<strong>{it.Cantidad}</strong>
											</td>
											<td className={stockClass(it.Existencia || 0, it.StockMinimo || 0)}>
												{it.Existencia ?? '—'}
											</td>
											<td>{it.StockMinimo ?? '—'}</td>
											{!readonly && (
												<td>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
														onClick={() => removeLine(idx)}
													>
														<Trash2 size={12} />
													</button>
												</td>
											)}
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div className={styles.solActions}>
						<button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={cancelar}>
							<X size={14} /> Cancelar
						</button>
						{(mode === 'new' || mode === 'edit') && canEdit && (
							<button
								type="button"
								className={`${styles.btn} ${styles.btnSecondary}`}
								disabled={saving}
								onClick={() => void grabar(false)}
							>
								<Save size={14} /> Grabar
							</button>
						)}
						{(mode === 'new' || mode === 'edit') && canEnviar && (
							<button
								type="button"
								className={`${styles.btn} ${styles.btnPrimary}`}
								disabled={saving}
								onClick={() => void grabar(true)}
							>
								<Send size={14} /> Enviar
							</button>
						)}
						{mode === 'view' &&
							!esTransfer &&
							canGenerarOrden &&
							onGenerarOrden &&
							draft.id &&
							['APROBADA', 'EN_COMPRA', 'SOLICITADA'].includes(String(draft.estado).toUpperCase()) && (
								<button
									type="button"
									className={`${styles.btn} ${styles.btnPrimary}`}
									onClick={() => onGenerarOrden(draft.id!)}
								>
									<ShoppingCart size={14} /> Generar orden
								</button>
							)}
						{mode === 'view' &&
							esTransfer &&
							canTransferir &&
							draft.id &&
							['APROBADA', 'EN_COMPRA', 'SOLICITADA'].includes(String(draft.estado).toUpperCase()) && (
								<button
									type="button"
									className={`${styles.btn} ${styles.btnPrimary}`}
									disabled={saving}
									onClick={() => void ejecutarTransferencia()}
								>
									<ArrowLeftRight size={14} /> Ejecutar transferencia
								</button>
							)}
						<button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => window.print()}>
							<Printer size={14} /> Imprimir
						</button>
					</div>
				</div>
			)}

			{mode === 'idle' && !loading && (
				<div className={styles.solIdleHint}>
					{origenActual ? (
						<>
							Elegí una solicitud para ver o editar. Podés pedir <strong>compra/provisión</strong> o un{' '}
							<strong>movimiento entre depósitos</strong>. Origen: <strong>{origenActual.Nombre}</strong>.
						</>
					) : (
						<>Asigná sectores al usuario en Personal para poder crear solicitudes de provisión.</>
					)}
				</div>
			)}
		</div>
	);
}
