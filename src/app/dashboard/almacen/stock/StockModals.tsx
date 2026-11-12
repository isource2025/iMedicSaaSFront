'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '@/app/components/UI/Modal';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { useToast } from '@/app/components/UI/ToastProvider';
import { almacenStockService } from '@/app/services/almacenStockService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { ExistenciaStock, MovimientoStock, RemitoDeposito } from '@/app/types/almacenStock';
import { EstadoBadge, FotoProducto, NivelBar, Segmented, fmtFecha, fmtNum } from '../AlmacenVisual';
import styles from '../stock.module.css';

function numInput(v: string) {
	if (v.trim() === '') return 0;
	const n = Number(v.replace(',', '.'));
	return Number.isFinite(n) ? n : 0;
}

function estadoDe(fisico: number, min: number, max: number, punto: number) {
	if (fisico <= 0) return 'sin' as const;
	if (min > 0 && fisico < min) return 'bajo' as const;
	if (punto > 0 && fisico <= punto) return 'reponer' as const;
	if (max > 0 && fisico > max) return 'exceso' as const;
	return 'ok' as const;
}

function pctDe(fisico: number, min: number, max: number) {
	const techo = max > 0 ? max : min > 0 ? min * 2 : 0;
	return techo ? Math.max(0, Math.round((fisico / techo) * 100)) : null;
}

function marcas(min: number, max: number, punto: number) {
	const techo = max > 0 ? max : min > 0 ? min * 2 : 0;
	if (!techo) return { marcaMin: null, marcaPunto: null };
	return { marcaMin: Math.round((min / techo) * 100), marcaPunto: Math.round((punto / techo) * 100) };
}

