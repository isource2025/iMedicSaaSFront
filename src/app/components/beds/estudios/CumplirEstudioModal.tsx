'use client';

import { useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import type { PedidoEstudio } from '@/app/types/estudios';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from './PedidoEstudioForms.module.css';

type Props = {
	open: boolean;
	pedido: PedidoEstudio | null;
	sectorServicio?: string;
	onClose: () => void;
	onCumplido: (pedido: PedidoEstudio) => void;
};

export default function CumplirEstudioModal({
	open,
	pedido,
	sectorServicio,
	onClose,
	onCumplido,
}: Props) {
	const [texto, setTexto] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTexto('');
		setError(null);
	}, [open, pedido?.IdPedido]);

	if (!open || !pedido) return null;

	const submit = async () => {
		if (!texto.trim()) {
			setError('Ingrese el informe / resultado');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const updated = await estudiosService.cumplir(pedido.IdPedido, {
				textoInforme: texto.trim(),
				sectorServicio: sectorServicio || pedido.SectorReceptor || undefined,
			});
			onCumplido(updated);
			onClose();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al cumplir');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>Cumplir pedido · {pedido.PracticaSolicitada}</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}
					<p className={formStyles.hint}>
						Visita {pedido.IdVisita}
						{pedido.MedicoSolicitanteNombre
							? ` · Solicitado por ${pedido.MedicoSolicitanteNombre}`
							: ''}
						{pedido.NotasObservacion ? ` · Notas: ${pedido.NotasObservacion}` : ''}
					</p>
					<label className={formStyles.label}>
						Informe / resultado
						<textarea
							className={formStyles.textarea}
							value={texto}
							onChange={(e) => setTexto(e.target.value)}
							rows={10}
							placeholder="Redacte el resultado del estudio…"
						/>
					</label>
					<div className={formStyles.actions}>
						<button type="button" className={formStyles.btnSecondary} onClick={onClose} disabled={submitting}>
							Cancelar
						</button>
						<button type="button" className={formStyles.btnPrimary} onClick={() => void submit()} disabled={submitting}>
							{submitting ? 'Guardando…' : 'Cumplir y facturar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
