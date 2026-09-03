'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Calendar,
	ClipboardList,
	Filter,
	Receipt,
	RefreshCw,
	Search,
	Upload,
} from 'lucide-react';
import Loader from '@/app/components/Loader/Loader';
import { usePermiso } from '@/app/hooks/usePermiso';
import { mensajeDeError } from '@/app/utils/apiError';
import {
	liquidacionImportService,
	type ImportacionResumen,
} from '@/app/services/liquidacionImportService';
import ui from '../../profile/profile.module.css';
import styles from './liquidaciones.module.css';
import DetalleLiquidacionModal from './DetalleLiquidacionModal';
import ImportarLiquidacionModal from './ImportarLiquidacionModal';
import { claseEstadoFila, formatFechaHora, formatImporte } from './liquidacionesShared';

function defaultRange() {
	const now = new Date();
	const hasta = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	const from = new Date(now);
	from.setMonth(from.getMonth() - 5);
	from.setDate(1);
	const desde = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`;
	return { desde, hasta };
}

export default function LiquidacionesPage() {
	const { puede, loaded } = usePermiso();
	const puedeVer = puede('FACTURACION.LIQUIDACIONES.VER');
	const puedeImportar = puede('FACTURACION.LIQUIDACIONES.GESTIONAR');

	const rangoInicial = useMemo(defaultRange, []);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [desde, setDesde] = useState(rangoInicial.desde);
	const [hasta, setHasta] = useState(rangoInicial.hasta);
	const [busqueda, setBusqueda] = useState('');
	const [estado, setEstado] = useState<'TODAS' | 'APLICADO' | 'REVERTIDO'>('TODAS');
	const [historial, setHistorial] = useState<ImportacionResumen[]>([]);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [aviso, setAviso] = useState<string | null>(null);
	const [archivo, setArchivo] = useState<File | null>(null);
	const [importOpen, setImportOpen] = useState(false);
	const [detalle, setDetalle] = useState<ImportacionResumen | null>(null);

	const cargarHistorial = useCallback(async () => {
		if (!puedeVer) return;
		setCargando(true);
		setError(null);
		try {
			setHistorial(
				await liquidacionImportService.listarImportaciones({
					limite: 200,
					desde,
					hasta,
				}),
			);
		} catch (e) {
			setError(mensajeDeError(e, 'No pude cargar las liquidaciones'));
		} finally {
			setCargando(false);
		}
	}, [puedeVer, desde, hasta]);

	useEffect(() => {
		void cargarHistorial();
		// Carga inicial del período; el resto va con el botón Aplicar.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [puedeVer]);

	const visibles = useMemo(() => {
		const q = busqueda.trim().toLowerCase();
		return historial.filter((imp) => {
			if (estado !== 'TODAS' && imp.Estado !== estado) return false;
			if (!q) return true;
			return (
				String(imp.Archivo || '').toLowerCase().includes(q) ||
				String(imp.Usuario || '').toLowerCase().includes(q) ||
				String(imp.IdImport).includes(q)
			);
		});
	}, [historial, busqueda, estado]);

	const kpis = useMemo(() => {
		const aplicadas = visibles.filter((i) => i.Estado === 'APLICADO');
		const importe = aplicadas.reduce((acc, i) => acc + (Number(i.ImporteAplicado) || 0), 0);
		const ultima = visibles[0]?.FechaHora ?? null;
		return {
			importe,
			cantidad: visibles.length,
			aplicadas: aplicadas.length,
			revertidas: visibles.length - aplicadas.length,
			ultima,
		};
	}, [visibles]);

	const abrirImportar = () => inputRef.current?.click();

	const onFile = (file: File | null) => {
		if (!file) return;
		setArchivo(file);
		setImportOpen(true);
		if (inputRef.current) inputRef.current.value = '';
	};

	if (!loaded) {
		return (
			<div className={ui.container}>
				<div className={ui.loaderWrap}>
					<Loader />
				</div>
			</div>
		);
	}

	if (!puedeVer) {
		return (
			<div className={ui.container}>
				<div className={ui.empty}>No tenés permiso para ver las liquidaciones.</div>
			</div>
		);
	}

	return (
		<div className={ui.container}>
			<input
				ref={inputRef}
				type="file"
				accept=".xlsx,.xlsm,.xls"
				className={styles.inputArchivo}
				onChange={(e) => onFile(e.target.files?.[0] ?? null)}
			/>

			<section className={ui.hero}>
				<div className={ui.heroCover} />
				<div className={ui.heroInner}>
					<div className={ui.heroLeft}>
						<div className={ui.heroIconWrap}>
							<Receipt size={28} />
						</div>
						<div className={ui.heroText}>
							<span className={ui.eyebrow}>Facturación</span>
							<h1 className={ui.heroTitle}>Liquidaciones</h1>
							<p className={ui.heroSubtitle}>
								Historial de lo que la obra social liquidó. El importe queda en la columna
								Liquidado de la producción del profesional.
							</p>
						</div>
					</div>
					{puedeImportar && (
						<button type="button" className={`${ui.btnApply} ${styles.heroCta}`} onClick={abrirImportar}>
							<Upload size={16} /> Importar
						</button>
					)}
				</div>
			</section>

			{error && <p className={ui.err}>{error}</p>}
			{aviso && <p className={styles.ok}>{aviso}</p>}

			<section className={ui.productionShell}>
				<div className={ui.filtersBar}>
					<div className={ui.filtersBarLeft}>
						<div className={ui.filtersIcon}>
							<Filter size={16} />
						</div>
						<span className={ui.filtersPanelTitle}>Filtros</span>
					</div>
					<div className={ui.filterField}>
						<label className={ui.filterFieldLabel}>
							<Calendar size={11} strokeWidth={2.5} /> Desde
						</label>
						<input
							type="date"
							className={ui.dateInput}
							value={desde}
							onChange={(e) => setDesde(e.target.value)}
						/>
					</div>
					<div className={ui.filterField}>
						<label className={ui.filterFieldLabel}>
							<Calendar size={11} strokeWidth={2.5} /> Hasta
						</label>
						<input
							type="date"
							className={ui.dateInput}
							value={hasta}
							onChange={(e) => setHasta(e.target.value)}
						/>
					</div>
					<div className={ui.filterField}>
						<label className={ui.filterFieldLabel}>
							<Search size={11} strokeWidth={2.5} /> Buscar
						</label>
						<input
							type="search"
							className={ui.dateInput}
							placeholder="Archivo, usuario o #"
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
						/>
					</div>
					<div className={ui.filterField}>
						<label className={ui.filterFieldLabel}>Estado</label>
						<select
							className={ui.dateInput}
							value={estado}
							onChange={(e) => setEstado(e.target.value as 'TODAS' | 'APLICADO' | 'REVERTIDO')}
						>
							<option value="TODAS">Todas</option>
							<option value="APLICADO">Aplicadas</option>
							<option value="REVERTIDO">Revertidas</option>
						</select>
					</div>
					<button
						type="button"
						className={`${ui.btnApply} ${ui.filterBarBtn}`}
						disabled={cargando}
						onClick={() => void cargarHistorial()}
					>
						<RefreshCw size={13} /> Aplicar
					</button>
				</div>

				<div className={ui.productionMain}>
					<div className={ui.productionHeader}>
						<div>
							<span className={ui.sectionBadge}>
								<ClipboardList size={14} strokeWidth={2.5} />
								Período
							</span>
							<h2>Importaciones</h2>
							<p>
								Del <strong>{desde}</strong> al <strong>{hasta}</strong>
								{kpis.ultima ? ` · última ${formatFechaHora(kpis.ultima)}` : ''}
							</p>
						</div>
					</div>

					<div className={ui.statsRow}>
						<div className={`${ui.statCard} ${ui.statCardPrimary}`}>
							<div className={ui.statIcon}>
								<Receipt size={18} />
							</div>
							<div className={ui.statBody}>
								<div className={ui.statLabel}>Liquidado</div>
								<div className={`${ui.statValue} ${ui.statValueLarge}`}>
									${formatImporte(kpis.importe)}
								</div>
								<div className={ui.statHint}>{kpis.aplicadas} importaciones vigentes</div>
							</div>
						</div>
						<div className={ui.statCard}>
							<div className={ui.statIcon}>
								<ClipboardList size={18} />
							</div>
							<div className={ui.statBody}>
								<div className={ui.statLabel}>En el listado</div>
								<div className={ui.statValue}>{kpis.cantidad}</div>
								<div className={ui.statHint}>{kpis.revertidas} revertidas</div>
							</div>
						</div>
						<div className={ui.statCard}>
							<div className={ui.statIcon}>
								<Calendar size={18} />
							</div>
							<div className={ui.statBody}>
								<div className={ui.statLabel}>Última</div>
								<div className={ui.statValueOs}>{formatFechaHora(kpis.ultima)}</div>
								<div className={ui.statHint}>Click en una fila para ver el detalle</div>
							</div>
						</div>
					</div>

					{cargando ? (
						<div className={ui.loaderWrap}>
							<Loader />
						</div>
					) : visibles.length === 0 ? (
						<div className={ui.empty}>
							No hay liquidaciones en este período.
							{puedeImportar ? ' Usá Importar para cargar el Excel de la obra social.' : ''}
						</div>
					) : (
						<div className={ui.tableWrap}>
							<table className={ui.table}>
								<thead>
									<tr>
										<th>Fecha</th>
										<th>Archivo</th>
										<th>Usuario</th>
										<th className={ui.num}>Aplicadas</th>
										<th className={ui.num}>Sin aplicar</th>
										<th className={ui.num}>Importe</th>
										<th>Estado</th>
									</tr>
								</thead>
								<tbody>
									{visibles.map((imp) => (
										<tr
											key={imp.IdImport}
											className={`${ui.rowValor} ${styles.filaClick}`}
											onClick={() => setDetalle(imp)}
										>
											<td>
												<div className={ui.fechaCell}>
													<Calendar size={13} aria-hidden />
													<span>{formatFechaHora(imp.FechaHora)}</span>
												</div>
											</td>
											<td>
												<div className={ui.practicaCell}>
													<span className={ui.practicaDesc} title={imp.Archivo}>
														{imp.Archivo}
													</span>
													<span className={ui.practicaFunc}>#{imp.IdImport}</span>
												</div>
											</td>
											<td>
												<span className={ui.pacienteNombre}>{imp.Usuario || '—'}</span>
											</td>
											<td className={ui.num}>
												<span className={ui.qtyPill}>{imp.FilasAplicadas}</span>
											</td>
											<td className={ui.num}>{imp.FilasRechazadas}</td>
											<td className={ui.num}>
												<span className={ui.amountStrong}>${formatImporte(imp.ImporteAplicado)}</span>
											</td>
											<td>
												<span className={claseEstadoFila(imp.Estado)}>
													{imp.Estado === 'REVERTIDO' ? 'Revertida' : 'Aplicada'}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</section>

			<ImportarLiquidacionModal
				file={archivo}
				isOpen={importOpen}
				onClose={() => {
					setImportOpen(false);
					setArchivo(null);
				}}
				onAplicado={(idImport, nombre) => {
					setImportOpen(false);
					setArchivo(null);
					setAviso(`Importación ${idImport} aplicada.`);
					void cargarHistorial();
					setDetalle({
						IdImport: idImport,
						Archivo: nombre,
						FechaHora: new Date().toISOString(),
						Usuario: null,
						FilasArchivo: 0,
						FilasAplicadas: 0,
						FilasRechazadas: 0,
						ImporteAplicado: 0,
						Estado: 'APLICADO',
					});
				}}
			/>

			<DetalleLiquidacionModal
				resumen={detalle}
				isOpen={!!detalle}
				puedeEditar={puedeImportar}
				onClose={() => setDetalle(null)}
				onRenombrado={(archivo) => {
					setDetalle((d) => (d ? { ...d, Archivo: archivo } : d));
					setHistorial((h) =>
						h.map((imp) =>
							imp.IdImport === detalle?.IdImport ? { ...imp, Archivo: archivo } : imp,
						),
					);
				}}
				onRevertida={() => {
					setAviso(
						detalle ? `Importación ${detalle.IdImport} revertida.` : 'Importación revertida.',
					);
					setDetalle(null);
					void cargarHistorial();
				}}
			/>
		</div>
	);
}
