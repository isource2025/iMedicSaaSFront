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
import { getIdSectorFromToken } from '@/app/utils/jwtSession';

type Props = {
	open: boolean;
	pedido: PedidoEstudio | null;
	sectorServicio?: string;
	modoEdicion?: boolean;
	guardarInforme?: (texto: string) => Promise<void>;
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
	modoEdicion = false,
	guardarInforme,
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
		if (!open || !pedido) return;
		// Init al abrir/cambiar pedido (no resetear si el padre refresca TextoResultado).
		setTexto(modoEdicion ? String(pedido.TextoResultado || '') : '');
		setError(null);
		setArchivos([]);
		setTipoImagen('');
		const nombreInicial = String(pedido.MedicoSolicitanteNombre || '').trim();
		setSolicitanteNombre(nombreInicial);
		const practica = (pedido.PracticaSolicitada || pedido.NomencladorDescripcion || '').trim();
		void adjuntosService
			.getTiposImagenes()
			.then((list) => {
				setTipos(list);
				setTipoImagen(sugerirTipoImagen(list, practica));
			})
			.catch(() => setTipos([]));
	}, [open, modoEdicion, pedido?.IdPedido]);

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
			if (guardarInforme) {
				await guardarInforme(texto.trim());
				if (archivos.length > 0 && pedido.IdVisita > 0) {
					await adjuntosService.subirArchivos(pedido.IdVisita, archivos, tipoImagen.trim());
				}
				onCumplido(pedido);
			} else if (modoEdicion) {
				const updated = await estudiosService.actualizarResultado(pedido.IdPedido, {
					textoInforme: texto.trim(),
				});
				if (archivos.length > 0 && pedido.IdVisita > 0) {
					await adjuntosService.subirArchivos(pedido.IdVisita, archivos, tipoImagen.trim());
				}
				onCumplido(updated);
			} else {
				const updated = await estudiosService.cumplir(pedido.IdPedido, {
					textoInforme: texto.trim(),
					sectorServicio:
						getIdSectorFromToken() || sectorServicio || pedido.SectorReceptor || undefined,
				});
				if (archivos.length > 0 && pedido.IdVisita > 0) {
					await adjuntosService.subirArchivos(pedido.IdVisita, archivos, tipoImagen.trim());
				}
				onCumplido(updated);
			}
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
					<h3>{modoEdicion ? 'Editar informe' : 'Completar'} · {practica}</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}

					<PacientePedidoHeader paciente={pedido} idVisita={pedido.IdVisita} />

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
						Tu {modoEdicion ? 'informe / resultado (edición)' : 'informe / resultado'}
						<textarea
							className={formStyles.textarea}
							value={texto}
							onChange={(e) => setTexto(e.target.value)}
							rows={8}
							placeholder={
								modoEdicion
									? 'Actualizá el resultado…'
									: 'Redacte el resultado del estudio…'
							}
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
							{submitting ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Completar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
