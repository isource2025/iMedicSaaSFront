'use client';

import { useEffect, useState } from 'react';
import {
	interconsultasService,
	SectorDestinoInterconsulta,
} from '@/app/services/interconsultasService';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from '../estudios/PedidoEstudioForms.module.css';

type Urgencia = 'Normal' | 'Medio' | 'Urgente';

type Props = {
	open: boolean;
	idVisita: number;
	sectorSolicitante?: string | null;
	onClose: () => void;
	onCreated: () => void;
};

export default function SolicitarInterconsultaModal({
	open,
	idVisita,
	sectorSolicitante,
	onClose,
	onCreated,
}: Props) {
	const [sectores, setSectores] = useState<SectorDestinoInterconsulta[]>([]);
	const [idSectorReceptor, setIdSectorReceptor] = useState('');
	const [urgencia, setUrgencia] = useState<Urgencia>('Normal');
	const [motivo, setMotivo] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setIdSectorReceptor('');
		setUrgencia('Normal');
		setMotivo('');
		setError(null);
		void interconsultasService
			.listarSectoresDestino()
			.then(setSectores)
			.catch(() => setSectores([]));
	}, [open]);

	if (!open) return null;

	const submit = async () => {
		if (!idSectorReceptor.trim()) {
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
			await interconsultasService.crear({
				idVisita,
				idSectorReceptor: idSectorReceptor.trim(),
				sectorSolicitante: sectorSolicitante || undefined,
				motivo: motivo.trim(),
				estadoUrgencia: urgencia,
			});
			onCreated();
			onClose();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al registrar');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>Solicitar interconsulta</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}

					<label className={formStyles.label}>
						Servicio destino
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
							disabled={submitting}
						>
							{submitting ? 'Guardando…' : 'Solicitar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
