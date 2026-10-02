'use client';

import { useEffect, useMemo, useState } from 'react';
import solicitudesEstudiosService from '@/app/services/solicitudesEstudiosService';
import type { TipoPedidoEstudio } from '@/app/types/estudios';
import type { SolicitudEstudio } from '@/app/types/solicitudesEstudios';
import { useSectoresReceptor } from '@/app/hooks/useSectoresReceptor';
import {
	resolveReceptorPorTipo,
	resolveServicioDestinoEnLista,
} from '@/app/utils/resolveSectorReceptor';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from './PedidoEstudioForms.module.css';
import solStyles from './SolicitudesEstudios.module.css';

type Urgencia = 'Normal' | 'Medio' | 'Urgente';

const MAX_ITEMS = 60;

function urgenciaDe(estado?: string | null): Urgencia {
	const v = String(estado || '').trim().toLowerCase();
	if (v.includes('urgent')) return 'Urgente';
	if (v.includes('medio')) return 'Medio';
	return 'Normal';
}

function tiposDeSolicitud(s: SolicitudEstudio): TipoPedidoEstudio[] {
	return (s.Items || []).map((it) => ({
		idTipoPedido: Number(it.IdTipoPedido) || 0,
		idPractica: Number(it.CodigoPractica) || 0,
		descripcion: (it.TipoPedidoDescripcion || it.PracticaSolicitada || '').trim(),
	}));
}

function mismaSeleccion(a: TipoPedidoEstudio[], b: TipoPedidoEstudio[]) {
	if (a.length !== b.length) return false;
	const set = new Set(a.map((t) => t.idPractica));
	return b.every((t) => set.has(t.idPractica));
}

type Props = {
	open: boolean;
	sectorSolicitante: string;
	idVisita: number;
	/** Si viene, se edita esa solicitud. */
	solicitud?: SolicitudEstudio | null;
	onClose: () => void;
	onCreated: () => void;
};

