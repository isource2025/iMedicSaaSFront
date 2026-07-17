'use client';

import { useCallback, useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import type { PedidoEstudio, SectorReceptorEstudio } from '@/app/types/estudios';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import CumplirEstudioModal from '@/app/components/beds/estudios/CumplirEstudioModal';
import PedidoDetalleModal from '@/app/components/beds/shared/PedidoDetalleModal';
import formStyles from '@/app/components/beds/estudios/PedidoEstudioForms.module.css';
import styles from '@/app/components/beds/estudios/EstudiosSection.module.css';
import modalStyles from '@/app/components/beds/shared/PedidoDetalleModal.module.css';

type Props = {
	open: boolean;
	onClose: () => void;
	sectorInicial?: string | null;
};

function formatFecha(row: PedidoEstudio) {
	const f = row.FechaPedidoISO || '';
	const h = row.HoraPedido || '';
	return [f, h].filter(Boolean).join(' ');
}

export default function AgendaPedidosEstudiosBandeja({ open, onClose, sectorInicial }: Props) {
	const usuario = useUsuarioActual();
	const matriculaSesion = usuario?.matricula ?? null;
	const [sectores, setSectores] = useState<SectorReceptorEstudio[]>([]);
	const [sector, setSector] = useState('');
	const [rows, setRows] = useState<PedidoEstudio[]>([]);
	const [loading, setLoading] = useState(false);
	const [busyId, setBusyId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<PedidoEstudio | null>(null);
	const [cumplirPedido, setCumplirPedido] = useState<PedidoEstudio | null>(null);

	useEffect(() => {
		if (!open) return;
		void estudiosService.listarSectoresReceptor().then((list) => {
			setSectores(list);
			const init = String(sectorInicial || '').trim();
			if (init) setSector(init);
			else if (list[0]?.valor) setSector(list[0].valor);
		});
	}, [open, sectorInicial]);

	const load = useCallback(async () => {
		if (!sector.trim()) {
			setRows([]);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			setRows(await estudiosService.listarPendientes(sector.trim()));
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [sector]);

	useEffect(() => {
		if (open) void load();
	}, [open, load]);

	const esMio = (r: PedidoEstudio) =>
		matriculaSesion != null &&
		r.MatriculaToma != null &&
		Number(r.MatriculaToma) === Number(matriculaSesion);

	const onTomar = async (r: PedidoEstudio) => {
		setBusyId(r.IdPedido);
		setError(null);
		try {
			await estudiosService.tomar(r.IdPedido);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo tomar');
		} finally {
			setBusyId(null);
		}
	};

	const onLiberar = async (r: PedidoEstudio) => {
		setBusyId(r.IdPedido);
		setError(null);
		try {
			await estudiosService.liberar(r.IdPedido);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo liberar');
		} finally {
			setBusyId(null);
		}
	};

	if (!open) return null;

	return (
		<div className={modalStyles.modalOverlay} onClick={onClose}>
			<div
				className={modalStyles.modalContent}
				style={{ width: 'min(960px, 100%)' }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={modalStyles.modalHeader}>
					<h3>Pedidos de estudios · bandeja (Agenda)</h3>
					<button type="button" className={modalStyles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={modalStyles.modalBody}>
					<label className={formStyles.label}>
						Servicio receptor
						<select
							className={formStyles.input}
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

					{error && <div className={formStyles.error}>{error}</div>}
					{loading ? (
						<p className={formStyles.hint}>Cargando…</p>
					) : rows.length === 0 ? (
						<p className={styles.empty}>No hay pedidos pendientes para este servicio.</p>
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
										<th></th>
									</tr>
								</thead>
								<tbody>
									{rows.map((r) => (
										<tr key={r.IdPedido} className={styles.clickableRow}>
											<td className={styles.meta}>
												{r.Tomado
													? `Tomado${r.NombreToma ? ` · ${r.NombreToma}` : ''}`
													: 'Libre'}
											</td>
											<td className={styles.meta}>{formatFecha(r)}</td>
											<td className={styles.meta}>{r.IdVisita}</td>
											<td>
												<button
													type="button"
													style={{
														border: 'none',
														background: 'transparent',
														padding: 0,
														textAlign: 'left',
														cursor: 'pointer',
														font: 'inherit',
														color: 'inherit',
													}}
													onClick={() =>
														void estudiosService
															.obtenerPorId(r.IdPedido)
															.then((d) => setSelected(d || r))
													}
												>
													<div className={styles.practica}>{r.PracticaSolicitada}</div>
													<div className={styles.meta}>Cód. {r.CodigoPractica}</div>
												</button>
											</td>
											<td className={styles.meta}>{r.MedicoSolicitanteNombre || '—'}</td>
											<td className={styles.meta}>{r.EstadoUrgencia || '—'}</td>
											<td>
												<div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
													{!r.Tomado && (
														<button
															type="button"
															className={formStyles.btnPrimary}
															disabled={busyId === r.IdPedido}
															onClick={() => void onTomar(r)}
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
																onClick={() => setCumplirPedido(r)}
															>
																Cumplir
															</button>
															<button
																type="button"
																className={formStyles.btnSecondary}
																disabled={busyId === r.IdPedido}
																onClick={() => void onLiberar(r)}
															>
																Liberar
															</button>
														</>
													)}
													{r.Tomado && !esMio(r) && (
														<span className={styles.meta}>En curso</span>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{selected && (
				<PedidoDetalleModal
					title={selected.PracticaSolicitada || 'Pedido'}
					urgencia={selected.EstadoUrgencia}
					fields={[
						{ label: 'Visita', value: selected.IdVisita },
						{ label: 'Fecha', value: formatFecha(selected) },
						{ label: 'Solicitante', value: selected.MedicoSolicitanteNombre },
						{ label: 'Tomado por', value: selected.NombreToma },
						{ label: 'Destino', value: selected.ServicioDescripcion || selected.SectorReceptor },
						{ label: 'Notas', value: selected.NotasObservacion, full: true },
					]}
					onClose={() => setSelected(null)}
				/>
			)}

			<CumplirEstudioModal
				open={!!cumplirPedido}
				pedido={cumplirPedido}
				sectorServicio={sector || undefined}
				onClose={() => setCumplirPedido(null)}
				onCumplido={() => void load()}
			/>
		</div>
	);
}
