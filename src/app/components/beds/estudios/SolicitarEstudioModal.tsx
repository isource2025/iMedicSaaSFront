'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import solicitudesEstudiosService from '@/app/services/solicitudesEstudiosService';
import type { PedidoEstudio, TipoPedidoEstudio } from '@/app/types/estudios';
import { useSectoresReceptor } from '@/app/hooks/useSectoresReceptor';
import {
	resolveReceptorPorTipo,
	resolveServicioDestinoEnLista,
} from '@/app/utils/resolveSectorReceptor';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from './PedidoEstudioForms.module.css';

type Urgencia = 'Normal' | 'Medio' | 'Urgente';

/** Mismo tope que el backend para un pedido con varias prácticas. */
const MAX_ESTUDIOS = 100;

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

function pedidoBloqueado(pedido: PedidoEstudio) {
	return !!(pedido.Cumplido || Number(pedido.IdProtocolo) > 0 || pedido.Tomado);
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
	const bloqueado = editando && pedido ? pedidoBloqueado(pedido) : false;
	const [term, setTerm] = useState('');
	const [tipos, setTipos] = useState<TipoPedidoEstudio[]>([]);
	const [loadingTipos, setLoadingTipos] = useState(false);
	/** Al crear se pueden sumar varias prácticas; al editar un pedido es una sola. */
	const [seleccion, setSeleccion] = useState<TipoPedidoEstudio[]>([]);
	const { servicios, loading: loadingServicios } = useSectoresReceptor({
		enabled: open,
		force: open,
	});
	const [idServicioDestino, setIdServicioDestino] = useState('');
	/** Primera práctica elegida en esta sesión: define el servicio destino. */
	const [tipoElegido, setTipoElegido] = useState<TipoPedidoEstudio | null>(null);
	/** Último tipo elegido para el que ya se calculó el servicio destino. */
	const tipoAplicadoRef = useRef<TipoPedidoEstudio | null>(null);
	const [urgencia, setUrgencia] = useState<Urgencia>('Normal');
	const [notas, setNotas] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTerm('');
		setTipos([]);
		setError(null);
		setTipoElegido(null);
		tipoAplicadoRef.current = null;
		if (pedido) {
			const t = tipoDePedido(pedido);
			setSeleccion(t ? [t] : []);
			setUrgencia(urgenciaDePedido(pedido.EstadoUrgencia));
			setNotas(pedido.NotasObservacion || '');
		} else {
			setSeleccion([]);
			setIdServicioDestino('');
			setUrgencia('Normal');
			setNotas('');
		}
	}, [open, pedido]);

	useEffect(() => {
		if (!open || !pedido || !servicios.length) return;
		// Si ya cambió la práctica, el servicio lo define la nueva práctica (no el del pedido original)
		if (tipoAplicadoRef.current) return;
		setIdServicioDestino(
			resolveServicioDestinoEnLista(
				pedido.SectorReceptor,
				servicios,
				pedido.ServicioCodigo,
			),
		);
	}, [open, pedido, servicios]);

	const puedeAgregar =
		!bloqueado && (editando ? seleccion.length === 0 : seleccion.length < MAX_ESTUDIOS);
	// Con una práctica ya cargada y su servicio definido, solo se ofrecen las prácticas que
	// realiza ese servicio (sus prefijos de práctica).
	const servicioFiltro = seleccion.length > 0 ? idServicioDestino.trim() : '';

	useEffect(() => {
		const t = term.trim();
		if (t.length < 2 || !puedeAgregar) {
			setTipos([]);
			return;
		}
		let cancel = false;
		setLoadingTipos(true);
		const h = setTimeout(async () => {
			try {
				const rows = servicioFiltro
					? await solicitudesEstudiosService.buscarTipos(t, 25, servicioFiltro)
					: await estudiosService.buscarTipos(t, 25);
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
	}, [term, puedeAgregar, servicioFiltro]);

	// La primera práctica define el servicio destino; las siguientes ya se buscan dentro de él.
	// Si la práctica no tiene un servicio asociado, se vacía para que se elija a mano.
	useEffect(() => {
		if (!tipoElegido || !servicios.length) return;
		if (tipoAplicadoRef.current === tipoElegido) return;
		tipoAplicadoRef.current = tipoElegido;
		setIdServicioDestino(resolveReceptorPorTipo(tipoElegido, servicios));
	}, [tipoElegido, servicios]);

	const opcionesServicio = useMemo(() => {
		const opts = servicios.map((s) => ({
			value: s.valor,
			label: `${s.descripcion} (${s.valor})`,
		}));
		if (
			idServicioDestino &&
			!opts.some((o) => String(o.value) === String(idServicioDestino))
		) {
			opts.unshift({
				value: idServicioDestino,
				label: `${idServicioDestino} (actual)`,
			});
		}
		return opts;
	}, [servicios, idServicioDestino]);

	if (!open) return null;

	const nombreServicioFiltro = servicioFiltro
		? servicios.find((s) => s.valor === servicioFiltro)?.descripcion || servicioFiltro
		: '';
	const resultados = tipos.filter((t) => !seleccion.some((s) => s.idPractica === t.idPractica));

	const agregar = (t: TipoPedidoEstudio) => {
		if (seleccion.some((s) => s.idPractica === t.idPractica)) return;
		if (seleccion.length === 0) setTipoElegido(t);
		setSeleccion((prev) => [...prev, t]);
		setTerm('');
		setTipos([]);
		setError(null);
	};

	const quitar = (t: TipoPedidoEstudio) => {
		setSeleccion((prev) => prev.filter((s) => s.idPractica !== t.idPractica));
	};

	const submit = async () => {
		if (seleccion.length === 0) {
			setError('Seleccione un tipo de estudio');
			return;
		}
		if (!idServicioDestino.trim()) {
			setError('Seleccione el servicio destino');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const comunes = {
				idSectorReceptor: idServicioDestino.trim(),
				notas: notas.trim() || undefined,
				estadoUrgencia: urgencia,
			};
			const [primero] = seleccion;
			if (editando && pedido) {
				await estudiosService.actualizar(pedido.IdPedido, {
					idTipoPedido: primero.idTipoPedido,
					idPractica: primero.idPractica,
					...comunes,
				});
			} else if (seleccion.length === 1) {
				await estudiosService.crear({
					idVisita,
					sectorSolicitante,
					idTipoPedido: primero.idTipoPedido,
					idPractica: primero.idPractica,
					...comunes,
				});
			} else {
				// Varias prácticas: un solo pedido al servicio, con una fila por práctica.
				await solicitudesEstudiosService.crear({
					idVisita,
					sectorSolicitante,
					items: seleccion.map((t) => ({ idTipoPedido: t.idTipoPedido, idPractica: t.idPractica })),
					...comunes,
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
					<h3 className="modal-title">{editando ? 'Editar estudio' : 'Solicitar estudio'}</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>
				<div className={styles.modalBody}>
					{error && <div className={formStyles.error}>{error}</div>}
					{bloqueado ? (
						<p className={formStyles.hint}>
							Ya fue tomado o respondido: solo podés editar las notas y la urgencia.
						</p>
					) : null}

					<div className={formStyles.label}>
						{seleccion.length > 1 ? `Estudios (${seleccion.length})` : 'Tipo de estudio'}
						{seleccion.length > 0 ? (
							<ul className={formStyles.selectedLista}>
								{seleccion.map((t) => (
									<li key={`${t.idPractica}-${t.idTipoPedido}`} className={formStyles.selectedTipo}>
										<span>
											<strong>{t.descripcion}</strong> · {t.idPractica}
										</span>
										{bloqueado ? null : editando ? (
											<button type="button" onClick={() => quitar(t)}>
												Cambiar
											</button>
										) : (
											<button
												type="button"
												onClick={() => quitar(t)}
												aria-label={`Quitar ${t.descripcion}`}
											>
												Quitar
											</button>
										)}
									</li>
								))}
							</ul>
						) : null}
						{puedeAgregar ? (
							<>
								<input
									className={formStyles.input}
									value={term}
									onChange={(e) => setTerm(e.target.value)}
									placeholder={
										seleccion.length > 0
											? 'Buscar por descripción o código para agregar otro estudio…'
											: 'Buscar por descripción o código…'
									}
									aria-label={seleccion.length > 0 ? 'Agregar otro estudio' : 'Buscar estudio'}
									autoComplete="off"
								/>
								{nombreServicioFiltro ? (
									<div className={formStyles.hint}>
										Solo se muestran estudios que realiza {nombreServicioFiltro}.
									</div>
								) : null}
								{loadingTipos && <div className={formStyles.hint}>Buscando…</div>}
								{!loadingTipos && term.trim().length >= 2 && resultados.length === 0 ? (
									<div className={formStyles.hint}>
										{nombreServicioFiltro
											? `No hay estudios de ${nombreServicioFiltro} que coincidan.`
											: 'Sin resultados.'}
									</div>
								) : null}
								{resultados.length > 0 && (
									<ul className={formStyles.results}>
										{resultados.map((t) => (
											<li key={`${t.idPractica}-${t.idTipoPedido}`}>
												<button type="button" onClick={() => agregar(t)}>
													{t.descripcion}
													<span>{t.idPractica}</span>
												</button>
											</li>
										))}
									</ul>
								)}
							</>
						) : null}
					</div>

					<label className={formStyles.label}>
						Servicio destino
						<CustomSelect
							label=""
							name="servicioDestino"
							isLoading={loadingServicios}
							disabled={bloqueado}
							value={idServicioDestino}
							onChange={(val) => setIdServicioDestino(String(val))}
							options={opcionesServicio}
						/>
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
						<button
							type="button"
							className={formStyles.btnPrimary}
							onClick={() => void submit()}
							disabled={
								submitting ||
								(!bloqueado && (loadingServicios || servicios.length === 0))
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
