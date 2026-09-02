'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertTriangle,
	CheckCircle2,
	FileSpreadsheet,
	History,
	Info,
	Loader2,
	RotateCcw,
	Upload,
} from 'lucide-react';
import { usePermiso } from '@/app/hooks/usePermiso';
import { mensajeDeError } from '@/app/utils/apiError';
import {
	liquidacionImportService,
	type EstadoFilaLiquidacion,
	type FilaLiquidacion,
	type ImportacionResumen,
	type PreviewLiquidacion,
} from '@/app/services/liquidacionImportService';
import styles from './liquidaciones.module.css';

const ETIQUETA_ESTADO: Record<EstadoFilaLiquidacion, string> = {
	APLICADO: 'Coincide',
	SIN_CAMBIO: 'Ya estaba',
	AMBIGUA: 'Ambigua',
	SIN_MATCH: 'Sin coincidencia',
	DUPLICADA_EXCEL: 'Repetida en el archivo',
};

const CLASE_ESTADO: Record<EstadoFilaLiquidacion, string> = {
	APLICADO: styles.badgeOk,
	SIN_CAMBIO: styles.badgeNeutro,
	AMBIGUA: styles.badgeAlerta,
	SIN_MATCH: styles.badgeError,
	DUPLICADA_EXCEL: styles.badgeAlerta,
};


