'use client';

import { useCallback, useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { PedidoEstudio, SectorReceptorEstudio } from '@/app/types/estudios';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import Loader from '../../Loader/Loader';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import SolicitarEstudioModal from './SolicitarEstudioModal';
import CumplirEstudioModal from './CumplirEstudioModal';
import styles from './EstudiosSection.module.css';
import formStyles from './PedidoEstudioForms.module.css';

type Props = {
	numeroVisita: number | null;
	sectorSolicitante?: string | null;
};

type Tab = 'visita' | 'pendientes';

function urgenciaClass(estado?: string) {
	const v = (estado || '').trim().toLowerCase();
	if (v.includes('urgent')) return styles.urgenciaUrgente;
	if (v.includes('medio')) return styles.urgenciaMedio;
	if (v.includes('bajo') || v.includes('normal')) return styles.urgenciaBajo;
	return styles.urgenciaNone;
}

function formatFecha(row: PedidoEstudio) {
	const f = row.FechaPedidoISO || '';
	const h = row.HoraPedido || '';
	return [f, h].filter(Boolean).join(' ');
}

function buildEstudioFields(row: PedidoEstudio) {
	return [
		{ label: 'Fecha / hora', value: formatFecha(row) },
		{ label: 'Estado', value: row.EstadoWorkflow || (row.Cumplido ? 'Cumplido' : row.Tomado ? 'Tomado' : 'Pendiente') },
		{ label: 'Código práctica', value: row.CodigoPractica },
		{ label: 'Tipo de pedido', value: row.TipoPedidoDescripcion || row.PracticaSolicitada },
		{ label: 'Nomenclador', value: row.NomencladorDescripcion },
		{ label: 'Solicitado por', value: row.MedicoSolicitanteNombre },
		{ label: 'Matrícula', value: row.MatriculaSolicitante },
		{ label: 'Tomado por', value: row.NombreToma || (row.MatriculaToma ? String(row.MatriculaToma) : null) },
		{ label: 'Sector solicitante', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{
			label: 'Destino / servicio',
			value: row.ServicioDescripcion || row.SectorReceptorNombre || row.SectorReceptor,
		},
		{ label: 'Id resultado', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
		{ label: 'Id pedido', value: row.IdPedido },
		{ label: 'Realizado por', value: row.RealizadorNombre },
	];
}

export default function EstudiosSection({ numeroVisita, sectorSolicitante }: Props) {
	const { puede } = usePermiso();
	const usuario = useUsuarioActual();
	const matriculaSesion = usuario?.matricula ?? null;
	const puedeCrear = puede('INTERNACION.ESTUDIOS.CREAR');
	const [tab, setTab] = useState<Tab>('visita');
	const [rows, setRows] = useState<PedidoEstudio[]>([]);
	const [pendientes, setPendientes] = useState<PedidoEstudio[]>([]);
	const [sectores, setSectores] = useState<SectorReceptorEstudio[]>([]);
	const [sectorBandeja, setSectorBandeja] = useState('');
	const [loading, setLoading] = useState(false);
	const [busyId, setBusyId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<PedidoEstudio | null>(null);
	const [showSolicitar, setShowSolicitar] = useState(false);
	const [cumplirPedido, setCumplirPedido] = useState<PedidoEstudio | null>(null);

	useEffect(() => {
		void estudiosService.listarSectoresReceptor().then((list) => {
			setSectores(list);
			setSectorBandeja((prev) => prev || list[0]?.valor || '');
		});
	}, []);

	const loadVisita = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			setRows(await estudiosService.listarPorVisita(numeroVisita));
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, [numeroVisita]);

	const loadPendientes = useCallback(async () => {
		if (!sectorBandeja.trim()) {
			setPendientes([]);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			setPendientes(await estudiosService.listarPendientes(sectorBandeja.trim()));
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar pendientes');
		} finally {
			setLoading(false);
		}
	}, [sectorBandeja]);

	useEffect(() => {
		if (tab === 'visita') void loadVisita();
		else void loadPendientes();
	}, [tab, loadVisita, loadPendientes]);

	const handleRowClick = async (row: PedidoEstudio) => {
		const detail = await estudiosService.obtenerPorId(row.IdPedido);
		setSelected(detail || row);
	};

	const refreshListas = async () => {
		if (tab === 'pendientes') await loadPendientes();
		await loadVisita();
	};

	const onTomar = async (row: PedidoEstudio) => {
		setBusyId(row.IdPedido);
		setError(null);
		try {
			await estudiosService.tomar(row.IdPedido);
			await refreshListas();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo tomar');
		} finally {
			setBusyId(null);
		}
	};

	const onLiberar = async (row: PedidoEstudio) => {
		setBusyId(row.IdPedido);
		setError(null);
		try {
			await estudiosService.liberar(row.IdPedido);
			await refreshListas();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo liberar');
		} finally {
			setBusyId(null);
		}
	};

	const esMio = (r: PedidoEstudio) =>
		matriculaSesion != null && r.MatriculaToma != null && Number(r.MatriculaToma) === Number(matriculaSesion);

	const list = tab === 'visita' ? rows : pendientes;

	if (!numeroVisita) {
		return <div className={styles.empty}>No hay visita seleccionada</div>;
	}

	return (
		<div className={styles.wrap}>
			<div className={styles.header}>
				<div>
					<h2 className={styles.title}>Pedidos de estudios</h2>
					<p className={styles.subtitle}>
						Solicitud y cumplimiento de estudios (imagen / diagnóstico). Vía Internación.
					</p>
				</div>
				<div className={styles.headerActions}>
					{puedeCrear && (
						<button
							type="button"
							className={formStyles.btnPrimary}
							onClick={() => setShowSolicitar(true)}
							disabled={!sectorSolicitante}
							title={!sectorSolicitante ? 'Sin sector de la cama' : undefined}
						>
							Solicitar estudio
						</button>
					)}
				</div>
			</div>

			<div className={styles.tabs}>
				<button
					type="button"
					className={tab === 'visita' ? styles.tabActive : styles.tab}
					onClick={() => setTab('visita')}
				>
					De esta visita
				</button>
				<button
					type="button"
					className={tab === 'pendientes' ? styles.tabActive : styles.tab}
					onClick={() => setTab('pendientes')}
				>
					Pendientes del servicio
				</button>
			</div>

			{tab === 'pendientes' && (
				<label className={formStyles.label} style={{ maxWidth: 360 }}>
					Servicio receptor
					<select
						className={formStyles.input}
						value={sectorBandeja}
						onChange={(e) => setSectorBandeja(e.target.value)}
					>
						<option value="">Seleccionar…</option>
						{sectores.map((s) => (
							<option key={s.valor} value={s.valor}>
								{s.descripcion} ({s.valor})
							</option>
						))}
					</select>
				</label>
			)}

			{error && <div className={styles.error}>{error}</div>}
			{loading ? (
				<div style={{ position: 'relative', minHeight: 200 }}>
					<Loader />
				</div>
			) : list.length === 0 ? (
				<div className={styles.empty}>
					{tab === 'visita'
						? 'No hay pedidos de estudios para esta internación.'
						: 'No hay pedidos pendientes para este servicio.'}
				</div>
			) : (
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Urg.</th>
								<th>Estado</th>
								<th>Fecha / hora</th>
								<th>Cód.</th>
								<th>Práctica solicitada</th>
								<th>Notas</th>
								<th>Solicitado por</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{list.map((r) => (
								<tr
									key={r.IdPedido}
									className={styles.clickableRow}
									onClick={() => void handleRowClick(r)}
									title="Ver detalle"
								>
									<td>
										<span
											className={`${styles.urgencia} ${urgenciaClass(r.EstadoUrgencia)}`}
											title={r.EstadoUrgencia || 'Sin urgencia'}
										/>
									</td>
									<td className={styles.meta}>
										{r.Cumplido
											? 'Cumplido'
											: r.Tomado
												? `Tomado${r.NombreToma ? ` · ${r.NombreToma}` : ''}`
												: 'Pendiente'}
									</td>
									<td className={styles.meta}>{formatFecha(r)}</td>
									<td className={styles.codigo}>{r.CodigoPractica ?? '—'}</td>
									<td>
										<div className={styles.practica}>{r.PracticaSolicitada}</div>
										{(r.ServicioDescripcion || r.SectorReceptorNombre) && (
											<div className={styles.meta}>
												Destino: {r.ServicioDescripcion || r.SectorReceptorNombre}
											</div>
										)}
									</td>
									<td className={styles.notas}>
										{r.NotasObservacion
											? r.NotasObservacion.length > 120
												? `${r.NotasObservacion.slice(0, 120)}…`
												: r.NotasObservacion
											: '—'}
									</td>
									<td className={styles.meta}>{r.MedicoSolicitanteNombre || '—'}</td>
									<td>
										{!r.Cumplido && puedeCrear && tab === 'pendientes' && (
											<div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
												{!r.Tomado && (
													<button
														type="button"
														className={formStyles.btnPrimary}
														disabled={busyId === r.IdPedido}
														onClick={(e) => {
															e.stopPropagation();
															void onTomar(r);
														}}
													>
														Tomar
													</button>
												)}
												{r.Tomado && esMio(r) && (
													<>
														<button
															type="button"
															className={formStyles.btnPrimary}
															disabled={busyId === r.IdPedido}
															onClick={(e) => {
																e.stopPropagation();
																setCumplirPedido(r);
															}}
														>
															Cumplir
														</button>
														<button
															type="button"
															className={formStyles.btnSecondary}
															disabled={busyId === r.IdPedido}
															onClick={(e) => {
																e.stopPropagation();
																void onLiberar(r);
															}}
														>
															Liberar
														</button>
													</>
												)}
												{r.Tomado && !esMio(r) && (
													<span className={styles.meta}>En curso</span>
												)}
											</div>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{selected && (
				<PedidoDetalleModal
					title={selected.PracticaSolicitada || 'Pedido de estudio'}
					urgencia={selected.EstadoUrgencia}
					fields={buildEstudioFields(selected)}
					textBlocks={[
						{ label: 'Notas / observación', value: selected.NotasObservacion },
						...(selected.Cumplido
							? [{ label: 'Resultado', value: selected.TextoResultado || '(sin texto)' }]
							: []),
					]}
					onClose={() => setSelected(null)}
				/>
			)}

			{showSolicitar && sectorSolicitante && (
				<SolicitarEstudioModal
					open={showSolicitar}
					idVisita={numeroVisita}
					sectorSolicitante={sectorSolicitante}
					onClose={() => setShowSolicitar(false)}
					onCreated={() => {
						setTab('visita');
						void loadVisita();
					}}
				/>
			)}

			<CumplirEstudioModal
				open={!!cumplirPedido}
				pedido={cumplirPedido}
				sectorServicio={sectorBandeja || undefined}
				onClose={() => setCumplirPedido(null)}
				onCumplido={() => {
					void loadPendientes();
					void loadVisita();
				}}
			/>
		</div>
	);
}
