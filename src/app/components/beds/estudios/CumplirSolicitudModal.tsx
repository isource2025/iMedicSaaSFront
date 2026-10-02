'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import solicitudesEstudiosService from '@/app/services/solicitudesEstudiosService';
import { adjuntosService } from '@/app/services/adjuntosService';
import type { PedidoEstudio } from '@/app/types/estudios';
import type { SolicitudEstudio } from '@/app/types/solicitudesEstudios';
import type { TipoImagenHC } from '@/app/types/adjuntos';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from './PedidoEstudioForms.module.css';
import solStyles from './SolicitudesEstudios.module.css';
import PedidoAdjuntosField, { sugerirTipoImagen } from './PedidoAdjuntosField';
import PacientePedidoHeader from './PacientePedidoHeader';
import { getIdSectorFromToken } from '@/app/utils/jwtSession';

type Props = {
	open: boolean;
	solicitud: SolicitudEstudio | null;
	sectorServicio?: string;
	onClose: () => void;
	onCumplido: (solicitud: SolicitudEstudio) => void;
};

function formatCuando(iso?: string | null, hora?: string | null) {
	const raw = String(iso || '').trim();
	const h = String(hora || '').trim();
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
	const fecha = m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
	return [fecha, h].filter(Boolean).join(' · ');
}

const pendiente = (it: PedidoEstudio) => !(it.Cumplido || Number(it.IdProtocolo) > 0);
const nombreItem = (it: PedidoEstudio) =>
	(it.PracticaSolicitada || it.NomencladorDescripcion || '').trim() || `Pedido #${it.IdPedido}`;

/**
 * Completa una solicitud con UN solo informe para las prácticas elegidas
 * (por defecto todas las pendientes). Las que queden sin marcar se completan después.
 */
