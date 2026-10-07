'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import solicitudesEstudiosService from '@/app/services/solicitudesEstudiosService';
import { PedidoEstudio } from '@/app/types/estudios';
import type { SolicitudEstudio } from '@/app/types/solicitudesEstudios';
import { usePermiso } from '@/app/hooks/usePermiso';
import { cargarVisita, peekVisita, tomarVisita, visitaCacheKey } from '@/app/utils/bedVisitaCache';
import BedSectionLoading from '../shared/BedSectionLoading';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import SolicitarEstudioModal from './SolicitarEstudioModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { Periodo, filtrarPorPeriodo } from '../shared/PeriodFilter';
import { exportToPDF } from '../../../utils/pdfExportLazy';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import styles from './EstudiosSection.module.css';
import solStyles from './SolicitudesEstudios.module.css';
import tableStyles from '../shared/BedTable.module.css';
import { IoChevronDown, IoChevronForward, IoEyeOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import { getIdSectorFromToken } from '@/app/utils/jwtSession';
import ConfirmationModal from '../shared/ConfirmationModal';
import { esAutorRespuesta, esSolicitante } from '../shared/pedidoResponsable';
import CumplirEstudioModal from './CumplirEstudioModal';

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

function formatFecha(row: { FechaPedidoISO?: string; HoraPedido?: string }) {
	const f = row.FechaPedidoISO || '';
	const h = row.HoraPedido || '';
	return [f, h].filter(Boolean).join(' ');
}

const itemCumplido = (row: PedidoEstudio) => !!(row.Cumplido || Number(row.IdProtocolo) > 0);

function pedidoPendiente(row: PedidoEstudio) {
	if (itemCumplido(row)) return false;
	if (row.Tomado) return false;
	const w = String(row.EstadoWorkflow || '').toUpperCase();
	if (w === 'TOMADO' || w === 'CUMPLIDO' || w === 'RESPONDIDO') return false;
	return true;
}

function nombreItem(row: PedidoEstudio) {
	return (row.PracticaSolicitada || row.NomencladorDescripcion || '').trim() || `Pedido #${row.IdPedido}`;
}

function estadoItem(row: PedidoEstudio) {
	if (itemCumplido(row)) return 'Cumplido';
	if (row.Tomado) return `Tomado${row.NombreToma ? ` · ${row.NombreToma}` : ''}`;
	return 'Pendiente';
}

function claseEstadoItem(row: PedidoEstudio) {
	if (itemCumplido(row)) return solStyles.estadoCumplida;
	if (row.Tomado) return solStyles.estadoTomada;
	return '';
}

function estadoSolicitud(s: SolicitudEstudio): { texto: string; clase: string } {
	switch (s.Estado) {
		case 'CUMPLIDA':
			return { texto: 'Cumplido', clase: solStyles.estadoCumplida };
		case 'PARCIAL':
			return { texto: `Parcial ${s.ItemsCumplidos}/${s.TotalItems}`, clase: solStyles.estadoParcial };
		case 'TOMADA':
			return { texto: `Tomado${s.TomadoPor ? ` · ${s.TomadoPor}` : ''}`, clase: solStyles.estadoTomada };
		default:
			return { texto: 'Pendiente', clase: '' };
	}
}

function previewText(value?: string | null, max = 100) {
	const t = String(value || '').trim();
	if (!t) return '—';
	return t.length > max ? `${t.slice(0, max)}…` : t;
}

function respuestaItem(row: PedidoEstudio) {
	if (row.TextoResultado) return previewText(row.TextoResultado);
	return itemCumplido(row) ? '(sin texto)' : '—';
}

/** Si todas las prácticas comparten un mismo informe, se muestra una sola vez en la fila. */
function respuestaSolicitud(s: SolicitudEstudio) {
	if (s.TotalItems === 1) return respuestaItem(s.Items[0]);
	if (s.ItemsCumplidos === 0) return '—';
	const protocolos = new Set(s.Items.map((i) => Number(i.IdProtocolo) || 0));
	if (s.Estado === 'CUMPLIDA' && protocolos.size === 1) return respuestaItem(s.Items[0]);
	return `${s.ItemsCumplidos}/${s.TotalItems} informados`;
}

function buildEstudioFields(row: PedidoEstudio) {
	return [
		{ label: 'Cód. práctica', value: row.CodigoPractica },
		{ label: 'Tipo', value: row.TipoPedidoDescripcion || row.PracticaSolicitada },
		{ label: 'Nomenclador', value: row.NomencladorDescripcion, full: true },
		{ label: 'Matrícula', value: row.MatriculaSolicitante },
		{ label: 'Tomado por', value: row.NombreToma },
		{ label: 'Sector origen', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{
			label: 'Servicio destino',
			value: row.ServicioDescripcion || row.SectorReceptorNombre || row.SectorReceptor,
			full: true,
		},
		{ label: 'Id resultado', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
		{ label: 'Id pedido', value: row.IdPedido },
	];
}

function buildEstudioTextBlocks(row: PedidoEstudio) {
	return [
		{
			label: 'Pedido',
			value: row.NotasObservacion || null,
			autor: row.MedicoSolicitanteNombre || null,
			fecha: row.FechaPedidoISO || null,
			hora: row.HoraPedido || null,
		},
		{
			label: 'Respuesta',
			value: row.Cumplido
				? row.TextoResultado || '(sin texto de respuesta)'
				: row.TextoResultado || null,
			autor: row.RealizadorNombre || row.NombreToma || null,
			fecha: row.FechaResultado || null,
			hora: null,
		},
	];
}

export default function EstudiosSection({
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
	const puedeEditar =
		puede('INTERNACION.ESTUDIOS.EDITAR') || puedeCrear;
	const puedeEliminar =
		puede('INTERNACION.ESTUDIOS.ELIMINAR') || puedeCrear;
	const [rows, setRows] = useState<SolicitudEstudio[]>(
		() => peekVisita<SolicitudEstudio[]>(visitaCacheKey('solicitudesEstudios', numeroVisita)) ?? [],
	);
	const [loading, setLoading] = useState(
		() => peekVisita(visitaCacheKey('solicitudesEstudios', numeroVisita)) === undefined,
	);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<PedidoEstudio | null>(null);
	const [editing, setEditing] = useState<PedidoEstudio | null>(null);
	const [editingRespuesta, setEditingRespuesta] = useState<PedidoEstudio | null>(null);
	const [deleting, setDeleting] = useState<SolicitudEstudio | null>(null);
	const [deletingPractica, setDeletingPractica] = useState<PedidoEstudio | null>(null);
	const [deletingBusy, setDeletingBusy] = useState(false);
	const [showSolicitar, setShowSolicitar] = useState(false);
	const [query, setQuery] = useState('');
	const [periodo, setPeriodo] = useState<Periodo>('all');
	const [abiertas, setAbiertas] = useState<Set<number>>(new Set());

	const loadVisita = useCallback(async (modo?: unknown) => {
		if (!numeroVisita) return;
		const key = visitaCacheKey('solicitudesEstudios', numeroVisita);
		const inicial = modo === 'inicial';
		const cached = inicial ? tomarVisita<SolicitudEstudio[]>(key) : undefined;
		if (cached) {
			setRows(cached.data);
			setLoading(false);
			if (!cached.refrescar) return;
		} else {
			setLoading(true);
		}
		setError(null);
		try {
			setRows(
				await cargarVisita(
					key,
					() => solicitudesEstudiosService.listarPorVisitaConRespaldo(numeroVisita),
					!inicial,
				),
			);
		} catch (e) {
			if (!cached) setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, [numeroVisita]);

	useEffect(() => {
		void loadVisita('inicial');
	}, [loadVisita]);

	const filtered = useMemo(() => {
		const enPeriodo = filtrarPorPeriodo(rows, periodo, (r) => r.FechaPedidoISO);
		const q = query.trim().toLowerCase();
		if (!q) return enPeriodo;
		const hay = (v?: string | number | null) => v != null && String(v).toLowerCase().includes(q);
		return enPeriodo.filter(
			(s) =>
				hay(s.NotasObservacion) ||
				hay(s.MedicoSolicitanteNombre) ||
				hay(s.ServicioDescripcion) ||
				s.Items.some(
					(r) =>
						hay(r.PracticaSolicitada) ||
						hay(r.CodigoPractica) ||
						hay(r.TextoResultado) ||
						hay(r.EstadoWorkflow),
				),
		);
	}, [rows, query, periodo]);

	const alternarAbierta = (clave: number) =>
		setAbiertas((prev) => {
			const next = new Set(prev);
			if (next.has(clave)) next.delete(clave);
			else next.add(clave);
			return next;
		});

	const esCreador = (row: PedidoEstudio | SolicitudEstudio) => esSolicitante(row, usuarioActual);

	const puedeEditarPedido = (row: PedidoEstudio) => puedeEditar && esCreador(row);

	const puedeEliminarPractica = (row: PedidoEstudio) =>
		puedeEliminar && esCreador(row) && pedidoPendiente(row);

	const solicitudDe = (row: PedidoEstudio) =>
		Number(row.IdSolicitud) > 0 ? rows.find((s) => s.IdSolicitud === row.IdSolicitud) : undefined;

	const hermanasDe = (row: PedidoEstudio) =>
		(solicitudDe(row)?.Items ?? [])
			.filter((i) => i.IdPedido !== row.IdPedido)
			.map((i) => ({ idPractica: Number(i.CodigoPractica) || 0, descripcion: nombreItem(i) }));

	const puedeEditarRespuesta = (row: PedidoEstudio) =>
		itemCumplido(row) && esAutorRespuesta(row, usuarioActual);

	const puedeEliminarSolicitud = (s: SolicitudEstudio) =>
		puedeEliminar && esCreador(s) && s.Items.every(pedidoPendiente);

	const abrirEdicionPedido = (row: PedidoEstudio) => {
		setSelected(null);
		setEditing(row);
	};

	const abrirEdicionRespuesta = (row: PedidoEstudio) => {
		setSelected(null);
		setEditingRespuesta(row);
	};

	/** Nombres de las otras prácticas de la visita que comparten el informe del pedido. */
	const compartidoCon = (row: PedidoEstudio | null) => {
		const prot = Number(row?.IdProtocolo) || 0;
		if (!row || prot <= 0) return [];
		return rows
			.flatMap((s) => s.Items)
			.filter((i) => i.IdPedido !== row.IdPedido && Number(i.IdProtocolo) === prot)
			.map(nombreItem);
	};

	const handleConfirmDelete = async () => {
		if (!deleting && !deletingPractica) return;
		setDeletingBusy(true);
		setError(null);
		try {
			if (deletingPractica) await estudiosService.eliminar(deletingPractica.IdPedido);
			else if (deleting?.Legacy) await estudiosService.eliminar(deleting.Items[0].IdPedido);
			else if (deleting) await solicitudesEstudiosService.eliminar(deleting.Clave);
			setDeleting(null);
			setDeletingPractica(null);
			await loadVisita();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo eliminar el pedido');
		} finally {
			setDeletingBusy(false);
		}
	};

	const handleExport = async (option: ExportOption) => {
		if (option === 'pdf') {
			const empresaInfo = await obtenerInfoEmpresa();
			const items = filtered.flatMap((s) => s.Items);
			const parts = items.map((r, idx) => ({
				title: `Estudio ${idx + 1}`,
				fields: [
					{ label: 'Estado', value: itemCumplido(r) ? 'Cumplido' : r.Tomado ? 'Tomado' : 'Pendiente' },
					{ label: 'Fecha / hora', value: formatFecha(r) },
					{ label: 'Código', value: r.CodigoPractica ?? '—' },
					{ label: 'Práctica', value: r.PracticaSolicitada || '—' },
					{
						label: 'Servicio destino',
						value: r.ServicioDescripcion || r.SectorReceptorNombre || '—',
					},
					{ label: 'Fecha resultado', value: r.FechaResultado || '—' },
					{ label: 'Realizado por', value: r.RealizadorNombre || '—' },
				],
				textBlocks: [
					{ label: 'Pedido', value: r.NotasObservacion || '—' },
					{
						label: 'Respuesta',
						value: r.TextoResultado || (itemCumplido(r) ? '(sin texto)' : 'Sin respuesta cargada'),
					},
				],
				profesional: {
					nombre: r.RealizadorNombre || r.MedicoSolicitanteNombre || 'PROFESIONAL',
					matricula: r.MatriculaRealizador ?? r.MatriculaSolicitante ?? undefined,
				},
			}));

			await exportToPDF({
				title: 'Pedidos de estudios',
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
		}
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

	if (loading) {
		return <BedSectionLoading />;
	}

	const accionesItem = (r: PedidoEstudio, enGrupo = false) => (
		<div className={tableStyles.actionBtns}>
			<button
				type="button"
				className={tableStyles.btnAction}
				title="Ver detalle"
				onClick={() => setSelected(r)}
			>
				<IoEyeOutline color="#5BC0DE" size={18} />
			</button>
			{puedeEditarPedido(r) && (
				<button
					type="button"
					className={tableStyles.btnAction}
					title="Editar pedido"
					onClick={() => abrirEdicionPedido(r)}
				>
					<IoPencilOutline color="#5BC0DE" size={18} />
				</button>
			)}
			{puedeEditarRespuesta(r) && (
				<button
					type="button"
					className={tableStyles.btnAction}
					title="Editar respuesta"
					onClick={() => abrirEdicionRespuesta(r)}
				>
					<IoPencilOutline color="#5BC0DE" size={18} />
				</button>
			)}
			{enGrupo && puedeEliminarPractica(r) && (
				<button
					type="button"
					className={tableStyles.btnAction}
					title="Eliminar esta práctica"
					onClick={() => setDeletingPractica(r)}
				>
					<IoTrashOutline color="#5BC0DE" size={18} />
				</button>
			)}
		</div>
	);

	const filaSolicitud = (s: SolicitudEstudio) => {
		const varias = s.TotalItems > 1;
		const abierta = varias && abiertas.has(s.Clave);
		const primero = s.Items[0];
		const estado = estadoSolicitud(s);
		const servicio = s.ServicioDescripcion || s.SectorReceptorNombre;
		const informeMostrado = new Map<number, string>();
		return (
			<Fragment key={s.Clave}>
				<tr className={`${tableStyles.row} ${abierta ? solStyles.grupoAbierto : ''}`}>
					<td>
						<span
							className={`${tableStyles.urgencia} ${urgenciaClass(s.EstadoUrgencia)}`}
							title={s.EstadoUrgencia || 'Sin urgencia'}
						/>
					</td>
					<td className={tableStyles.meta}>
						{varias ? (
							<span className={`${solStyles.estadoBadge} ${estado.clase}`}>{estado.texto}</span>
						) : (
							estadoItem(primero)
						)}
					</td>
					<td className={tableStyles.meta}>{formatFecha(s)}</td>
					<td className={tableStyles.codigo}>{varias ? '—' : primero.CodigoPractica ?? '—'}</td>
					<td>
						{varias ? (
							<button
								type="button"
								className={solStyles.expander}
								aria-expanded={abierta}
								onClick={() => alternarAbierta(s.Clave)}
							>
								{abierta ? <IoChevronDown size={14} /> : <IoChevronForward size={14} />}
								<span className={tableStyles.practica}>
									{nombreItem(primero)} y {s.TotalItems - 1} más
								</span>
							</button>
						) : (
							<div className={tableStyles.practica}>{primero.PracticaSolicitada}</div>
						)}
						<div className={tableStyles.meta}>
							{varias ? `${s.TotalItems} estudios` : ''}
							{varias && servicio ? ' · ' : ''}
							{servicio ? `Servicio: ${servicio}` : ''}
							{varias ? (
								<>
									{' · '}
									<button
										type="button"
										className={solStyles.linkBtn}
										onClick={() => alternarAbierta(s.Clave)}
									>
										{abierta ? 'Ver menos' : 'Ver más'}
									</button>
								</>
							) : null}
						</div>
					</td>
					<td className={tableStyles.notas}>{previewText(s.NotasObservacion)}</td>
					<td className={tableStyles.notas}>{respuestaSolicitud(s)}</td>
					<td className={tableStyles.meta}>{s.MedicoSolicitanteNombre || '—'}</td>
					<td className={tableStyles.cellAccion}>
						<div className={tableStyles.actionBtns}>
							{varias ? (
								<button
									type="button"
									className={tableStyles.btnAction}
									title={abierta ? 'Ocultar estudios' : 'Ver estudios'}
									onClick={() => alternarAbierta(s.Clave)}
								>
									<IoEyeOutline color="#5BC0DE" size={18} />
								</button>
							) : (
								accionesItem(primero)
							)}
							{puedeEliminarSolicitud(s) && (
								<button
									type="button"
									className={tableStyles.btnAction}
									title={varias ? 'Eliminar solicitud' : 'Eliminar'}
									onClick={() => setDeleting(s)}
								>
									<IoTrashOutline color="#5BC0DE" size={18} />
								</button>
							)}
						</div>
					</td>
				</tr>
				{abierta &&
					s.Items.map((r, idx) => {
						const prot = Number(r.IdProtocolo) || 0;
						const yaMostrado = prot > 0 ? informeMostrado.get(prot) : undefined;
						if (prot > 0 && !yaMostrado) informeMostrado.set(prot, nombreItem(r));
						const ultima = idx === s.Items.length - 1;
						return (
							<tr
								key={r.IdPedido}
								className={`${tableStyles.row} ${solStyles.subRow} ${ultima ? solStyles.subRowUltima : ''}`}
							>
								<td />
								<td className={tableStyles.meta}>
									<span
										className={`${solStyles.estadoBadge} ${solStyles.estadoItem} ${claseEstadoItem(r)}`}
									>
										{estadoItem(r)}
									</span>
								</td>
								<td className={tableStyles.meta}>{r.FechaResultado || ''}</td>
								<td className={tableStyles.codigo}>{r.CodigoPractica ?? '—'}</td>
								<td>
									<div className={`${tableStyles.practica} ${solStyles.subPractica}`}>
										{nombreItem(r)}
									</div>
								</td>
								<td />
								<td className={tableStyles.notas}>
									{yaMostrado ? `Mismo informe que ${yaMostrado}` : respuestaItem(r)}
								</td>
								<td className={tableStyles.meta}>{r.RealizadorNombre || ''}</td>
								<td className={tableStyles.cellAccion}>{accionesItem(r, true)}</td>
							</tr>
						);
					})}
			</Fragment>
		);
	};

	const compartidosEdicion = compartidoCon(editingRespuesta);

	return (
		<>
			<BedSectionLayout
				title="Estudios"
				subtitle="Pedidos de este paciente · el servicio destino los atiende en la bandeja"
				addLabel={puedeCrear ? 'Agregar estudio' : undefined}
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
					placeholder: 'Buscar por práctica, código, notas, profesional…',
				}}
				period={{ value: periodo, onChange: setPeriodo }}
			>
				{error && <div className={styles.error}>{error}</div>}
				{filtered.length === 0 ? (
					<EmptyState
						variant="estudios"
						text={rows.length === 0 ? 'Sin pedidos de estudios' : 'Sin resultados'}
						description={
							rows.length === 0
								? 'Solicitá un estudio con el botón Agregar estudio.'
								: 'Probá con otro criterio de búsqueda o período.'
						}
						actionLabel={puedeCrear && rows.length === 0 ? 'Agregar estudio' : undefined}
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
									<th>Cód.</th>
									<th>Práctica solicitada</th>
									<th>Pedido</th>
									<th>Respuesta</th>
									<th>Solicitado por</th>
									<th className={tableStyles.colAccion}>Acciones</th>
								</tr>
							</thead>
							<tbody className={tableStyles.tbody}>{filtered.map(filaSolicitud)}</tbody>
						</table>
						</div>
					</div>
				)}
			</BedSectionLayout>

			{selected && (
				<PedidoDetalleModal
					kicker="Estudio"
					title={selected.PracticaSolicitada || 'Pedido de estudio'}
					urgencia={selected.EstadoUrgencia}
					estado={
						selected.EstadoWorkflow ||
						(selected.Cumplido ? 'Cumplido' : selected.Tomado ? 'Tomado' : 'Pendiente')
					}
					fields={buildEstudioFields(selected)}
					textBlocks={buildEstudioTextBlocks(selected)}
					onClose={() => setSelected(null)}
					onEditarPedido={
						puedeEditarPedido(selected) ? () => abrirEdicionPedido(selected) : undefined
					}
					onEditarRespuesta={
						puedeEditarRespuesta(selected) ? () => abrirEdicionRespuesta(selected) : undefined
					}
				/>
			)}

			{showSolicitar && origenPedido && (
				<SolicitarEstudioModal
					open={showSolicitar}
					idVisita={numeroVisita}
					sectorSolicitante={origenPedido}
					onClose={() => setShowSolicitar(false)}
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
					compartidoCon={compartidosEdicion}
					onClose={() => setEditingRespuesta(null)}
					onCumplido={() => {
						setEditingRespuesta(null);
						void loadVisita();
					}}
				/>
			)}

			{editing && (
				<SolicitarEstudioModal
					open={Boolean(editing)}
					idVisita={numeroVisita}
					sectorSolicitante={origenPedido || editing.SectorSolicitante || ''}
					pedido={editing}
					practicasHermanas={hermanasDe(editing)}
					onClose={() => setEditing(null)}
					onCreated={() => {
						void loadVisita();
					}}
				/>
			)}

			<ConfirmationModal
				isOpen={Boolean(deleting || deletingPractica)}
				onClose={() => {
					if (deletingBusy) return;
					setDeleting(null);
					setDeletingPractica(null);
				}}
				onConfirm={() => {
					void handleConfirmDelete();
				}}
				title={
					deletingPractica
						? 'Eliminar práctica'
						: deleting && deleting.TotalItems > 1
							? 'Eliminar solicitud'
							: 'Eliminar pedido'
				}
				message={
					deletingPractica
						? `¿Quitar “${nombreItem(deletingPractica)}” de este pedido? El resto de las prácticas sigue igual.`
						: deleting
						? deleting.TotalItems > 1
							? `¿Eliminar la solicitud con ${deleting.TotalItems} estudios (${deleting.Items.map(nombreItem).join(', ')})? Solo se puede mientras está pendiente.`
							: `¿Eliminar el pedido “${nombreItem(deleting.Items[0])}”? Solo se puede mientras está pendiente.`
						: ''
				}
				confirmText={deletingBusy ? 'Eliminando…' : 'Eliminar'}
				cancelText="Cancelar"
			/>
		</>
	);
}
