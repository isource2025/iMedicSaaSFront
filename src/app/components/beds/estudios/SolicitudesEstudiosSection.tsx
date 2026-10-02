'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import solicitudesEstudiosService from '@/app/services/solicitudesEstudiosService';
import type { PedidoEstudio } from '@/app/types/estudios';
import type { SolicitudEstudio } from '@/app/types/solicitudesEstudios';
import { usePermiso } from '@/app/hooks/usePermiso';
import BedSectionLoading from '../shared/BedSectionLoading';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import ConfirmationModal from '../shared/ConfirmationModal';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import { getIdSectorFromToken } from '@/app/utils/jwtSession';
import { esAutorRespuesta, esSolicitante } from '../shared/pedidoResponsable';
import SolicitarEstudiosModal from './SolicitarEstudiosModal';
import CumplirEstudioModal from './CumplirEstudioModal';
import styles from './EstudiosSection.module.css';
import solStyles from './SolicitudesEstudios.module.css';
import tableStyles from '../shared/BedTable.module.css';
import { IoEyeOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';

type Props = {
	numeroVisita: number | null;
	sectorSolicitante?: string | null;
	patientName?: string;
	documentoPaciente?: string;
	patientLocation?: string;
};

function urgenciaClass(estado?: string | null) {
	const v = (estado || '').trim().toLowerCase();
	if (v.includes('urgent')) return tableStyles.urgenciaUrgente;
	if (v.includes('medio')) return tableStyles.urgenciaMedio;
	if (v.includes('bajo') || v.includes('normal')) return tableStyles.urgenciaBajo;
	return tableStyles.urgenciaNone;
}

function formatFecha(s: SolicitudEstudio) {
	return [s.FechaPedidoISO || '', s.HoraPedido || ''].filter(Boolean).join(' ');
}

function previewText(value?: string | null, max = 100) {
	const t = String(value || '').trim();
	if (!t) return '—';
	return t.length > max ? `${t.slice(0, max)}…` : t;
}

const itemCumplido = (it: PedidoEstudio) => Boolean(it.Cumplido || Number(it.IdProtocolo) > 0);
const nombreItem = (it: PedidoEstudio) =>
	(it.PracticaSolicitada || it.NomencladorDescripcion || '').trim() || `Pedido #${it.IdPedido}`;

function estadoItem(it: PedidoEstudio) {
	if (itemCumplido(it)) return 'Cumplido';
	if (it.Tomado) return `Tomado${it.NombreToma ? ` · ${it.NombreToma}` : ''}`;
	return 'Pendiente';
}

function etiquetaEstado(s: SolicitudEstudio) {
	switch (s.Estado) {
		case 'CUMPLIDA':
			return 'Cumplida';
		case 'PARCIAL':
			return `Parcial ${s.ItemsCumplidos}/${s.TotalItems}`;
		case 'TOMADA':
			return `Tomada${s.TomadoPor ? ` · ${s.TomadoPor}` : ''}`;
		default:
			return 'Pendiente';
	}
}

function claseEstado(s: SolicitudEstudio) {
	switch (s.Estado) {
		case 'CUMPLIDA':
			return solStyles.estadoCumplida;
		case 'PARCIAL':
			return solStyles.estadoParcial;
		case 'TOMADA':
			return solStyles.estadoTomada;
		default:
		return '';
	}
}

function resumenPracticas(s: SolicitudEstudio) {
	const nombres = s.Items.map(nombreItem);
	if (nombres.length <= 1) return nombres[0] || 'Solicitud de estudios';
	return `${nombres[0]} y ${nombres.length - 1} más`;
}

/** Un bloque de respuesta por cada informe distinto (las prácticas informadas juntas comparten texto). */
function bloquesRespuesta(s: SolicitudEstudio) {
	const porProtocolo = new Map<number, PedidoEstudio[]>();
	for (const it of s.Items) {
		const p = Number(it.IdProtocolo) || 0;
		if (p <= 0) continue;
		porProtocolo.set(p, [...(porProtocolo.get(p) || []), it]);
	}
	return Array.from(porProtocolo.values()).map((its) => ({
		label: its.length === s.TotalItems && its.length > 1 ? 'Respuesta' : `Respuesta · ${its.map(nombreItem).join(', ')}`,
		value: its[0].TextoResultado || '(sin texto de respuesta)',
		autor: its[0].RealizadorNombre || its[0].NombreToma || null,
		fecha: its[0].FechaResultado || null,
		hora: null as string | null,
	}));
}

function listaEstudiosTexto(s: SolicitudEstudio) {
	return s.Items.map(
		(it) => `• ${nombreItem(it)}${it.CodigoPractica ? ` (${it.CodigoPractica})` : ''} — ${estadoItem(it)}`,
	).join('\n');
}

export default function SolicitudesEstudiosSection({
	numeroVisita,
	sectorSolicitante,
	patientName,
	documentoPaciente,
	patientLocation,
}: Props) {
	const { puede } = usePermiso();
	const usuarioActual = useUsuarioActual();
	const origenPedido = String(sectorSolicitante || getIdSectorFromToken() || '').trim();
	const puedeCrear = puede('INTERNACION.ESTUDIOS.CREAR');
	const puedeEditar = puede('INTERNACION.ESTUDIOS.EDITAR') || puedeCrear;
	const puedeEliminar = puede('INTERNACION.ESTUDIOS.ELIMINAR') || puedeCrear;

	const [rows, setRows] = useState<SolicitudEstudio[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<SolicitudEstudio | null>(null);
	const [editing, setEditing] = useState<SolicitudEstudio | null>(null);
	const [editingRespuesta, setEditingRespuesta] = useState<PedidoEstudio | null>(null);
	const [deleting, setDeleting] = useState<SolicitudEstudio | null>(null);
	const [deletingBusy, setDeletingBusy] = useState(false);
	const [showSolicitar, setShowSolicitar] = useState(false);
	const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
	const [query, setQuery] = useState('');

	const loadVisita = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			setRows(await solicitudesEstudiosService.listarPorVisita(numeroVisita));
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, [numeroVisita]);

	useEffect(() => {
		void loadVisita();
	}, [loadVisita]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return rows;
		const hay = (v?: string | number | null) => v != null && String(v).toLowerCase().includes(q);
		return rows.filter(
			(s) =>
				hay(s.NotasObservacion) ||
				hay(s.MedicoSolicitanteNombre) ||
				hay(s.ServicioDescripcion) ||
				hay(s.Estado) ||
				s.Items.some(
					(it) =>
						hay(it.PracticaSolicitada) ||
						hay(it.CodigoPractica) ||
						hay(it.TextoResultado),
				),
		);
	}, [rows, query]);

	const esCreador = (s: SolicitudEstudio) => esSolicitante(s, usuarioActual);
	const puedeEditarSolicitud = (s: SolicitudEstudio) => puedeEditar && esCreador(s);
	const puedeEliminarSolicitud = (s: SolicitudEstudio) =>
		puedeEliminar && esCreador(s) && s.Estado === 'PENDIENTE';
	const puedeEditarRespuestaItem = (it: PedidoEstudio) =>
		itemCumplido(it) && esAutorRespuesta(it, usuarioActual);

	const alternar = (clave: number) =>
		setExpandidas((prev) => {
			const next = new Set(prev);
			if (next.has(clave)) next.delete(clave);
			else next.add(clave);
			return next;
		});

	const handleConfirmDelete = async () => {
		if (!deleting) return;
		setDeletingBusy(true);
		setError(null);
		try {
			await solicitudesEstudiosService.eliminar(deleting.Clave);
			setDeleting(null);
			await loadVisita();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo eliminar la solicitud');
		} finally {
			setDeletingBusy(false);
		}
	};

	const handleExport = async (option: ExportOption) => {
		if (option !== 'pdf') return;
		const empresaInfo = await obtenerInfoEmpresa();
		const parts = rows.map((s, idx) => ({
			title: `Solicitud ${idx + 1}`,
			fields: [
				{ label: 'Estado', value: etiquetaEstado(s) },
				{ label: 'Fecha / hora', value: formatFecha(s) },
				{ label: 'Servicio destino', value: s.ServicioDescripcion || s.SectorReceptorNombre || '—' },
				{ label: 'Solicitado por', value: s.MedicoSolicitanteNombre || '—' },
			],
			textBlocks: [
				{ label: `Estudios (${s.TotalItems})`, value: listaEstudiosTexto(s) },
				{ label: 'Pedido', value: s.NotasObservacion || '—' },
				...(bloquesRespuesta(s).length
					? bloquesRespuesta(s).map((b) => ({ label: b.label, value: b.value }))
					: [{ label: 'Respuesta', value: 'Sin respuesta cargada' }]),
			],
			profesional: {
				nombre:
					s.Items.find((i) => i.RealizadorNombre)?.RealizadorNombre ||
					s.MedicoSolicitanteNombre ||
					'PROFESIONAL',
				matricula:
					s.Items.find((i) => i.MatriculaRealizador)?.MatriculaRealizador ??
					s.MatriculaSolicitante ??
					undefined,
			},
		}));
		await exportToPDF({
			title: 'Solicitudes de estudios',
			subtitle: `Visita: ${numeroVisita}`,
			parts,
			fileName: `estudios_${numeroVisita}.pdf`,
			orientation: 'portrait',
			empresaInfo,
			patientInfo: {
				numeroVisita: numeroVisita || undefined,
				nombre: patientName,
				numeroDocumento: documentoPaciente,
				ubicacion: patientLocation,
			},
		});
	};

	if (!numeroVisita) {
		return (
			<EmptyState
				variant="estudios"
				text="No hay visita seleccionada"
				description="Abrí una internación para ver los pedidos de estudios."
			/>
		);
	}

	if (loading) return <BedSectionLoading />;

	return (
		<>
			<BedSectionLayout
				title="Estudios"
				subtitle="Solicitudes de este paciente · cada una puede incluir varios estudios"
				addLabel={puedeCrear ? 'Estudios' : undefined}
				onAdd={puedeCrear ? () => setShowSolicitar(true) : undefined}
				addDisabled={!origenPedido}
				addTitle={!origenPedido ? 'Sin sector de sesión' : undefined}
				exportSlot={
					<ExportButton
						data={filtered}
						fileName={`estudios_${numeroVisita}.pdf`}
						onExport={handleExport}
						options={['pdf']}
					/>
				}
				search={{
					value: query,
					onChange: setQuery,
					placeholder: 'Buscar por estudio, código, notas, profesional…',
				}}
			>
				{error && <div className={styles.error}>{error}</div>}
				{filtered.length === 0 ? (
					<EmptyState
						variant="estudios"
						text={rows.length === 0 ? 'Sin solicitudes de estudios' : 'Sin resultados'}
						description={
							rows.length === 0
								? 'Solicitá estudios con el botón + Estudios.'
								: 'Probá con otro criterio de búsqueda.'
						}
						actionLabel={puedeCrear && rows.length === 0 ? 'Estudios' : undefined}
						onAction={puedeCrear && rows.length === 0 ? () => setShowSolicitar(true) : undefined}
					/>
				) : (
					<div className={tableStyles.tableWrap}>
						<div className={tableStyles.scrollArea}>
							<table className={tableStyles.table}>
								<thead className={tableStyles.thead}>
									<tr>
										<th>Urg.</th>
										<th>Estado</th>
										<th>Fecha / hora</th>
										<th>Estudios</th>
										<th>Pedido</th>
										<th>Solicitado por</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody className={tableStyles.tbody}>
									{filtered.map((s) => {
										const abierta = expandidas.has(s.Clave);
										const multiple = s.Items.length > 1;
										return (
											<Fragment key={s.Clave}>
												<tr className={tableStyles.row}>
													<td>
														<span
															className={`${tableStyles.urgencia} ${urgenciaClass(s.EstadoUrgencia)}`}
															title={s.EstadoUrgencia || 'Sin urgencia'}
														/>
													</td>
													<td>
														<span className={`${solStyles.estadoBadge} ${claseEstado(s)}`}>
															{etiquetaEstado(s)}
														</span>
													</td>
													<td className={tableStyles.meta}>{formatFecha(s)}</td>
													<td>
														{multiple ? (
															<button
																type="button"
																className={solStyles.expander}
																onClick={() => alternar(s.Clave)}
																aria-expanded={abierta}
															>
																<span className={tableStyles.practica}>{resumenPracticas(s)}</span>
																<span className={solStyles.counter}>
																	{s.TotalItems} {abierta ? '▴' : '▾'}
																</span>
															</button>
														) : (
															<div className={tableStyles.practica}>
																{nombreItem(s.Items[0])}
																{s.Items[0].CodigoPractica ? (
																	<span className={tableStyles.meta}> · {s.Items[0].CodigoPractica}</span>
																) : null}
															</div>
														)}
														{(s.ServicioDescripcion || s.SectorReceptorNombre) && (
															<div className={tableStyles.meta}>
																Servicio: {s.ServicioDescripcion || s.SectorReceptorNombre}
															</div>
														)}
													</td>
													<td className={tableStyles.notas}>{previewText(s.NotasObservacion)}</td>
													<td className={tableStyles.meta}>{s.MedicoSolicitanteNombre || '—'}</td>
													<td>
														<div className={tableStyles.actionBtns}>
															<button
																type="button"
																className={tableStyles.btnAction}
																title="Ver detalle"
																onClick={() => setSelected(s)}
															>
																<IoEyeOutline color="#5BC0DE" size={18} />
															</button>
															{puedeEditarSolicitud(s) && (
																<button
																	type="button"
																	className={tableStyles.btnAction}
																	title="Editar solicitud"
																	onClick={() => setEditing(s)}
																>
																	<IoPencilOutline color="#5BC0DE" size={18} />
																</button>
															)}
															{puedeEliminarSolicitud(s) && (
																<button
																	type="button"
																	className={tableStyles.btnAction}
																	title="Eliminar"
																	onClick={() => setDeleting(s)}
																>
																	<IoTrashOutline color="#5BC0DE" size={18} />
																</button>
															)}
														</div>
													</td>
												</tr>
												{multiple && abierta
													? s.Items.map((it) => (
															<tr key={`${s.Clave}-${it.IdPedido}`} className={solStyles.subRow}>
																<td />
																<td className={tableStyles.meta}>{estadoItem(it)}</td>
																<td />
																<td className={solStyles.subPractica}>
																	{nombreItem(it)}
																	{it.CodigoPractica ? (
																		<span className={tableStyles.meta}> · {it.CodigoPractica}</span>
																	) : null}
																</td>
																<td className={tableStyles.notas} colSpan={2}>
																	{it.TextoResultado ? previewText(it.TextoResultado) : '—'}
																</td>
																<td>
																	{puedeEditarRespuestaItem(it) ? (
																		<button
																			type="button"
																			className={tableStyles.btnAction}
																			title="Editar respuesta"
																			onClick={() => setEditingRespuesta(it)}
																		>
																			<IoPencilOutline color="#5BC0DE" size={16} />
																		</button>
																	) : null}
																</td>
															</tr>
														))
													: null}
											</Fragment>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</BedSectionLayout>

			{selected && (
				<PedidoDetalleModal
					kicker="Solicitud de estudios"
					title={
						selected.TotalItems > 1
							? `${selected.TotalItems} estudios`
							: nombreItem(selected.Items[0])
					}
					urgencia={selected.EstadoUrgencia || undefined}
					estado={etiquetaEstado(selected)}
					fields={[
						{ label: 'Solicitado por', value: selected.MedicoSolicitanteNombre },
						{ label: 'Matrícula', value: selected.MatriculaSolicitante },
						{ label: 'Fecha / hora', value: formatFecha(selected) },
						{ label: 'Sector origen', value: selected.SectorSolicitanteNombre || selected.SectorSolicitante },
						{
							label: 'Servicio destino',
							value: selected.ServicioDescripcion || selected.SectorReceptorNombre || selected.SectorReceptor,
							full: true,
						},
						{ label: 'Tomada por', value: selected.TomadoPor },
						{ label: 'Id solicitud', value: selected.IdSolicitud },
					]}
					textBlocks={[
						{ label: `Estudios (${selected.TotalItems})`, value: listaEstudiosTexto(selected) },
						{
							label: 'Pedido',
							value: selected.NotasObservacion || null,
							autor: selected.MedicoSolicitanteNombre || null,
							fecha: selected.FechaPedidoISO || null,
							hora: selected.HoraPedido || null,
						},
						...bloquesRespuesta(selected),
					]}
					onClose={() => setSelected(null)}
					onEditarPedido={
						puedeEditarSolicitud(selected)
							? () => {
									setEditing(selected);
									setSelected(null);
								}
							: undefined
					}
				/>
			)}

			{showSolicitar && origenPedido && (
				<SolicitarEstudiosModal
					open={showSolicitar}
					idVisita={numeroVisita}
					sectorSolicitante={origenPedido}
					onClose={() => setShowSolicitar(false)}
					onCreated={() => {
						void loadVisita();
					}}
				/>
			)}

			{editing && (
				<SolicitarEstudiosModal
					open={Boolean(editing)}
					idVisita={numeroVisita}
					sectorSolicitante={origenPedido || editing.SectorSolicitante || ''}
					solicitud={editing}
					onClose={() => setEditing(null)}
					onCreated={() => {
						void loadVisita();
					}}
				/>
			)}

			{editingRespuesta && (
				<CumplirEstudioModal
					open={Boolean(editingRespuesta)}
					pedido={editingRespuesta}
					modoEdicion
					onClose={() => setEditingRespuesta(null)}
					onCumplido={() => {
						setEditingRespuesta(null);
						void loadVisita();
					}}
				/>
			)}

			<ConfirmationModal
				isOpen={Boolean(deleting)}
				onClose={() => {
					if (!deletingBusy) setDeleting(null);
				}}
				onConfirm={() => {
					void handleConfirmDelete();
				}}
				title="Eliminar solicitud"
				message={
					deleting
						? `¿Eliminar la solicitud${deleting.TotalItems > 1 ? ` de ${deleting.TotalItems} estudios` : ` “${nombreItem(deleting.Items[0])}”`}? Solo se puede mientras está pendiente.`
						: ''
				}
				confirmText={deletingBusy ? 'Eliminando…' : 'Eliminar'}
				cancelText="Cancelar"
			/>
		</>
	);
}
