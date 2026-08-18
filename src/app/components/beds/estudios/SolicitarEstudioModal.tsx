'use client';

import { useEffect, useMemo, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import type {
	PedidoEstudio,
	SectorReceptorEstudio,
	TipoPedidoEstudio,
} from '@/app/types/estudios';
import { resolveReceptorPorTipo } from '@/app/utils/resolveSectorReceptor';
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
	const [term, setTerm] = useState('');
	const [tipos, setTipos] = useState<TipoPedidoEstudio[]>([]);
	const [loadingTipos, setLoadingTipos] = useState(false);
	const [tipo, setTipo] = useState<TipoPedidoEstudio | null>(null);
	const [sectores, setSectores] = useState<SectorReceptorEstudio[]>([]);
	const [idSectorReceptor, setIdSectorReceptor] = useState('');
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
			setIdSectorReceptor(String(pedido.SectorReceptor || '').trim());
			setUrgencia(urgenciaDePedido(pedido.EstadoUrgencia));
			setNotas(pedido.NotasObservacion || '');
		} else {
			setTipo(null);
			setIdSectorReceptor('');
			setUrgencia('Normal');
			setNotas('');
		}
		void estudiosService.listarSectoresReceptor().then(setSectores).catch(() => setSectores([]));
	}, [open, pedido]);

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

	const sectorAuto = useMemo(() => {
		if (!tipo || !sectores.length) return '';
		return resolveReceptorPorTipo(tipo, sectores);
	}, [tipo, sectores]);

	useEffect(() => {
		if (sectorAuto && !idSectorReceptor) setIdSectorReceptor(sectorAuto);
	}, [sectorAuto, idSectorReceptor]);

	if (!open) return null;

	const submit = async () => {
		if (!tipo) {
			setError('Seleccione un tipo de estudio');
			return;
		}
		if (!idSectorReceptor.trim()) {
			setError('Seleccione el servicio receptor');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const payload = {
				idTipoPedido: tipo.idTipoPedido,
				idPractica: tipo.idPractica,
				idSectorReceptor: idSectorReceptor.trim(),
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

					<label className={formStyles.label}>
						Tipo de estudio
						{tipo ? (
							<div className={formStyles.selectedTipo}>
								<span>
									<strong>{tipo.descripcion}</strong> · {tipo.idPractica}
								</span>
								<button type="button" onClick={() => setTipo(null)}>
									Cambiar
								</button>
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
						Servicio receptor
						<select
							className={formStyles.input}
							value={idSectorReceptor}
							onChange={(e) => setIdSectorReceptor(e.target.value)}
						>
							<option value="">Seleccionar…</option>
							{sectores.map((s) => (
								<option key={s.valor} value={s.valor}>
									{s.descripcion} ({s.valor})
								</option>
							))}
						</select>
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
						<button type="button" className={formStyles.btnPrimary} onClick={() => void submit()} disabled={submitting}>
							{submitting ? 'Guardando…' : editando ? 'Guardar' : 'Solicitar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
