'use client';

import { useEffect, useState } from 'react';
import {
	interconsultasService,
	type InterconsultaRow,
} from '@/app/services/interconsultasService';
import { useSectoresReceptor } from '@/app/hooks/useSectoresReceptor';
import { resolveServicioDestinoEnLista } from '@/app/utils/resolveSectorReceptor';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from '../estudios/PedidoEstudioForms.module.css';

type Urgencia = 'Normal' | 'Medio' | 'Urgente';

function urgenciaDePedido(estado?: string | null): Urgencia {
	const v = String(estado || '').trim().toLowerCase();
	if (v.includes('urgent')) return 'Urgente';
	if (v.includes('medio')) return 'Medio';
	return 'Normal';
}

function pedidoBloqueado(pedido: InterconsultaRow) {
	return (
		!!pedido.Cumplido ||
		!!pedido.Tomado ||
		(pedido.IdProtocolo != null && pedido.IdProtocolo > 0) ||
		!!pedido.Respuesta
	);
}

type Props = {
	open: boolean;
	idVisita: number;
	sectorSolicitante?: string | null;
	pedido?: InterconsultaRow | null;
	onClose: () => void;
	onCreated: () => void;
};

export default function SolicitarInterconsultaModal({
	open,
	idVisita,
	sectorSolicitante,
	pedido,
	onClose,
	onCreated,
}: Props) {
	const editando = Boolean(pedido?.IdPedido || pedido?.IdInterconsulta);
	const bloqueado = editando && pedido ? pedidoBloqueado(pedido) : false;
	const { servicios, loading: loadingServicios } = useSectoresReceptor({
		enabled: open,
		force: open,
	});
	const [idServicioDestino, setIdServicioDestino] = useState('');
	const [urgencia, setUrgencia] = useState<Urgencia>('Normal');
	const [motivo, setMotivo] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		if (pedido) {
			setUrgencia(urgenciaDePedido(pedido.EstadoUrgencia));
			setMotivo(pedido.Motivo || pedido.NotasObservacion || '');
		} else {
			setIdServicioDestino('');
			setUrgencia('Normal');
			setMotivo('');
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

	if (!open) return null;

	const submit = async () => {
		if (!idServicioDestino.trim()) {
			setError('Seleccione el servicio destino');
			return;
		}
		if (!motivo.trim()) {
			setError('Ingrese el motivo de la interconsulta');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			if (editando && pedido) {
				const id = Number(pedido.IdPedido || pedido.IdInterconsulta);
				await interconsultasService.actualizar(id, {
					idSectorReceptor: idServicioDestino.trim(),
					motivo: motivo.trim(),
					estadoUrgencia: urgencia,
				});
			} else {
				await interconsultasService.crear({
					idVisita,
					idSectorReceptor: idServicioDestino.trim(),
					sectorSolicitante: sectorSolicitante || undefined,
					motivo: motivo.trim(),
					estadoUrgencia: urgencia,
				});
			}
			onCreated();
			onClose();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : editando ? 'Error al guardar' : 'Error al registrar');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>{editando ? 'Editar interconsulta' : 'Solicitar interconsulta'}</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}
					{bloqueado ? (
						<p className={formStyles.hint}>
							Ya fue tomada o respondida: solo podés editar el motivo y la urgencia.
						</p>
					) : null}

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
						Motivo / consulta
						<textarea
							className={formStyles.textarea}
							value={motivo}
							onChange={(e) => setMotivo(e.target.value)}
							rows={4}
							placeholder="Motivo de la interconsulta…"
						/>
					</label>

					<div className={formStyles.actions}>
						<button
							type="button"
							className={formStyles.btnSecondary}
							onClick={onClose}
							disabled={submitting}
						>
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