function CampoNum({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
	return (
		<div className={styles.field}>
			<label>{label}</label>
			<input type="number" min={0} step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
			{hint ? <span className={styles.nroHint}>{hint}</span> : null}
		</div>
	);
}

/** Vista previa del nivel con los parámetros que se están editando. */
function PreviewNivel({ fisico, min, max, punto }: { fisico: number; min: number; max: number; punto: number }) {
	const estado = estadoDe(fisico, min, max, punto);
	return (
		<div className={styles.previewNivel}>
			<div className={styles.previewNivelTop}>
				<span>
					Con <strong>{fmtNum(fisico)}</strong> en stock
				</span>
				<EstadoBadge estado={estado} />
			</div>
			<NivelBar pct={pctDe(fisico, min, max)} estado={estado} {...marcas(min, max, punto)} />
		</div>
	);
}

function ProductoHead({ row }: { row: ExistenciaStock }) {
	return (
		<div className={styles.stockModalHead}>
			<FotoProducto id={row.IdProducto} tieneFoto={row.TieneFoto} rubro={row.RubroNombre} size={52} />
			<div>
				<strong>{row.Descripcion}</strong>
				<div className={styles.muted}>
					#{row.IdProducto} · {row.DepositoNombre}
					{row.Ubicacion ? ` · ${row.Ubicacion}` : ''}
				</div>
			</div>
		</div>
	);
}

// ── Alta ───────────────────────────────────────────────────────────────

export function AltaStockModal({
	isOpen,
	onClose,
	onGuardado,
	depositos,
	depositoInicial,
}: {
	isOpen: boolean;
	onClose: () => void;
	onGuardado: () => void;
	depositos: RemitoDeposito[];
	depositoInicial?: number | '';
}) {
	const toast = useToast();
	const [prod, setProd] = useState<{ value: number; label: string } | null>(null);
	const [prodOpts, setProdOpts] = useState<{ value: number; label: string }[]>([]);
	const [buscando, setBuscando] = useState(false);
	const [dep, setDep] = useState<number | ''>('');
	const [ubi, setUbi] = useState('');
	const [min, setMin] = useState('');
	const [max, setMax] = useState('');
	const [punto, setPunto] = useState('');
	const [inicial, setInicial] = useState('');
	const [motivo, setMotivo] = useState('');
	const [guardando, setGuardando] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		setProd(null);
		setProdOpts([]);
		setDep(depositoInicial ?? '');
		setUbi('');
		setMin('');
		setMax('');
		setPunto('');
		setInicial('');
		setMotivo('');
	}, [isOpen, depositoInicial]);

	const buscar = async (q: string) => {
		if (q.trim().length < 2) return;
		setBuscando(true);
		try {
			const r = await almacenStockService.listarProductos({ search: q, campo: 'toda', estado: 'activos', pageSize: 25 });
			setProdOpts(r.items.map((p) => ({ value: p.IdProducto, label: `${p.IdProducto} — ${p.Descripcion || ''}` })));
		} catch {
			setProdOpts([]);
		} finally {
			setBuscando(false);
		}
	};

	const guardar = async () => {
		if (!prod) return toast.error('Elegí el producto');
		if (dep === '') return toast.error('Elegí el depósito');
		setGuardando(true);
		try {
			const r = await almacenStockService.crearExistencia({
				IdProducto: prod.value,
				IdDeposito: Number(dep),
				Ubicacion: ubi,
				StockMinimo: numInput(min),
				StockMaximo: numInput(max),
				PuntoPedido: numInput(punto),
				CantidadInicial: numInput(inicial),
				Motivo: motivo || undefined,
			});
			toast.success(r.ajuste ? `Alta registrada con stock inicial (${r.ajuste.Comprobante})` : 'Producto dado de alta en el depósito');
			onGuardado();
			onClose();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo dar de alta'));
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Alta de producto en depósito" size="medium">
			<div className={styles.stockForm}>
				<CustomSelect
					label="Producto"
					name="alta-prod"
					value={prod?.value ?? ''}
					isLoading={buscando}
					options={prodOpts}
					selectedLabel={prod?.label}
					onSearchChange={(t) => void buscar(t)}
					onChange={(v) => {
						const o = prodOpts.find((x) => x.value === Number(v));
						setProd(o || null);
					}}
				/>
				<div className={styles.formGrid}>
					<CustomSelect
						label="Depósito"
						name="alta-dep"
						value={dep}
						options={depositos.map((d) => ({ value: d.IdDeposito, label: d.Descripcion || String(d.IdDeposito) }))}
						onChange={(v) => setDep(v === '' || v == null ? '' : Number(v))}
					/>
					<div className={styles.field}>
						<label>Ubicación</label>
						<input value={ubi} maxLength={30} placeholder="Estante, pasillo…" onChange={(e) => setUbi(e.target.value)} />
					</div>
				</div>
				<p className={styles.prodSubhead}>Parámetros de reposición</p>
				<div className={styles.formGrid3}>
					<CampoNum label="Mínimo" value={min} onChange={setMin} />
					<CampoNum label="Punto de pedido" value={punto} onChange={setPunto} />
					<CampoNum label="Máximo" value={max} onChange={setMax} />
				</div>
				<p className={styles.prodSubhead}>Stock inicial (opcional)</p>
				<div className={styles.formGrid}>
					<CampoNum label="Cantidad inicial" value={inicial} onChange={setInicial} hint="Genera un ajuste AJU de stock inicial" />
					<div className={styles.field}>
						<label>Motivo</label>
						<input value={motivo} maxLength={50} placeholder="Stock inicial" onChange={(e) => setMotivo(e.target.value)} />
					</div>
				</div>
				<PreviewNivel fisico={numInput(inicial)} min={numInput(min)} max={numInput(max)} punto={numInput(punto)} />
			</div>
			<div className={styles.modalActions}>
				<button type="button" className={styles.btnGhost} onClick={onClose}>
					Cancelar
				</button>
				<button type="button" className={styles.btnPrimary} onClick={() => void guardar()} disabled={guardando}>
					{guardando ? 'Guardando…' : 'Dar de alta'}
				</button>
			</div>
		</Modal>
	);
}

// ── Parámetros ─────────────────────────────────────────────────────────

