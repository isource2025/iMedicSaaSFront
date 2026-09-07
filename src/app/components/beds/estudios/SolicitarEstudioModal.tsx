'use client';

import { useEffect, useMemo, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import type { PedidoEstudio, TipoPedidoEstudio } from '@/app/types/estudios';
import { useSectoresReceptor } from '@/app/hooks/useSectoresReceptor';
import {
	resolveReceptorPorTipo,
	resolveServicioDestinoEnLista,
} from '@/app/utils/resolveSectorReceptor';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from './PedidoEstudioForms.module.css';

type Urgencia = 'Normal' | 'Medio' | 'Urgente';

function urgenciaDePedido(estado?: string | null): Urgencia {
	const v = String(estado || '').trim().toLowerCase();
	if (v.includes('urgent')) return 'Urgente';
	if (v.includes('medio')) return 'Medio';
	return 'Normal';
}

function tipoDePedido(pedido: PedidoEstudio): TipoPedidoEstudio | null {
	const idTipo = Number(pedido.IdTipoPedido) || 0;
	const idPractica = Number(pedido.CodigoPractica) || 0;
	if (idTipo <= 0 && idPractica <= 0) return null;
	return {
		idTipoPedido: idTipo,
		idPractica,
		descripcion: pedido.TipoPedidoDescripcion || pedido.PracticaSolicitada || '',
	};
}

function pedidoBloqueado(pedido: PedidoEstudio) {
	return !!(pedido.Cumplido || Number(pedido.IdProtocolo) > 0 || pedido.Tomado);
}

type Props = {
	open: boolean;
	sectorSolicitante: string;
	idVisita: number;
	pedido?: PedidoEstudio | null;
	onClose: () => void;
	onCreated: () => void;
};

export default function SolicitarEstudioModal({
	open,
	sectorSolicitante,
	idVisita,
	pedido,
	onClose,
	onCreated,
}: Props) {
	const editando = Boolean(pedido?.IdPedido);
	const bloqueado = editando && pedido ? pedidoBloqueado(pedido) : false;
	const [term, setTerm] = useState('');
	const [tipos, setTipos] = useState<TipoPedidoEstudio[]>([]);
	const [loadingTipos, setLoadingTipos] = useState(false);
	const [tipo, setTipo] = useState<TipoPedidoEstudio | null>(null);
	const { servicios, loading: loadingServicios } = useSectoresReceptor({
		enabled: open,
		force: open,
	});
	const [idServicioDestino, setIdServicioDestino] = useState('');
	const [urgencia, setUrgencia] = useState<Urgencia>('Normal');
	const [notas, setNotas] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTerm('');
		setTipos([]);
		setError(null);
		if (pedido) {
			setTipo(tipoDePedido(pedido));
			setUrgencia(urgenciaDePedido(pedido.EstadoUrgencia));
			setNotas(pedido.NotasObservacion || '');
		} else {
			setTipo(null);
			setIdServicioDestino('');
			setUrgencia('Normal');
			setNotas('');
		}
	}, [open, pedido]);

	useEffect(() => {
		if (!open || !pedido || !servicios.length) return;
		setIdServicioDestino(
			resolveServicioDestinoEnLista(
				pedido.SectorReceptor,
				servicios,
				pedido.ServicioCodigo,
			),
		);
	}, [open, pedido, servicios]);

	useEffect(() => {
		const t = term.trim();
		if (t.length < 2 || tipo) {
			setTipos([]);
			return;
		}
		let cancel = false;
		setLoadingTipos(true);
		const h = setTimeout(async () => {
			try {
				const rows = await estudiosService.buscarTipos(t, 25);
				if (!cancel) setTipos(rows);
			} catch {
				if (!cancel) setTipos([]);
			} finally {
				if (!cancel) setLoadingTipos(false);
			}
		}, 280);
		return () => {
			cancel = true;
			clearTimeout(h);
		};
	}, [term, tipo]);

	const servicioAuto = useMemo(() => {
		if (editando || !tipo || !servicios.length) return '';
		return resolveReceptorPorTipo(tipo, servicios);
	}, [editando, tipo, servicios]);

	useEffect(() => {
		if (servicioAuto && !idServicioDestino) setIdServicioDestino(servicioAuto);
	}, [servicioAuto, idServicioDestino]);

	if (!open) return null;

	const submit = async () => {
		if (!tipo) {
			setError('Seleccione un tipo de estudio');
			return;
		}
		if (!idServicioDestino.trim()) {
			setError('Seleccione el servicio destino');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const payload = {
				idTipoPedido: tipo.idTipoPedido,
				idPractica: tipo.idPractica,
				idSectorReceptor: idServicioDestino.trim(),
				notas: notas.trim() || undefined,
				estadoUrgencia: urgencia,
			};
			if (editando && pedido) {
				await estudiosService.actualizar(pedido.IdPedido, payload);
			} else {
				await estudiosService.crear({
					idVisita,
					sectorSolicitante,
					...payload,
				});
			}
			onCreated();
			onClose();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : editando ? 'Error al guardar' : 'Error al solicitar');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>{editando ? 'Editar estudio' : 'Solicitar estudio'}</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}
					{bloqueado ? (
						<p className={formStyles.hint}>
							Ya fue tomado o respondido: solo podés editar las notas y la urgencia.
						</p>
					) : null}

					<label className={formStyles.label}>
						Tipo de estudio
						{tipo ? (
							<div className={formStyles.selectedTipo}>
								<span>
									<strong>{tipo.descripcion}</strong> · {tipo.idPractica}
								</span>
								{!bloqueado ? (
									<button type="button" onClick={() => setTipo(null)}>
										Cambiar
									</button>
								) : null}
							</div>
						) : (
							<>
								<input
									className={formStyles.input}
									value={term}
									onChange={(e) => setTerm(e.target.value)}
									placeholder="Buscar por descripción o código…"
									autoComplete="off"
								/>
								{loadingTipos && <div className={formStyles.hint}>Buscando…</div>}
								{tipos.length > 0 && (
									<ul className={formStyles.results}>
										{tipos.map((t) => (
											<li key={`${t.idPractica}-${t.idTipoPedido}`}>
												<button
													type="button"
													onClick={() => {
														setTipo(t);
														setTerm('');
														setTipos([]);
													}}
												>
													{t.descripcion}
													<span>{t.idPractica}</span>
												</button>
											</li>
										))}
									</ul>
								)}
							</>
						)}
					</label>

					<label className={formStyles.label}>
						Servicio destino
						<select
							className={formStyles.input}
							value={idServicioDestino}
							onChange={(e) => setIdServicioDestino(e.target.value)}
							disabled={loadingServicios || bloqueado}
						>
							<option value="">
								{loadingServicios ? 'Cargando servicios…' : 'Seleccionar…'}
							</option>
							{idServicioDestino &&
								!servicios.some((s) => s.valor === idServicioDestino) && (
									<option value={idServicioDestino}>
										{idServicioDestino} (actual)
									</option>
								)}
							{servicios.map((s) => (
								<option key={s.valor} value={s.valor}>
									{s.descripcion} ({s.valor})
								</option>
							))}
						</select>
						{!loadingServicios && servicios.length === 0 ? (
							<div className={formStyles.hint}>
								No hay servicios en el catálogo. Configúrelos en Personal / Servicios.
							</div>
						) : null}
					</label>

					<label className={formStyles.label}>
						Urgencia
						<select
							className={formStyles.input}
							value={urgencia}
							onChange={(e) => setUrgencia(e.target.value as Urgencia)}
						>
							<option value="Normal">Normal</option>
							<option value="Medio">Medio</option>
							<option value="Urgente">Urgente</option>
						</select>
					</label>

					<label className={formStyles.label}>
						Indicaciones / notas
						<textarea
							className={formStyles.textarea}
							value={notas}
							onChange={(e) => setNotas(e.target.value)}
							rows={4}
							placeholder="Indicaciones clínicas (opcional)"
						/>
					</label>

					<div className={formStyles.actions}>
						<button type="button" className={formStyles.btnSecondary} onClick={onClose} disabled={submitting}>
							Cancelar
						</button>
						<button
							type="button"
							className={formStyles.btnPrimary}
							onClick={() => void submit()}
							disabled={
								submitting ||
								(!bloqueado && (loadingServicios || servicios.length === 0))
							}
						>
							{submitting ? 'Guardando…' : editando ? 'Guardar' : 'Solicitar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