function formatImporte(n: number | null | undefined) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatFechaHora(valor: string | null | undefined) {
	if (!valor) return '—';
	const d = new Date(valor);
	if (Number.isNaN(d.getTime())) return String(valor);
	return d.toLocaleString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function LiquidacionesPage() {
	const { puede, loaded } = usePermiso();
	const puedeVer = puede('FACTURACION.LIQUIDACIONES.VER');
	const puedeImportar = puede('FACTURACION.LIQUIDACIONES.GESTIONAR');

	const inputRef = useRef<HTMLInputElement | null>(null);
	const [archivo, setArchivo] = useState<File | null>(null);
	const [preview, setPreview] = useState<PreviewLiquidacion | null>(null);
	const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoFilaLiquidacion>('TODOS');
	const [confirmarParcial, setConfirmarParcial] = useState(false);
	const [cargando, setCargando] = useState(false);
	const [aplicando, setAplicando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [aviso, setAviso] = useState<string | null>(null);
	const [historial, setHistorial] = useState<ImportacionResumen[]>([]);
	const [revirtiendo, setRevirtiendo] = useState<number | null>(null);

	const aplicado = preview?.aplicado ?? null;

	const cargarHistorial = useCallback(async () => {
		if (!puedeVer) return;
		try {
			setHistorial(await liquidacionImportService.listarImportaciones(20));
		} catch (e) {
			// El historial es informativo: no debe tapar la pantalla de importación.
			console.error('[liquidaciones] historial:', e);
		}
	}, [puedeVer]);

	useEffect(() => {
		void cargarHistorial();
	}, [cargarHistorial]);

	const limpiar = () => {
		setArchivo(null);
		setPreview(null);
		setFiltroEstado('TODOS');
		setConfirmarParcial(false);
		setError(null);
		setAviso(null);
		if (inputRef.current) inputRef.current.value = '';
	};

	const elegirArchivo = async (file: File | null) => {
		setPreview(null);
		setConfirmarParcial(false);
		setError(null);
		setAviso(null);
		setArchivo(file);
		if (!file) return;

		setCargando(true);
		try {
			setPreview(await liquidacionImportService.previsualizar(file));
		} catch (e) {
			setError(mensajeDeError(e, 'No pude leer el archivo'));
		} finally {
			setCargando(false);
		}
	};

	const aplicar = async () => {
		if (!archivo) return;
		setAplicando(true);
		setError(null);
		setAviso(null);
		try {
			const resultado = await liquidacionImportService.aplicar(archivo, confirmarParcial);
			setPreview(resultado);
			setAviso(
				`Se actualizaron ${resultado.aplicado?.filasAplicadas ?? 0} prestaciones por ` +
					`$${formatImporte(resultado.aplicado?.importeAplicado ?? 0)}.`,
			);
			await cargarHistorial();
		} catch (e) {
			setError(mensajeDeError(e, 'No pude aplicar la liquidación'));
		} finally {
			setAplicando(false);
		}
	};

	const revertir = async (idImport: number) => {
		setRevirtiendo(idImport);
		setError(null);
		setAviso(null);
		try {
			const r = await liquidacionImportService.revertir(idImport);
			setAviso(
				`Importación ${idImport} revertida: ${r.revertidas} prestaciones volvieron al importe anterior` +
					(r.omitidas > 0 ? `, ${r.omitidas} quedaron como estaban por tener un valor más nuevo` : '') +
					'.',
			);
			await cargarHistorial();
		} catch (e) {
			setError(mensajeDeError(e, 'No pude revertir la importación'));
		} finally {
			setRevirtiendo(null);
		}
	};

	const filasVisibles = useMemo(() => {
		if (!preview) return [];
		if (filtroEstado === 'TODOS') return preview.filas;
		return preview.filas.filter((f) => f.estado === filtroEstado);
	}, [preview, filtroEstado]);

	if (!loaded) {
		return (
			<div className={styles.container}>
				<div className={styles.cargando}>
					<Loader2 className={styles.spin} size={18} /> Cargando…
				</div>
			</div>
		);
	}

	if (!puedeVer) {
		return (
			<div className={styles.container}>
				<div className={styles.mensajeVacio}>
					<AlertTriangle size={20} />
					<span>No tenés permiso para ver las liquidaciones.</span>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<span className={styles.eyebrow}>Facturación</span>
				<h1 className={styles.title}>Liquidaciones</h1>
				<p className={styles.subtitle}>
					Importá el Excel que manda la obra social para registrar el importe liquidado de
					cada prestación. Ese valor es el que ve el profesional en la columna
					&ldquo;Liquidado&rdquo; de su producción.
				</p>
			</header>

			{error && (
				<div className={`${styles.alerta} ${styles.alertaError}`}>
					<AlertTriangle size={18} />
					<span>{error}</span>
				</div>
			)}
			{aviso && (
				<div className={`${styles.alerta} ${styles.alertaOk}`}>
					<CheckCircle2 size={18} />
					<span>{aviso}</span>
				</div>
			)}

			{puedeImportar ? (
				<section className={styles.card}>
					<h2 className={styles.cardTitle}>
						<Upload size={18} /> Importar liquidación
					</h2>

					<div className={styles.zonaArchivo}>
						<input
							ref={inputRef}
							type="file"
							accept=".xlsx,.xlsm,.xls"
							className={styles.inputArchivo}
							onChange={(e) => void elegirArchivo(e.target.files?.[0] ?? null)}
							disabled={cargando || aplicando}
						/>
						<button
							type="button"
							className={styles.botonPrimario}
							onClick={() => inputRef.current?.click()}
							disabled={cargando || aplicando}
						>
							<FileSpreadsheet size={16} />
							{archivo ? 'Elegir otro archivo' : 'Elegir archivo Excel'}
						</button>
						{archivo && (
							<span className={styles.nombreArchivo}>
								{archivo.name}
								{preview && (
									<em className={styles.hojaArchivo}>
										hoja &ldquo;{preview.hoja}&rdquo;, encabezado en la fila{' '}
										{preview.filaEncabezado}
									</em>
								)}
							</span>
						)}
						{archivo && (
							<button
								type="button"
								className={styles.botonTexto}
								onClick={limpiar}
								disabled={cargando || aplicando}
							>
								Descartar
							</button>
						)}
					</div>

					{cargando && (
						<div className={styles.cargando}>
							<Loader2 className={styles.spin} size={16} /> Cruzando el archivo con la
							facturación…
						</div>
					)}

					<p className={styles.ayuda}>
						El cruce es por <strong>IdPrestacion</strong>. Si un IdPrestacion aparece en más
						de una fila de facturación se toma la de honorarios; si ni así queda una sola,
						el renglón se informa y no se toca.
					</p>
				</section>
			) : (
				<div className={styles.alerta}>
					<Info size={18} />
					<span>
						Podés consultar el historial, pero importar liquidaciones requiere el permiso
						administrativo.
					</span>
				</div>
			)}

			{preview && (
				<section className={styles.card}>
					<h2 className={styles.cardTitle}>
						<Info size={18} /> Resultado del cruce
					</h2>

					<div className={styles.resumenGrid}>
						<div className={styles.resumenItem}>
							<span className={styles.resumenLabel}>Renglones</span>
							<span className={styles.resumenValor}>{preview.resumen.filas}</span>
						</div>
						<div className={`${styles.resumenItem} ${styles.resumenOk}`}>
							<span className={styles.resumenLabel}>Coinciden</span>
							<span className={styles.resumenValor}>{preview.resumen.aplicables}</span>
						</div>
						<div className={styles.resumenItem}>
							<span className={styles.resumenLabel}>Ya estaban</span>
							<span className={styles.resumenValor}>{preview.resumen.sinCambio}</span>
						</div>
						<div
							className={`${styles.resumenItem} ${
								preview.resumen.rechazadas > 0 ? styles.resumenAlerta : ''
							}`}
						>
							<span className={styles.resumenLabel}>Sin aplicar</span>
							<span className={styles.resumenValor}>{preview.resumen.rechazadas}</span>
						</div>
						<div className={styles.resumenItem}>
							<span className={styles.resumenLabel}>
								{aplicado ? 'Importe aplicado' : 'Importe a aplicar'}
							</span>
							<span className={styles.resumenValor}>
								${formatImporte(aplicado?.importeAplicado ?? preview.resumen.importeAplicable)}
							</span>
						</div>
					</div>

					{preview.resumen.importeDistintoAlFacturado > 0 && (
						<div className={styles.alerta}>
							<AlertTriangle size={18} />
							<span>
								{preview.resumen.importeDistintoAlFacturado} renglones traen un importe
								distinto al facturado. Se guarda el del Excel, que es lo que la obra social
								liquidó.
							</span>
						</div>
					)}

					{preview.importacionPrevia && !aplicado && (
						<div className={styles.alerta}>
							<History size={18} />
							<span>
								Este mismo archivo ya se importó el{' '}
								{formatFechaHora(preview.importacionPrevia.FechaHora)}
								{preview.importacionPrevia.Usuario
									? ` por ${preview.importacionPrevia.Usuario}`
									: ''}
								. Si lo aplicás otra vez, se vuelve a escribir el mismo importe.
							</span>
						</div>
					)}

					{aplicado ? (
						<div className={`${styles.alerta} ${styles.alertaOk}`}>
							<CheckCircle2 size={18} />
							<span>
								Importación {aplicado.idImport} aplicada: {aplicado.filasAplicadas}{' '}
								prestaciones actualizadas.
							</span>
						</div>
					) : (
						puedeImportar && (
							<div className={styles.acciones}>
								{preview.resumen.rechazadas > 0 && (
									<label className={styles.checkbox}>
										<input
											type="checkbox"
											checked={confirmarParcial}
											onChange={(e) => setConfirmarParcial(e.target.checked)}
										/>
										<span>
											Aplicar solo los {preview.resumen.aplicables} renglones que coinciden
											e ignorar los {preview.resumen.rechazadas} restantes
										</span>
									</label>
								)}
								<button
									type="button"
									className={styles.botonPrimario}
									onClick={() => void aplicar()}
									disabled={
										aplicando ||
										preview.resumen.aplicables === 0 ||
										(preview.resumen.rechazadas > 0 && !confirmarParcial)
									}
								>
									{aplicando ? (
										<Loader2 className={styles.spin} size={16} />
									) : (
										<CheckCircle2 size={16} />
									)}
									Aplicar a la facturación
								</button>
							</div>
						)
					)}

					<div className={styles.filtros}>
						<button
							type="button"
							className={`${styles.chip} ${filtroEstado === 'TODOS' ? styles.chipActivo : ''}`}
							onClick={() => setFiltroEstado('TODOS')}
						>
							Todos ({preview.resumen.filas})
						</button>
						{(Object.keys(ETIQUETA_ESTADO) as EstadoFilaLiquidacion[]).map((estado) => {
							const cantidad = preview.filas.filter((f) => f.estado === estado).length;
							if (cantidad === 0) return null;
							return (
								<button
									key={estado}
									type="button"
									className={`${styles.chip} ${
										filtroEstado === estado ? styles.chipActivo : ''
									}`}
									onClick={() => setFiltroEstado(estado)}
								>
									{ETIQUETA_ESTADO[estado]} ({cantidad})
								</button>
							);
						})}
					</div>

					<div className={styles.tablaWrap}>
						<table className={styles.tabla}>
							<thead>
								<tr>
									<th>Fila</th>
									<th>IdPrestacion</th>
									<th>Matrícula</th>
									<th>Visita</th>
									<th>Práctica</th>
									<th className={styles.num}>Facturado</th>
									<th className={styles.num}>Liquidado anterior</th>
									<th className={styles.num}>Liquidado nuevo</th>
									<th>Estado</th>
								</tr>
							</thead>
							<tbody>
								{filasVisibles.map((f: FilaLiquidacion) => (
									<tr key={`${f.fila}-${f.idPrestacion ?? 'sin'}`}>
										<td>{f.fila}</td>
										<td>{f.idPrestacion ?? '—'}</td>
										<td>
											{f.matricula ?? '—'}
											{f.coincideMatricula === false && (
												<span className={styles.marcaDistinta} title="No coincide con la facturación">
													!
												</span>
											)}
										</td>
										<td>
											{f.numeroVisita ?? '—'}
											{f.coincideVisita === false && (
												<span className={styles.marcaDistinta} title="No coincide con la facturación">
													!
												</span>
											)}
										</td>
										<td>{f.codigo || '—'}</td>
										<td className={styles.num}>
											{f.importeFinal != null ? `$${formatImporte(f.importeFinal)}` : '—'}
										</td>
										<td className={styles.num}>
											{f.importeAnterior != null
												? `$${formatImporte(f.importeAnterior)}`
												: '—'}
										</td>
										<td className={styles.num}>
											{f.importeExcel != null ? (
												<strong>${formatImporte(f.importeExcel)}</strong>
											) : (
												'—'
											)}
										</td>
										<td>
											<span className={`${styles.badge} ${CLASE_ESTADO[f.estado]}`}>
												{ETIQUETA_ESTADO[f.estado]}
											</span>
											{f.detalle && <div className={styles.detalleFila}>{f.detalle}</div>}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			<section className={styles.card}>
				<h2 className={styles.cardTitle}>
					<History size={18} /> Últimas importaciones
				</h2>
				{historial.length === 0 ? (
					<div className={styles.mensajeVacio}>
						<Info size={18} />
						<span>Todavía no se importó ninguna liquidación en esta empresa.</span>
					</div>
				) : (
					<div className={styles.tablaWrap}>
						<table className={styles.tabla}>
							<thead>
								<tr>
									<th>#</th>
									<th>Fecha</th>
									<th>Archivo</th>
									<th>Usuario</th>
									<th className={styles.num}>Aplicadas</th>
									<th className={styles.num}>Sin aplicar</th>
									<th className={styles.num}>Importe</th>
									<th>Estado</th>
									{puedeImportar && <th />}
								</tr>
							</thead>
							<tbody>
								{historial.map((imp) => (
									<tr key={imp.IdImport}>
										<td>{imp.IdImport}</td>
										<td>{formatFechaHora(imp.FechaHora)}</td>
										<td className={styles.celdaArchivo} title={imp.Archivo}>
											{imp.Archivo}
										</td>
										<td>{imp.Usuario || '—'}</td>
										<td className={styles.num}>{imp.FilasAplicadas}</td>
										<td className={styles.num}>{imp.FilasRechazadas}</td>
										<td className={styles.num}>${formatImporte(imp.ImporteAplicado)}</td>
										<td>
											<span
												className={`${styles.badge} ${
													imp.Estado === 'REVERTIDO' ? styles.badgeNeutro : styles.badgeOk
												}`}
											>
												{imp.Estado === 'REVERTIDO' ? 'Revertida' : 'Aplicada'}
											</span>
										</td>
										{puedeImportar && (
											<td>
												{imp.Estado === 'APLICADO' && (
													<button
														type="button"
														className={styles.botonTexto}
														onClick={() => void revertir(imp.IdImport)}
														disabled={revirtiendo === imp.IdImport}
													>
														{revirtiendo === imp.IdImport ? (
															<Loader2 className={styles.spin} size={14} />
														) : (
															<RotateCcw size={14} />
														)}
														Revertir
													</button>
												)}
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}