export function ParametrosStockModal({
	fila,
	onClose,
	onGuardado,
}: {
	fila: ExistenciaStock | null;
	onClose: () => void;
	onGuardado: () => void;
}) {
	const toast = useToast();
	const [ubi, setUbi] = useState('');
	const [min, setMin] = useState('');
	const [max, setMax] = useState('');
	const [punto, setPunto] = useState('');
	const [guardando, setGuardando] = useState(false);

	useEffect(() => {
		if (!fila) return;
		setUbi(fila.Ubicacion || '');
		setMin(String(fila.StockMinimo || ''));
		setMax(String(fila.StockMaximo || ''));
		setPunto(String(fila.PuntoPedido || ''));
	}, [fila]);

	const guardar = async () => {
		if (!fila || fila.IdDeposito == null) return;
		setGuardando(true);
		try {
			await almacenStockService.actualizarExistencia({ ...fila, IdDeposito: fila.IdDeposito }, {
				Ubicacion: ubi,
				StockMinimo: numInput(min),
				StockMaximo: numInput(max),
				PuntoPedido: numInput(punto),
			});
			toast.success('Parámetros actualizados');
			onGuardado();
			onClose();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo guardar'));
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Modal isOpen={!!fila} onClose={onClose} title="Parámetros de stock" size="medium">
			{fila ? (
				<div className={styles.stockForm}>
					<ProductoHead row={fila} />
					<div className={styles.field}>
						<label>Ubicación</label>
						<input value={ubi} maxLength={30} onChange={(e) => setUbi(e.target.value)} />
					</div>
					<div className={styles.formGrid3}>
						<CampoNum label="Mínimo" value={min} onChange={setMin} />
						<CampoNum label="Punto de pedido" value={punto} onChange={setPunto} />
						<CampoNum label="Máximo" value={max} onChange={setMax} />
					</div>
					<PreviewNivel fisico={fila.CantFisico} min={numInput(min)} max={numInput(max)} punto={numInput(punto)} />
					<p className={styles.muted}>Las cantidades no se editan acá: usá un ajuste para que quede registrado el movimiento.</p>
				</div>
			) : null}
			<div className={styles.modalActions}>
				<button type="button" className={styles.btnGhost} onClick={onClose}>
					Cancelar
				</button>
				<button type="button" className={styles.btnPrimary} onClick={() => void guardar()} disabled={guardando}>
					{guardando ? 'Guardando…' : 'Guardar'}
				</button>
			</div>
		</Modal>
	);
}

// ── Ajuste ─────────────────────────────────────────────────────────────

const MOTIVOS = ['Inventario', 'Rotura', 'Vencimiento', 'Error de carga', 'Consumo interno', 'Donación'];

export function AjusteStockModal({
	fila,
	onClose,
	onGuardado,
}: {
	fila: ExistenciaStock | null;
	onClose: () => void;
	onGuardado: () => void;
}) {
	const toast = useToast();
	const [modo, setModo] = useState<'entrada' | 'salida' | 'conteo'>('entrada');
	const [cant, setCant] = useState('');
	const [motivo, setMotivo] = useState('');
	const [guardando, setGuardando] = useState(false);

	useEffect(() => {
		if (!fila) return;
		setModo('entrada');
		setCant('');
		setMotivo('');
	}, [fila]);

	const actual = fila?.CantFisico ?? 0;
	const n = numInput(cant);
	const delta = modo === 'conteo' ? n - actual : modo === 'salida' ? -Math.abs(n) : Math.abs(n);
	const nuevo = actual + delta;
	const min = fila?.StockMinimo || 0;
	const max = fila?.StockMaximo || 0;
	const punto = fila?.PuntoPedido || 0;
	const invalido = cant.trim() === '' || Math.abs(delta) < 0.0001 || nuevo < 0;

	const guardar = async () => {
		if (!fila || fila.IdDeposito == null) return;
		if (!motivo.trim()) return toast.error('Indicá el motivo del ajuste');
		setGuardando(true);
		try {
			const r = await almacenStockService.ajustarExistencia({
				IdEmpresa: fila.IdEmpresa,
				IdSucursal: fila.IdSucursal,
				IdDeposito: fila.IdDeposito,
				IdProducto: fila.IdProducto,
				Modo: modo === 'conteo' ? 'conteo' : 'delta',
				Cantidad: modo === 'conteo' ? n : delta,
				Motivo: motivo,
			});
			toast.success(`Ajuste ${r.ajuste?.Comprobante || ''} registrado`);
			onGuardado();
			onClose();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo ajustar'));
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Modal isOpen={!!fila} onClose={onClose} title="Ajuste de stock" size="medium">
			{fila ? (
				<div className={styles.stockForm}>
					<ProductoHead row={fila} />
					<Segmented
						value={modo}
						onChange={setModo}
						opciones={[
							{ value: 'entrada', label: 'Sumar' },
							{ value: 'salida', label: 'Restar' },
							{ value: 'conteo', label: 'Conteo físico' },
						]}
					/>
					<div className={styles.field}>
						<label>{modo === 'conteo' ? 'Cantidad contada' : 'Cantidad'}</label>
						<input type="number" min={0} step="0.01" autoFocus value={cant} onChange={(e) => setCant(e.target.value)} />
					</div>

					<div className={styles.ajustePreview}>
						<div>
							<span>Actual</span>
							<strong>{fmtNum(actual)}</strong>
						</div>
						<span className={`${styles.ajusteDelta} ${delta >= 0 ? styles.importeEntrada : styles.importeSalida}`}>
							{delta >= 0 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
							{delta >= 0 ? '+' : ''}
							{fmtNum(delta)}
						</span>
						<ArrowRight size={16} className={styles.muted} />
						<div>
							<span>Nuevo</span>
							<strong className={nuevo < 0 ? styles.importeSalida : undefined}>{fmtNum(nuevo)}</strong>
						</div>
					</div>
					<PreviewNivel fisico={Math.max(0, nuevo)} min={min} max={max} punto={punto} />
					{nuevo < 0 ? <div className={styles.error}>El ajuste dejaría el stock en negativo.</div> : null}

					<div className={styles.field}>
						<label>Motivo</label>
						<input value={motivo} maxLength={50} onChange={(e) => setMotivo(e.target.value)} placeholder="Obligatorio" />
					</div>
					<div className={styles.chips}>
						{MOTIVOS.map((m) => (
							<button
								key={m}
								type="button"
								className={`${styles.chip} ${motivo === m ? styles.chipActive : ''}`}
								onClick={() => setMotivo(m)}
							>
								{m}
							</button>
						))}
					</div>
				</div>
			) : null}
			<div className={styles.modalActions}>
				<button type="button" className={styles.btnGhost} onClick={onClose}>
					Cancelar
				</button>
				<button type="button" className={styles.btnPrimary} onClick={() => void guardar()} disabled={guardando || invalido}>
					{guardando ? 'Registrando…' : 'Registrar ajuste'}
				</button>
			</div>
		</Modal>
	);
}

// ── Kardex ─────────────────────────────────────────────────────────────

export function KardexModal({
	isOpen,
	onClose,
	fila,
	idDeposito,
}: {
	isOpen: boolean;
	onClose: () => void;
	/** Sin fila: movimientos recientes de todos los productos. */
	fila: ExistenciaStock | null;
	idDeposito?: number;
}) {
	const [page, setPage] = useState(1);
	const [dias, setDias] = useState<number>(30);
	const [items, setItems] = useState<MovimientoStock[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dep = fila?.IdDeposito ?? idDeposito;

	useEffect(() => {
		if (isOpen) setPage(1);
	}, [isOpen, fila, dias]);

	useEffect(() => {
		if (!isOpen) return;
		let vivo = true;
		setCargando(true);
		setError(null);
		almacenStockService
			.movimientosStock({
				idProducto: fila?.IdProducto,
				idDeposito: dep,
				dias: fila ? undefined : dias,
				page,
				pageSize: 25,
			})
			.then((r) => {
				if (!vivo) return;
				setItems(r.items);
				setHasMore(r.hasMore);
			})
			.catch((e) => vivo && setError(mensajeDeError(e, 'No se pudieron cargar los movimientos')))
			.finally(() => vivo && setCargando(false));
		return () => {
			vivo = false;
		};
	}, [isOpen, fila, dep, dias, page]);

	const totales = useMemo(
		() =>
			items.reduce(
				(a, m) => (m.Cantidad >= 0 ? { ...a, ent: a.ent + m.Cantidad } : { ...a, sal: a.sal - m.Cantidad }),
				{ ent: 0, sal: 0 },
			),
		[items],
	);

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={fila ? 'Kardex del producto' : 'Movimientos de stock'} size="large">
			<div className={styles.stockForm}>
				{fila ? <ProductoHead row={fila} /> : null}
				<div className={styles.kardexBar}>
					{!fila ? (
						<Segmented
							value={String(dias)}
							onChange={(v) => setDias(Number(v))}
							opciones={[
								{ value: '7', label: '7 días' },
								{ value: '30', label: '30 días' },
								{ value: '90', label: '90 días' },
							]}
						/>
					) : (
						<span className={styles.muted}>Historial completo</span>
					)}
					<span className={styles.fichaFlujo}>
						<span className={styles.importeEntrada}>
							<ArrowDownRight size={14} /> {fmtNum(totales.ent)}
						</span>
						<span className={styles.importeSalida}>
							<ArrowUpRight size={14} /> {fmtNum(totales.sal)}
						</span>
						<span className={styles.muted}>en esta página</span>
					</span>
				</div>
				{error ? <div className={styles.error}>{error}</div> : null}
				<div className={styles.tableWrap} style={{ maxHeight: '55vh' }}>
					{cargando && !items.length ? (
						<div className={styles.empty}>Cargando…</div>
					) : !items.length ? (
						<div className={styles.empty}>Sin movimientos.</div>
					) : (
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Fecha</th>
									<th>Comprobante</th>
									{!fila ? <th>Producto</th> : null}
									<th>Depósito</th>
									<th>Concepto</th>
									<th style={{ textAlign: 'right' }}>Cantidad</th>
								</tr>
							</thead>
							<tbody>
								{items.map((m, i) => (
									<tr key={`${m.Origen}-${m.IdTransaccion}-${m.IdProducto}-${i}`}>
										<td className={styles.mono}>
											{fmtFecha(m.Fecha)}
											{m.Hora ? <div className={styles.muted}>{m.Hora}</div> : null}
										</td>
										<td>
											<span className={`${styles.sentidoTag} ${m.Origen === 'AJU' ? styles.badgePendiente : styles.sentidoEntrada}`}>
												{m.Origen === 'AJU' ? 'Ajuste' : 'Remito'}
											</span>{' '}
											<span className={styles.mono}>{m.Comprobante}</span>
										</td>
										{!fila ? <td>{m.ProductoNombre}</td> : null}
										<td>{m.DepositoNombre}</td>
										<td className={styles.muted}>{m.Concepto || '—'}</td>
										<td style={{ textAlign: 'right' }}>
											<span className={m.Cantidad >= 0 ? styles.importeEntrada : styles.importeSalida}>
												{m.Cantidad >= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
												{m.Cantidad >= 0 ? '+' : ''}
												{fmtNum(m.Cantidad)}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<div className={styles.pager}>
					<span className={styles.muted}>Página {page}</span>
					<div className={styles.pagerBtns}>
						<button type="button" className={styles.btnGhost} disabled={page <= 1 || cargando} onClick={() => setPage((p) => p - 1)}>
							<ChevronLeft size={16} />
						</button>
						<button type="button" className={styles.btnGhost} disabled={!hasMore || cargando} onClick={() => setPage((p) => p + 1)}>
							<ChevronRight size={16} />
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
}
