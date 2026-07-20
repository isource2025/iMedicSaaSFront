'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import estudiosService from '@/app/services/estudiosService';
import {
	interconsultasService,
	type InterconsultaRow,
} from '@/app/services/interconsultasService';
import type { PedidoEstudio, SectorReceptorEstudio } from '@/app/types/estudios';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import { useAppContext } from '@/app/contexts/AppContext';
import { resolveSectorReceptor } from '@/app/utils/resolveSectorReceptor';
import CumplirEstudioModal from '@/app/components/beds/estudios/CumplirEstudioModal';
import PedidoDetalleModal from '@/app/components/beds/shared/PedidoDetalleModal';
import styles from './bandejaPedidos.module.css';

const POLL_MS = 3000;

type Tab = 'estudios' | 'interconsultas';

function formatFechaEstudio(row: PedidoEstudio) {
	return [row.FechaPedidoISO || '', row.HoraPedido || ''].filter(Boolean).join(' ');
}

function formatFechaIc(row: InterconsultaRow) {
	return [row.FechaSolicitud, row.HoraSolicitud].filter(Boolean).join(' ');
}

function fingerprintEstudios(rows: PedidoEstudio[]) {
	return rows
		.map((r) => `${r.IdPedido}:${r.Tomado ? 1 : 0}:${r.MatriculaToma || 0}:${r.NombreToma || ''}`)
		.join('|');
}

function fingerprintIc(rows: InterconsultaRow[]) {
	return rows
		.map((r) => {
			const id = r.IdPedido || r.IdInterconsulta;
			return `${id}:${r.Tomado ? 1 : 0}:${r.MatriculaToma || 0}:${r.NombreToma || ''}`;
		})
		.join('|');
}

