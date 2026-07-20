'use client';

import { useCallback, useEffect, useState } from 'react';
import {
	interconsultasService,
	type InterconsultaRow,
	type SectorDestinoInterconsulta,
} from '@/app/services/interconsultasService';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import PedidoDetalleModal from '@/app/components/beds/shared/PedidoDetalleModal';
import formStyles from '@/app/components/beds/estudios/PedidoEstudioForms.module.css';
import styles from '@/app/components/beds/estudios/EstudiosSection.module.css';
import modalStyles from '@/app/components/beds/shared/PedidoDetalleModal.module.css';
import icStyles from '@/app/components/beds/interconsulta/InterconsultaSection.module.css';

type Props = {
	open: boolean;
	onClose: () => void;
	sectorInicial?: string | null;
};

function formatFecha(row: InterconsultaRow) {
	return [row.FechaSolicitud, row.HoraSolicitud].filter(Boolean).join(' ');
}

export default function AgendaInterconsultasBandeja({ open, onClose, sectorInicial }: Props) {
	const usuario = useUsuarioActual();
	const matriculaSesion = usuario?.matricula ?? null;
	const [sectores, setSectores] = useState<SectorDestinoInterconsulta[]>([]);
	const [sector, setSector] = useState('');
	const [rows, setRows] = useState<InterconsultaRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [busyId, setBusyId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<InterconsultaRow | null>(null);
	const [cumplirRow, setCumplirRow] = useState<InterconsultaRow | null>(null);
	const [respuesta, setRespuesta] = useState('');

	useEffect(() => {
		if (!open) return;
		void interconsultasService.listarSectoresDestino().then((list) => {
			setSectores(list);
			const init = String(sectorInicial || '').trim();
			if (init && list.some((s) => s.valor === init)) setSector(init);
			else if (list.find((s) => s.valor === 'OFT')) setSector('OFT');
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
			setRows(await interconsultasService.listarPendientes(sector.trim()));
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

	const pedidoId = (r: InterconsultaRow) => r.IdPedido || r.IdInterconsulta;

	const esMio = (r: InterconsultaRow) =>
		matriculaSesion != null &&
		r.MatriculaToma != null &&
		Number(r.MatriculaToma) === Number(matriculaSesion);

	const onTomar = async (r: InterconsultaRow) => {
		const id = pedidoId(r);
		setBusyId(id);
		setError(null);
		try {
			await interconsultasService.tomar(id);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo tomar');
		} finally {
			setBusyId(null);
		}
	};

	const onLiberar = async (r: InterconsultaRow) => {
		const id = pedidoId(r);
		setBusyId(id);
		setError(null);
		try {
			await interconsultasService.liberar(id);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo liberar');
		} finally {
			setBusyId(null);
		}
	};

	const onCumplir = async () => {
		if (!cumplirRow || !respuesta.trim()) return;
		const id = pedidoId(cumplirRow);
		setBusyId(id);
		setError(null);
		try {
			await interconsultasService.cumplir(id, respuesta.trim());
			setCumplirRow(null);
			setRespuesta('');
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo cumplir');
		} finally {
			setBusyId(null);
		}
	};

	if (!open) return null;

	return (
		<div className={modalStyles.modalOverlay} onClick={onClose}>
			<div
				className={modalStyles.modalContent}
				style={{ maxWidth: 900, width: '96vw', maxHeight: '90vh', overflow: 'auto' }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={modalStyles.modalHeader}>
					<h3>Interconsultas pendientes · Agenda</h3>
					<button type="button" className={modalStyles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>

				<label className={formStyles.label}>
					Servicio receptor
					<select
						className={formStyles.input}
						value={sector}
						onChange={(e) => setSector(e.target.value)}
					>
						{sectores.map((s) => (
							<option key={s.valor} value={s.valor}>
								{s.descripcion} ({s.valor})
							</option>
						))}
					</select>
				</label>

				{error && <div className={formStyles.error}>{error}</div>}

				{loading ? (
					<p className={styles.empty}>Cargando…</p>
				) : rows.length === 0 ? (
					<p className={styles.empty}>No hay interconsultas pendientes para este servicio.</p>
				) : (
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Fecha</th>
									<th>Visita</th>
									<th>Motivo</th>
									<th>Solicitado por</th>
									<th>Estado</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => {
									const id = pedidoId(r);
									const tomado = !!r.Tomado;
									return (
										<tr key={id} className={styles.clickableRow} onClick={() => setSelected(r)}>
											<td>{formatFecha(r)}</td>
											<td>{r.IdVisita}</td>
											<td className={styles.practica}>
												{(r.Motivo || '').slice(0, 80)}
												{(r.Motivo || '').length > 80 ? '…' : ''}
											</td>
											<td>{r.MedicoSolicitanteNombre || '—'}</td>
											<td>{r.EstadoWorkflow || (tomado ? 'Tomado' : 'Pendiente')}</td>
											<td onClick={(e) => e.stopPropagation()}>
												{!tomado && (
													<button
														type="button"
														className={formStyles.btnPrimary}
														disabled={busyId === id}
														onClick={() => void onTomar(r)}
													>
														Tomar
													</button>
												)}
												{tomado && esMio(r) && (
													<>
														<button
															type="button"
															className={formStyles.btnPrimary}
															disabled={busyId === id}
															onClick={() => {
																setCumplirRow(r);
																setRespuesta('');
															}}
														>
															Responder
														</button>{' '}
														<button
															type="button"
															className={formStyles.btnSecondary}
															disabled={busyId === id}
															onClick={() => void onLiberar(r)}
														>
															Liberar
														</button>
													</>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}

				{selected && (
					<PedidoDetalleModal
						title={selected.ServicioDescripcion || selected.Especialidad || 'Interconsulta'}
						urgencia={selected.EstadoUrgencia}
						fields={[
							{ label: 'Fecha', value: formatFecha(selected) },
							{ label: 'Visita', value: selected.IdVisita },
							{ label: 'Solicitado por', value: selected.MedicoSolicitanteNombre },
							{ label: 'Destino', value: selected.ServicioDescripcion || selected.SectorReceptor },
							{ label: 'Estado', value: selected.EstadoWorkflow || selected.Estado },
						]}
						textBlocks={[{ label: 'Motivo', value: selected.Motivo }]}
						onClose={() => setSelected(null)}
					/>
				)}

				{cumplirRow && (
					<div className={icStyles.modalOverlay} onClick={() => setCumplirRow(null)}>
						<div className={icStyles.modalContent} onClick={(e) => e.stopPropagation()}>
							<h3>Responder interconsulta</h3>
							<label className={icStyles.formLabel}>
								Respuesta / informe
								<textarea
									value={respuesta}
									onChange={(e) => setRespuesta(e.target.value)}
									rows={6}
								/>
							</label>
							<div className={icStyles.modalActions}>
								<button
									type="button"
									className={icStyles.actionBtnSecondary}
									onClick={() => setCumplirRow(null)}
								>
									Cancelar
								</button>
								<button
									type="button"
									className={icStyles.primaryBtn}
									disabled={!respuesta.trim()}
									onClick={() => void onCumplir()}
								>
									Guardar
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
