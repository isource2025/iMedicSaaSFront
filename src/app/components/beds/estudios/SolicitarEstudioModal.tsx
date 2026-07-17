'use client';

import { useEffect, useMemo, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import type { SectorReceptorEstudio, TipoPedidoEstudio } from '@/app/types/estudios';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from './PedidoEstudioForms.module.css';

type Urgencia = 'Normal' | 'Medio' | 'Urgente';

type Props = {
	open: boolean;
	sectorSolicitante: string;
	idVisita: number;
	onClose: () => void;
	onCreated: () => void;
};

export default function SolicitarEstudioModal({
	open,
	sectorSolicitante,
	idVisita,
	onClose,
	onCreated,
}: Props) {
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
		setTipo(null);
		setIdSectorReceptor('');
		setUrgencia('Normal');
		setNotas('');
		setError(null);
		void estudiosService.listarSectoresReceptor().then(setSectores).catch(() => setSectores([]));
	}, [open]);

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
		const pref = String(tipo.idPractica || '').padStart(2, '0').slice(0, 2);
		const match = sectores.find((s) => s.prefijos.some((p) => p === pref));
		return match?.valor || '';
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
			await estudiosService.crear({
				idVisita,
				sectorSolicitante,
				idTipoPedido: tipo.idTipoPedido,
				idSectorReceptor: idSectorReceptor.trim(),
				notas: notas.trim() || undefined,
				estadoUrgencia: urgencia,
			});
			onCreated();
			onClose();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al solicitar');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>Solicitar estudio</h3>
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
											<li key={t.idTipoPedido}>
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
							{submitting ? 'Guardando…' : 'Solicitar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