export default function CumplirSolicitudModal({
	open,
	solicitud,
	sectorServicio,
	onClose,
	onCumplido,
}: Props) {
	const [texto, setTexto] = useState('');
	const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [archivos, setArchivos] = useState<File[]>([]);
	const [tipos, setTipos] = useState<TipoImagenHC[]>([]);
	const [tipoImagen, setTipoImagen] = useState('');

	const clave = solicitud?.Clave ?? 0;
	const items = useMemo(() => solicitud?.Items ?? [], [solicitud]);
	const pendientes = useMemo(() => items.filter(pendiente), [items]);
	// Clave estable: el formulario solo se reinicia si cambia la solicitud o qué falta informar
	// (no cuando la bandeja refresca y llega un objeto nuevo con los mismos datos).
	const pendientesKey = pendientes.map((i) => i.IdPedido).join(',');
	const pendientesRef = useRef(pendientes);
	pendientesRef.current = pendientes;

	useEffect(() => {
		if (!open || !clave) return;
		const actuales = pendientesRef.current;
		setTexto('');
		setError(null);
		setArchivos([]);
		setTipoImagen('');
		setMarcadas(new Set(actuales.map((i) => i.IdPedido)));
		void adjuntosService
			.getTiposImagenes()
			.then((list) => {
				setTipos(list);
				setTipoImagen(sugerirTipoImagen(list, actuales.map(nombreItem).join(' ')));
			})
			.catch(() => setTipos([]));
	}, [open, clave, pendientesKey]);

	if (!open || !solicitud) return null;

	const quien = (solicitud.MedicoSolicitanteNombre || '').trim();
	const origen = (solicitud.SectorSolicitanteNombre || solicitud.SectorSolicitante || '').trim();
	const metaSolicitud = [
		origen ? `desde ${origen}` : '',
		formatCuando(solicitud.FechaPedidoISO, solicitud.HoraPedido),
	]
		.filter(Boolean)
		.join(' · ');
	const mensaje = (solicitud.NotasObservacion || '').trim();
	const todasMarcadas = marcadas.size === pendientes.length;

	const alternar = (id: number) =>
		setMarcadas((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const submit = async () => {
		if (marcadas.size === 0) {
			setError('Marcá al menos un estudio para completar');
			return;
		}
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
			const updated = await solicitudesEstudiosService.cumplir(solicitud.Clave, {
				textoInforme: texto.trim(),
				sectorServicio:
					solicitud.ServicioCodigo ||
					sectorServicio ||
					solicitud.SectorReceptor ||
					getIdSectorFromToken() ||
					undefined,
				idsPedidos: todasMarcadas ? undefined : Array.from(marcadas),
			});
			if (archivos.length > 0 && solicitud.IdVisita > 0) {
				await adjuntosService.subirArchivos(solicitud.IdVisita, archivos, tipoImagen.trim(), 'ESTUDIO');
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
					<h3 className="modal-title">
						Completar · {solicitud.TotalItems > 1 ? `${solicitud.TotalItems} estudios` : nombreItem(items[0])}
					</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}

					<PacientePedidoHeader paciente={solicitud} idVisita={solicitud.IdVisita} />

					<div className={formStyles.solicitudBox}>
						<strong className={formStyles.solicitudDe}>
							{quien ? `Solicitud de ${quien}` : 'Solicitud del profesional'}
						</strong>
						{metaSolicitud ? <span className={formStyles.solicitudMeta}>{metaSolicitud}</span> : null}
						{mensaje ? (
							<blockquote className={formStyles.solicitudQuote}>{mensaje}</blockquote>
						) : (
							<p className={formStyles.solicitudEmpty}>No dejó observaciones en el pedido.</p>
						)}
					</div>

					<div className={formStyles.label}>
						<div className={solStyles.rowHead}>
							<span>
								Estudios incluidos en este informe
								<span className={solStyles.counter}>
									{marcadas.size}/{pendientes.length}
								</span>
							</span>
							{pendientes.length > 1 ? (
								<button
									type="button"
									className={solStyles.linkBtn}
									onClick={() =>
										setMarcadas(
											todasMarcadas ? new Set() : new Set(pendientes.map((i) => i.IdPedido)),
										)
									}
								>
									{todasMarcadas ? 'Desmarcar todos' : 'Marcar todos'}
								</button>
							) : null}
						</div>
						<ul className={solStyles.checkList}>
							{items.map((it) => {
								const hecho = !pendiente(it);
								return (
									<li key={it.IdPedido}>
										<label
											className={`${solStyles.checkItem} ${hecho ? solStyles.checkItemDisabled : ''}`}
										>
											<input
												type="checkbox"
												checked={hecho || marcadas.has(it.IdPedido)}
												disabled={hecho || submitting || pendientes.length === 1}
												onChange={() => alternar(it.IdPedido)}
											/>
											<span>
												{nombreItem(it)}{' '}
												<span className={solStyles.checkItemCod}>
													{it.CodigoPractica ? `· ${it.CodigoPractica}` : ''}
													{hecho ? ' · ya informado' : ''}
												</span>
											</span>
										</label>
									</li>
								);
							})}
						</ul>
						{!todasMarcadas && pendientes.length > 1 ? (
							<span className={formStyles.hint}>
								Los estudios sin marcar quedan pendientes en la bandeja para completarlos aparte.
							</span>
						) : null}
					</div>

					<label className={`${formStyles.label} ${formStyles.informeLabel}`}>
						Tu informe / resultado
						<textarea
							className={formStyles.textarea}
							value={texto}
							onChange={(e) => setTexto(e.target.value)}
							rows={8}
							placeholder="Redacte el resultado…"
						/>
					</label>

					<PedidoAdjuntosField
						tipos={tipos}
						tipoImagen={tipoImagen}
						onTipoChange={setTipoImagen}
						archivos={archivos}
						onArchivosChange={setArchivos}
						disabled={submitting}
						idVisita={solicitud.IdVisita}
					/>

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
							disabled={submitting || marcadas.size === 0}
						>
							{submitting ? 'Guardando…' : 'Completar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
