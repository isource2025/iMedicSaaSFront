'use client';

import { useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { adjuntosService } from '@/app/services/adjuntosService';
import type { PedidoEstudio } from '@/app/types/estudios';
import type { TipoImagenHC } from '@/app/types/adjuntos';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from './PedidoEstudioForms.module.css';

type Props = {
	open: boolean;
	pedido: PedidoEstudio | null;
	sectorServicio?: string;
	onClose: () => void;
	onCumplido: (pedido: PedidoEstudio) => void;
};

function sexoIcon(sexo?: string | null) {
	const s = String(sexo || '').trim().toUpperCase();
	if (s === 'F' || s.includes('FEM')) return '♀';
	if (s === 'M' || s.includes('MASC')) return '♂';
	return '·';
}

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
	const [archivos, setArchivos] = useState<File[]>([]);
	const [tipos, setTipos] = useState<TipoImagenHC[]>([]);
	const [tipoImagen, setTipoImagen] = useState('');

	useEffect(() => {
		if (!open) return;
		setTexto('');
		setError(null);
		setArchivos([]);
		setTipoImagen('');
		void adjuntosService
			.getTiposImagenes()
			.then((list) => {
				setTipos(list);
				setTipoImagen((prev) => prev || list[0]?.TipoImagen || '');
			})
			.catch(() => setTipos([]));
	}, [open, pedido?.IdPedido]);

	if (!open || !pedido) return null;

	const submit = async () => {
		if (!texto.trim()) {
			setError('Ingrese el informe / resultado');
			return;
		}
		if (archivos.length > 0 && !tipoImagen.trim()) {
			setError('Seleccioná el tipo de documento para los adjuntos');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const updated = await estudiosService.cumplir(pedido.IdPedido, {
				textoInforme: texto.trim(),
				sectorServicio: sectorServicio || pedido.SectorReceptor || undefined,
			});
			if (archivos.length > 0 && pedido.IdVisita > 0) {
				await adjuntosService.subirArchivos(pedido.IdVisita, archivos, tipoImagen.trim());
			}
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
					<h3>Completar · {pedido.PracticaSolicitada}</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}
					<p className={formStyles.hint}>
						{pedido.PacienteNombre ? (
							<>
								<span aria-hidden>{sexoIcon(pedido.PacienteSexo || pedido.PacienteSexoDescripcion)}</span>{' '}
								<strong>{pedido.PacienteNombre}</strong>
								{pedido.PacienteDocumento ? ` · Doc. ${pedido.PacienteDocumento}` : ''}
								<br />
							</>
						) : null}
						Visita {pedido.IdVisita}
						{pedido.ObraSocial ? ` · ${pedido.ObraSocial}` : ''}
						{pedido.TipoAtencion === 'INTERNADO' && pedido.Ubicacion
							? ` · Internado · ${pedido.Ubicacion}`
							: pedido.TipoAtencion === 'AMBULATORIO'
								? ' · Ambulatorio'
								: ''}
						{pedido.MedicoSolicitanteNombre
							? ` · Solicitó ${pedido.MedicoSolicitanteNombre}`
							: ''}
						{pedido.SectorSolicitanteNombre || pedido.SectorSolicitante
							? ` (${pedido.SectorSolicitanteNombre || pedido.SectorSolicitante})`
							: ''}
					</p>
					<label className={formStyles.label}>
						Informe / resultado
						<textarea
							className={formStyles.textarea}
							value={texto}
							onChange={(e) => setTexto(e.target.value)}
							rows={8}
							placeholder="Redacte el resultado del estudio…"
						/>
					</label>
					<div className={formStyles.label}>
						Adjuntar archivo (documentos del paciente)
						{tipos.length > 0 ? (
							<select
								className={formStyles.input}
								value={tipoImagen}
								onChange={(e) => setTipoImagen(e.target.value)}
								disabled={submitting}
								style={{ marginTop: '0.35rem', marginBottom: '0.5rem' }}
							>
								{tipos.map((t) => (
									<option key={t.TipoImagen} value={t.TipoImagen}>
										{t.DescTipoImagen || t.TipoImagen}
									</option>
								))}
							</select>
						) : null}
						<input
							type="file"
							multiple
							disabled={submitting}
							onChange={(e) => setArchivos(Array.from(e.target.files || []))}
						/>
						{archivos.length > 0 ? (
							<p className={formStyles.hint} style={{ marginTop: '0.35rem' }}>
								{archivos.length} archivo(s) listo(s) para subir a la visita {pedido.IdVisita}
							</p>
						) : null}
					</div>
					<div className={formStyles.actions}>
						<button type="button" className={formStyles.btnSecondary} onClick={onClose} disabled={submitting}>
							Cancelar
						</button>
						<button type="button" className={formStyles.btnPrimary} onClick={() => void submit()} disabled={submitting}>
							{submitting ? 'Guardando…' : 'Completar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