function BandejaPedidosContent() {
	const searchParams = useSearchParams();
	const usuario = useUsuarioActual();
	const { sectorSeleccionado } = useAppContext();
	const matriculaSesion = usuario?.matricula ?? null;

	const tabParam = String(searchParams.get('tab') || '').toLowerCase();
	const [tab, setTab] = useState<Tab>(
		tabParam === 'interconsultas' || tabParam === 'interconsulta' ? 'interconsultas' : 'estudios',
	);

	const [sectores, setSectores] = useState<SectorReceptorEstudio[]>([]);
	const [sector, setSector] = useState('');
	const [estudios, setEstudios] = useState<PedidoEstudio[]>([]);
	const [interconsultas, setInterconsultas] = useState<InterconsultaRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<number | null>(null);
	const [live, setLive] = useState(true);
	const [lastTick, setLastTick] = useState<Date | null>(null);

	const [selectedEstudio, setSelectedEstudio] = useState<PedidoEstudio | null>(null);
	const [cumplirEstudio, setCumplirEstudio] = useState<PedidoEstudio | null>(null);
	const [selectedIc, setSelectedIc] = useState<InterconsultaRow | null>(null);
	const [cumplirIc, setCumplirIc] = useState<InterconsultaRow | null>(null);
	const [respuestaIc, setRespuestaIc] = useState('');

	const fpRef = useRef('');
	const sectorRef = useRef(sector);
	const tabRef = useRef(tab);
	sectorRef.current = sector;
	tabRef.current = tab;

	useEffect(() => {
		const t = String(searchParams.get('tab') || '').toLowerCase();
		if (t === 'interconsultas' || t === 'interconsulta') setTab('interconsultas');
		if (t === 'estudios' || t === 'estudio') setTab('estudios');
	}, [searchParams]);

	useEffect(() => {
		void estudiosService.listarSectoresReceptor().then((list) => {
			setSectores(list);
			const qSector = String(searchParams.get('sector') || '').trim();
			const resolved = resolveSectorReceptor(
				qSector
					? { idSector: qSector, descripcion: sectorSeleccionado?.descripcion }
					: sectorSeleccionado,
				list,
			);
			if (resolved) setSector(resolved);
			else if (list[0]?.valor) setSector(list[0].valor);
		});
	}, [searchParams, sectorSeleccionado]);

	const load = useCallback(
		async (opts?: { silent?: boolean }) => {
			const sec = sectorRef.current.trim();
			const currentTab = tabRef.current;
			if (!sec) {
				setEstudios([]);
				setInterconsultas([]);
				setLoading(false);
				return;
			}
			const silent = Boolean(opts?.silent);
			if (!silent) setLoading(true);
			else setRefreshing(true);
			setError(null);
			try {
				if (currentTab === 'estudios') {
					const rows = await estudiosService.listarPendientes(sec);
					const fp = fingerprintEstudios(rows);
					if (fp !== fpRef.current || !silent) {
						fpRef.current = fp;
						setEstudios(rows);
					}
				} else {
					const rows = await interconsultasService.listarPendientes(sec);
					const fp = fingerprintIc(rows);
					if (fp !== fpRef.current || !silent) {
						fpRef.current = fp;
						setInterconsultas(rows);
					}
				}
				setLastTick(new Date());
			} catch (e) {
				if (!silent) {
					setError(e instanceof Error ? e.message : 'Error al cargar la bandeja');
					setEstudios([]);
					setInterconsultas([]);
				}
			} finally {
				setLoading(false);
				setRefreshing(false);
			}
		},
		[],
	);

	useEffect(() => {
		fpRef.current = '';
		void load({ silent: false });
	}, [sector, tab, load]);

	useEffect(() => {
		if (!live || !sector.trim()) return;
		const id = window.setInterval(() => {
			if (document.visibilityState !== 'visible') return;
			void load({ silent: true });
		}, POLL_MS);
		const onVis = () => {
			if (document.visibilityState === 'visible') void load({ silent: true });
		};
		document.addEventListener('visibilitychange', onVis);
		return () => {
			window.clearInterval(id);
			document.removeEventListener('visibilitychange', onVis);
		};
	}, [live, sector, tab, load]);

	const esMioEstudio = (r: PedidoEstudio) =>
		matriculaSesion != null &&
		r.MatriculaToma != null &&
		Number(r.MatriculaToma) === Number(matriculaSesion);

	const esMioIc = (r: InterconsultaRow) =>
		matriculaSesion != null &&
		r.MatriculaToma != null &&
		Number(r.MatriculaToma) === Number(matriculaSesion);

	const icId = (r: InterconsultaRow) => Number(r.IdPedido || r.IdInterconsulta) || 0;

	const aceptarEstudio = async (r: PedidoEstudio) => {
		setBusyId(r.IdPedido);
		setError(null);
		try {
			await estudiosService.tomar(r.IdPedido);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo aceptar (puede que otro ya lo tomó)');
			await load({ silent: true });
		} finally {
			setBusyId(null);
		}
	};

	const liberarEstudio = async (r: PedidoEstudio) => {
		setBusyId(r.IdPedido);
		try {
			await estudiosService.liberar(r.IdPedido);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo liberar');
		} finally {
			setBusyId(null);
		}
	};

	const aceptarIc = async (r: InterconsultaRow) => {
		const id = icId(r);
		setBusyId(id);
		setError(null);
		try {
			await interconsultasService.tomar(id);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo aceptar (puede que otro ya lo tomó)');
			await load({ silent: true });
		} finally {
			setBusyId(null);
		}
	};

	const liberarIc = async (r: InterconsultaRow) => {
		const id = icId(r);
		setBusyId(id);
		try {
			await interconsultasService.liberar(id);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo liberar');
		} finally {
			setBusyId(null);
		}
	};

	const confirmarCumplirIc = async () => {
		if (!cumplirIc || !respuestaIc.trim()) return;
		const id = icId(cumplirIc);
		setBusyId(id);
		try {
			await interconsultasService.cumplir(id, respuestaIc.trim());
			setCumplirIc(null);
			setRespuestaIc('');
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo cumplir');
		} finally {
			setBusyId(null);
		}
	};

	const rowsEstudio = estudios;
	const rowsIc = interconsultas;
	const libres =
		tab === 'estudios'
			? rowsEstudio.filter((r) => !r.Tomado).length
			: rowsIc.filter((r) => !r.Tomado).length;

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<div>
					<h1 className={styles.title}>Bandeja de pedidos</h1>
					<p className={styles.subtitle}>
						Solicitudes de estudios e interconsultas para tu servicio. Un pedido solo puede
						aceptarlo una persona; la lista se actualiza sola.
					</p>
				</div>
				<div className={styles.liveBox}>
					<span className={`${styles.liveDot} ${live ? styles.liveOn : styles.liveOff}`} />
					<label className={styles.liveLabel}>
						<input
							type="checkbox"
							checked={live}
							onChange={(e) => setLive(e.target.checked)}
						/>
						Escucha en vivo
					</label>
					{lastTick ? (
						<span className={styles.liveMeta}>
							{refreshing ? 'Actualizando…' : `Act. ${lastTick.toLocaleTimeString('es-AR')}`}
						</span>
					) : null}
				</div>
			</header>

			<div className={styles.toolbar}>
				<label className={styles.field}>
					<span>Servicio receptor</span>
					<select
						className={styles.select}
						value={sector}
						onChange={(e) => setSector(e.target.value)}
					>
						<option value="">Seleccionar…</option>
						{sectores.map((s) => (
							<option key={s.valor} value={s.valor}>
								{s.descripcion} ({s.valor})
							</option>
						))}
					</select>
				</label>
				<div className={styles.tabs} role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={tab === 'estudios'}
						className={`${styles.tab} ${tab === 'estudios' ? styles.tabActive : ''}`}
						onClick={() => setTab('estudios')}
					>
						Estudios
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === 'interconsultas'}
						className={`${styles.tab} ${tab === 'interconsultas' ? styles.tabActive : ''}`}
						onClick={() => setTab('interconsultas')}
					>
						Interconsultas
					</button>
				</div>
				<button
					type="button"
					className={styles.refreshBtn}
					onClick={() => void load({ silent: false })}
					disabled={loading}
				>
					Actualizar
				</button>
			</div>

			<p className={styles.metaLine}>
				{sector
					? `${libres} libre(s) · ${tab === 'estudios' ? rowsEstudio.length : rowsIc.length} pendiente(s)`
					: 'Elegí el servicio para ver pedidos'}
			</p>

			{error ? <div className={styles.error}>{error}</div> : null}

			{loading ? (
				<p className={styles.empty}>Cargando bandeja…</p>
			) : tab === 'estudios' ? (
				rowsEstudio.length === 0 ? (
					<p className={styles.empty}>No hay estudios pendientes para este servicio.</p>
				) : (
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Estado</th>
									<th>Fecha</th>
									<th>Visita</th>
									<th>Estudio</th>
									<th>Solicitante</th>
									<th>Urgencia</th>
									<th>Acción</th>
								</tr>
							</thead>
							<tbody>
								{rowsEstudio.map((r) => (
									<tr
										key={r.IdPedido}
										className={
											r.Tomado && !esMioEstudio(r) ? styles.rowTaken : undefined
										}
									>
										<td>
											{!r.Tomado ? (
												<span className={styles.badgeLibre}>Libre</span>
											) : esMioEstudio(r) ? (
												<span className={styles.badgeMio}>Aceptado por vos</span>
											) : (
												<span className={styles.badgeOtro}>
													Aceptado · {r.NombreToma || 'otro'}
												</span>
											)}
										</td>
										<td>{formatFechaEstudio(r)}</td>
										<td>{r.IdVisita}</td>
										<td>
											<button
												type="button"
												className={styles.linkBtn}
												onClick={() =>
													void estudiosService
														.obtenerPorId(r.IdPedido)
														.then((d) => setSelectedEstudio(d || r))
												}
											>
												<div className={styles.practica}>{r.PracticaSolicitada}</div>
												<div className={styles.hint}>Cód. {r.CodigoPractica}</div>
											</button>
										</td>
										<td>{r.MedicoSolicitanteNombre || '—'}</td>
										<td>{r.EstadoUrgencia || '—'}</td>
										<td>
											<div className={styles.actions}>
												{!r.Tomado ? (
													<button
														type="button"
														className={styles.btnPrimary}
														disabled={busyId === r.IdPedido}
														onClick={() => void aceptarEstudio(r)}
													>
														Aceptar
													</button>
												) : null}
												{r.Tomado && esMioEstudio(r) ? (
													<>
														<button
															type="button"
															className={styles.btnPrimary}
															disabled={busyId === r.IdPedido}
															onClick={() => setCumplirEstudio(r)}
														>
															Cumplir
														</button>
														<button
															type="button"
															className={styles.btnSecondary}
															disabled={busyId === r.IdPedido}
															onClick={() => void liberarEstudio(r)}
														>
															Liberar
														</button>
													</>
												) : null}
												{r.Tomado && !esMioEstudio(r) ? (
													<span className={styles.hint}>No disponible</span>
												) : null}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)
			) : rowsIc.length === 0 ? (
				<p className={styles.empty}>No hay interconsultas pendientes para este servicio.</p>
			) : (
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Estado</th>
								<th>Fecha</th>
								<th>Visita</th>
								<th>Motivo</th>
								<th>Solicitante</th>
								<th>Acción</th>
							</tr>
						</thead>
						<tbody>
							{rowsIc.map((r) => {
								const id = icId(r);
								return (
									<tr
										key={id}
										className={r.Tomado && !esMioIc(r) ? styles.rowTaken : undefined}
									>
										<td>
											{!r.Tomado ? (
												<span className={styles.badgeLibre}>Libre</span>
											) : esMioIc(r) ? (
												<span className={styles.badgeMio}>Aceptado por vos</span>
											) : (
												<span className={styles.badgeOtro}>
													Aceptado · {r.NombreToma || 'otro'}
												</span>
											)}
										</td>
										<td>{formatFechaIc(r)}</td>
										<td>{r.IdVisita || '—'}</td>
										<td>
											<button
												type="button"
												className={styles.linkBtn}
												onClick={() => setSelectedIc(r)}
											>
												{(r.Motivo || r.NotasObservacion || 'Interconsulta').slice(0, 120)}
											</button>
										</td>
										<td>{r.MedicoSolicitanteNombre || '—'}</td>
										<td>
											<div className={styles.actions}>
												{!r.Tomado ? (
													<button
														type="button"
														className={styles.btnPrimary}
														disabled={busyId === id}
														onClick={() => void aceptarIc(r)}
													>
														Aceptar
													</button>
												) : null}
												{r.Tomado && esMioIc(r) ? (
													<>
														<button
															type="button"
															className={styles.btnPrimary}
															disabled={busyId === id}
															onClick={() => {
																setCumplirIc(r);
																setRespuestaIc('');
															}}
														>
															Responder
														</button>
														<button
															type="button"
															className={styles.btnSecondary}
															disabled={busyId === id}
															onClick={() => void liberarIc(r)}
														>
															Liberar
														</button>
													</>
												) : null}
												{r.Tomado && !esMioIc(r) ? (
													<span className={styles.hint}>No disponible</span>
												) : null}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{selectedEstudio ? (
				<PedidoDetalleModal
					title={selectedEstudio.PracticaSolicitada || 'Pedido'}
					urgencia={selectedEstudio.EstadoUrgencia}
					fields={[
						{ label: 'Visita', value: selectedEstudio.IdVisita },
						{ label: 'Fecha', value: formatFechaEstudio(selectedEstudio) },
						{ label: 'Solicitante', value: selectedEstudio.MedicoSolicitanteNombre },
						{ label: 'Aceptado por', value: selectedEstudio.NombreToma },
						{
							label: 'Destino',
							value: selectedEstudio.ServicioDescripcion || selectedEstudio.SectorReceptor,
						},
						{ label: 'Notas', value: selectedEstudio.NotasObservacion, full: true },
					]}
					onClose={() => setSelectedEstudio(null)}
				/>
			) : null}

			<CumplirEstudioModal
				open={!!cumplirEstudio}
				pedido={cumplirEstudio}
				sectorServicio={sector || undefined}
				onClose={() => setCumplirEstudio(null)}
				onCumplido={() => void load({ silent: true })}
			/>

			{selectedIc ? (
				<PedidoDetalleModal
					title="Interconsulta"
					fields={[
						{ label: 'Visita', value: selectedIc.IdVisita },
						{ label: 'Fecha', value: formatFechaIc(selectedIc) },
						{ label: 'Solicitante', value: selectedIc.MedicoSolicitanteNombre },
						{ label: 'Aceptado por', value: selectedIc.NombreToma },
						{
							label: 'Motivo',
							value: selectedIc.Motivo || selectedIc.NotasObservacion,
							full: true,
						},
					]}
					onClose={() => setSelectedIc(null)}
				/>
			) : null}

			{cumplirIc ? (
				<div className={styles.modalOverlay} onClick={() => setCumplirIc(null)}>
					<div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
						<h3 className={styles.modalTitle}>Responder interconsulta</h3>
						<textarea
							className={styles.textarea}
							rows={6}
							value={respuestaIc}
							onChange={(e) => setRespuestaIc(e.target.value)}
							placeholder="Respuesta / resultado…"
						/>
						<div className={styles.actions}>
							<button type="button" className={styles.btnSecondary} onClick={() => setCumplirIc(null)}>
								Cancelar
							</button>
							<button
								type="button"
								className={styles.btnPrimary}
								disabled={!respuestaIc.trim() || busyId === icId(cumplirIc)}
								onClick={() => void confirmarCumplirIc()}
							>
								Enviar
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

export default function BandejaPedidosPage() {
	return (
		<Suspense
			fallback={
				<div className={styles.page}>
					<p className={styles.empty}>Cargando bandeja…</p>
				</div>
			}
		>
			<BandejaPedidosContent />
		</Suspense>
	);
}