export default function SolicitarEstudiosModal({
	open,
	sectorSolicitante,
	idVisita,
	solicitud,
	onClose,
	onCreated,
}: Props) {
	const editando = Boolean(solicitud);
	/** Tomada / respondida: solo notas y urgencia. */
	const bloqueado = editando && solicitud ? solicitud.Estado !== 'PENDIENTE' : false;
	/** Pedido anterior (sin cabecera): se puede cambiar servicio pero no la lista. */
	const listaFija = bloqueado || Boolean(solicitud?.Legacy);

	const [term, setTerm] = useState('');
	const [resultados, setResultados] = useState<TipoPedidoEstudio[]>([]);
	const [loadingTipos, setLoadingTipos] = useState(false);
	const [seleccion, setSeleccion] = useState<TipoPedidoEstudio[]>([]);
	const [inicial, setInicial] = useState<TipoPedidoEstudio[]>([]);
	const { servicios, loading: loadingServicios } = useSectoresReceptor({
		enabled: open,
		force: open,
	});
	const [idServicioDestino, setIdServicioDestino] = useState('');
	const [servicioTocado, setServicioTocado] = useState(false);
	const [urgencia, setUrgencia] = useState<Urgencia>('Normal');
	const [notas, setNotas] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTerm('');
		setResultados([]);
		setError(null);
		setServicioTocado(false);
		if (solicitud) {
			const t = tiposDeSolicitud(solicitud);
			setSeleccion(t);
			setInicial(t);
			setUrgencia(urgenciaDe(solicitud.EstadoUrgencia));
			setNotas(solicitud.NotasObservacion || '');
		} else {
			setSeleccion([]);
			setInicial([]);
			setIdServicioDestino('');
			setUrgencia('Normal');
			setNotas('');
		}
	}, [open, solicitud]);

	// Servicio actual de la solicitud que se edita.
	useEffect(() => {
		if (!open || !solicitud || !servicios.length) return;
		setIdServicioDestino(
			resolveServicioDestinoEnLista(
				solicitud.SectorReceptor,
				servicios,
				solicitud.ServicioCodigo,
			),
		);
	}, [open, solicitud, servicios]);

	// Búsqueda en el catálogo (imTiposPedidosEstudios).
	useEffect(() => {
		const t = term.trim();
		if (t.length < 2 || listaFija) {
			setResultados([]);
			return;
		}
		let cancel = false;
		setLoadingTipos(true);
		const h = setTimeout(async () => {
			try {
				const rows = await solicitudesEstudiosService.buscarTipos(t, 25);
				if (!cancel) setResultados(rows);
			} catch {
				if (!cancel) setResultados([]);
			} finally {
				if (!cancel) setLoadingTipos(false);
			}
		}, 280);
		return () => {
			cancel = true;
			clearTimeout(h);
		};
	}, [term, listaFija]);

	// El servicio destino lo define la primera práctica, salvo que el usuario ya lo haya elegido.
	useEffect(() => {
		if (editando || servicioTocado || !servicios.length) return;
		if (seleccion.length === 0) return;
		const sugerido = resolveReceptorPorTipo(seleccion[0], servicios);
		if (sugerido) setIdServicioDestino(sugerido);
	}, [editando, servicioTocado, seleccion, servicios]);

	const opcionesServicio = useMemo(() => {
		const opts = servicios.map((s) => ({
			value: s.valor,
			label: `${s.descripcion} (${s.valor})`,
		}));
		if (
			idServicioDestino &&
			!opts.some((o) => String(o.value) === String(idServicioDestino))
		) {
			opts.unshift({ value: idServicioDestino, label: `${idServicioDestino} (actual)` });
		}
		return opts;
	}, [servicios, idServicioDestino]);

	/** Prácticas que normalmente van a otro servicio distinto del elegido. */
	const otroServicio = useMemo(() => {
		if (!idServicioDestino || !servicios.length) return [];
		return seleccion.filter((t) => {
			const sug = resolveReceptorPorTipo(t, servicios);
			return sug && sug !== idServicioDestino;
		});
	}, [seleccion, servicios, idServicioDestino]);

	if (!open) return null;

	const yaAgregado = (t: TipoPedidoEstudio) => seleccion.some((s) => s.idPractica === t.idPractica);

	const agregar = (t: TipoPedidoEstudio) => {
		if (listaFija || yaAgregado(t)) return;
		if (seleccion.length >= MAX_ITEMS) {
			setError(`Máximo ${MAX_ITEMS} estudios por solicitud`);
			return;
		}
		setError(null);
		setSeleccion((prev) => [...prev, t]);
	};

	const quitar = (t: TipoPedidoEstudio) => {
		if (listaFija) return;
		setSeleccion((prev) => prev.filter((s) => s.idPractica !== t.idPractica));
	};

	const submit = async () => {
		if (!listaFija && seleccion.length === 0) {
			setError('Agregá al menos un estudio');
			return;
		}
		if (!bloqueado && !idServicioDestino.trim()) {
			setError('Seleccione el servicio destino');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			if (editando && solicitud) {
				const cambiaLista = !listaFija && !mismaSeleccion(seleccion, inicial);
				await solicitudesEstudiosService.actualizar(solicitud.Clave, {
					notas: notas.trim(),
					estadoUrgencia: urgencia,
					...(bloqueado ? {} : { idSectorReceptor: idServicioDestino.trim() }),
					...(cambiaLista
						? {
								items: seleccion.map((t) => ({
									idTipoPedido: t.idTipoPedido,
									idPractica: t.idPractica,
								})),
							}
						: {}),
				});
			} else {
				await solicitudesEstudiosService.crear({
					idVisita,
					sectorSolicitante,
					idSectorReceptor: idServicioDestino.trim(),
					items: seleccion.map((t) => ({
						idTipoPedido: t.idTipoPedido,
						idPractica: t.idPractica,
					})),
					notas: notas.trim() || undefined,
					estadoUrgencia: urgencia,
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

	const titulo = editando ? 'Editar solicitud de estudios' : 'Solicitar estudios';

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3 className="modal-title">{titulo}</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}
					{bloqueado ? (
						<p className={formStyles.hint}>
							Ya fue tomada o respondida: solo podés editar las notas y la urgencia.
						</p>
					) : solicitud?.Legacy ? (
						<p className={formStyles.hint}>
							Es un pedido anterior: no se pueden agregar ni quitar estudios.
						</p>
					) : null}

					<label className={formStyles.label}>
						<span>
							Estudios
							<span className={solStyles.counter}>{seleccion.length}</span>
						</span>
						{!listaFija ? (
							<>
								<input
									className={formStyles.input}
									value={term}
									onChange={(e) => setTerm(e.target.value)}
									placeholder="Buscar por descripción o código y tocar para agregar…"
									autoComplete="off"
								/>
								{loadingTipos && <div className={formStyles.hint}>Buscando…</div>}
								{resultados.length > 0 && (
									<ul className={`${formStyles.results} ${solStyles.scroll}`}>
										{resultados.map((t) => {
											const agregado = yaAgregado(t);
											return (
												<li key={`${t.idPractica}-${t.idTipoPedido}`}>
													<button
														type="button"
														className={agregado ? solStyles.resultAgregado : undefined}
														onClick={() => agregar(t)}
														disabled={agregado}
													>
														{t.descripcion}
														<span>
															{agregado ? (
																<em className={solStyles.tag}>✓ agregado</em>
															) : (
																t.idPractica
															)}
														</span>
													</button>
												</li>
											);
										})}
									</ul>
								)}
							</>
						) : null}
						{seleccion.length > 0 ? (
							<ul className={solStyles.seleccion}>
								{seleccion.map((t) => (
									<li key={t.idPractica} className={solStyles.seleccionItem}>
										<div>
											<strong>{t.descripcion || `Práctica ${t.idPractica}`}</strong>
											<span>{t.idPractica}</span>
										</div>
										{!listaFija ? (
											<button
												type="button"
												onClick={() => quitar(t)}
												aria-label={`Quitar ${t.descripcion}`}
												title="Quitar"
												disabled={submitting}
											>
												×
											</button>
										) : null}
									</li>
								))}
							</ul>
						) : !listaFija ? (
							<div className={solStyles.hint}>Todavía no agregaste estudios.</div>
						) : null}
					</label>

					<label className={formStyles.label}>
						Servicio destino
						<CustomSelect
							label=""
							name="servicioDestino"
							isLoading={loadingServicios}
							disabled={bloqueado}
							value={idServicioDestino}
							onChange={(val) => {
								setServicioTocado(true);
								setIdServicioDestino(String(val));
							}}
							options={opcionesServicio}
						/>
						{!loadingServicios && servicios.length === 0 ? (
							<div className={formStyles.hint}>
								No hay servicios en el catálogo. Configúrelos en Personal / Servicios.
							</div>
						) : null}
						{otroServicio.length > 0 && !bloqueado ? (
							<div className={solStyles.hintWarn}>
								Revisá el destino: {otroServicio.map((t) => t.descripcion).slice(0, 3).join(', ')}
								{otroServicio.length > 3 ? '…' : ''} suele{otroServicio.length > 1 ? 'n' : ''} ir a
								otro servicio. Toda la solicitud va al servicio elegido.
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
								submitting || (!bloqueado && (loadingServicios || servicios.length === 0))
							}
						>
							{submitting
								? 'Guardando…'
								: editando
									? 'Guardar'
									: seleccion.length > 1
										? `Solicitar ${seleccion.length} estudios`
										: 'Solicitar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
