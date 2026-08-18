'use client';

import { useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { adjuntosService } from '@/app/services/adjuntosService';
import type { PedidoEstudio } from '@/app/types/estudios';
import type { TipoImagenHC } from '@/app/types/adjuntos';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from './PedidoEstudioForms.module.css';
import PedidoAdjuntosField, { sugerirTipoImagen } from './PedidoAdjuntosField';
import PacientePedidoHeader from './PacientePedidoHeader';

type Props = {
	open: boolean;
	pedido: PedidoEstudio | null;
	sectorServicio?: string;
	onClose: () => void;
	onCumplido: (pedido: PedidoEstudio) => void;
};

function formatCuando(iso?: string | null, hora?: string | null) {
	const raw = String(iso || '').trim();
	const h = String(hora || '').trim();
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
	const fecha = m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
	return [fecha, h].filter(Boolean).join(' · ');
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
	const [solicitanteNombre, setSolicitanteNombre] = useState('');

	useEffect(() => {
		if (!open) return;
		setTexto('');
		setError(null);
		setArchivos([]);
		setTipoImagen('');
		const nombreInicial = String(pedido?.MedicoSolicitanteNombre || '').trim();
		setSolicitanteNombre(nombreInicial);
		const practica = (pedido?.PracticaSolicitada || pedido?.NomencladorDescripcion || '').trim();
		void adjuntosService
			.getTiposImagenes()
			.then((list) => {
				setTipos(list);
				setTipoImagen(sugerirTipoImagen(list, practica));
			})
			.catch(() => setTipos([]));
	}, [open, pedido?.IdPedido, pedido?.PracticaSolicitada, pedido?.NomencladorDescripcion, pedido?.MedicoSolicitanteNombre]);

	if (!open || !pedido) return null;

	const practica =
		(pedido.PracticaSolicitada || pedido.NomencladorDescripcion || '').trim() ||
		`Pedido #${pedido.IdPedido}`;
	const mensaje = (pedido.NotasObservacion || '').trim();
	const quien = solicitanteNombre || String(pedido.MedicoSolicitanteNombre || '').trim();
	const origen = (pedido.SectorSolicitanteNombre || pedido.SectorSolicitante || '').trim();
	const cuando = formatCuando(pedido.FechaPedidoISO, pedido.HoraPedido);
	const metaSolicitud = [origen ? `desde ${origen}` : '', cuando].filter(Boolean).join(' · ');

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
					<h3>Completar · {practica}</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}

					<PacientePedidoHeader
						nombre={pedido.PacienteNombre}
						documento={pedido.PacienteDocumento}
						sexo={pedido.PacienteSexo}
						sexoDescripcion={pedido.PacienteSexoDescripcion}
						tipoAtencion={pedido.TipoAtencion}
						ubicacion={pedido.Ubicacion}
						idVisita={pedido.IdVisita}
						obraSocial={pedido.ObraSocial}
					/>

					<div className={formStyles.solicitudBox}>
						<strong className={formStyles.solicitudDe}>
							{quien ? `Solicitud de ${quien}` : 'Solicitud del profesional'}
						</strong>
						{metaSolicitud ? (
							<span className={formStyles.solicitudMeta}>{metaSolicitud}</span>
						) : null}
						{mensaje ? (
							<blockquote className={formStyles.solicitudQuote}>{mensaje}</blockquote>
						) : (
							<p className={formStyles.solicitudEmpty}>No dejó observaciones en el pedido.</p>
						)}
					</div>

					<label className={`${formStyles.label} ${formStyles.informeLabel}`}>
						Tu informe / resultado
						<textarea
							className={formStyles.textarea}
							value={texto}
							onChange={(e) => setTexto(e.target.value)}
							rows={8}
							placeholder="Redacte el resultado del estudio…"
						/>
					</label>

					<PedidoAdjuntosField
						tipos={tipos}
						tipoImagen={tipoImagen}
						onTipoChange={setTipoImagen}
						archivos={archivos}
						onArchivosChange={setArchivos}
						disabled={submitting}
						idVisita={pedido.IdVisita}
					/>

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
