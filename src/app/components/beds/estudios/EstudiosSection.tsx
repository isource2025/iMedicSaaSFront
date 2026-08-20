'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { PedidoEstudio } from '@/app/types/estudios';
import { usePermiso } from '@/app/hooks/usePermiso';
import BedSectionLoading from '../shared/BedSectionLoading';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import SolicitarEstudioModal from './SolicitarEstudioModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import styles from './EstudiosSection.module.css';
import tableStyles from '../shared/BedTable.module.css';
import { IoEyeOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import ConfirmationModal from '../shared/ConfirmationModal';

type Props = {
	numeroVisita: number | null;
	sectorSolicitante?: string | null;
	patientName?: string;
	documentoPaciente?: string;
	patientLocation?: string;
};

function urgenciaClass(estado?: string) {
	const v = (estado || '').trim().toLowerCase();
	if (v.includes('urgent')) return tableStyles.urgenciaUrgente;
	if (v.includes('medio')) return tableStyles.urgenciaMedio;
	if (v.includes('bajo') || v.includes('normal')) return tableStyles.urgenciaBajo;
	return tableStyles.urgenciaNone;
}

function formatFecha(row: PedidoEstudio) {
	const f = row.FechaPedidoISO || '';
	const h = row.HoraPedido || '';
	return [f, h].filter(Boolean).join(' ');
}

function pedidoPendiente(row: PedidoEstudio) {
	if (row.Cumplido || Number(row.IdProtocolo) > 0) return false;
	if (row.Tomado) return false;
	const w = String(row.EstadoWorkflow || '').toUpperCase();
	if (w === 'TOMADO' || w === 'CUMPLIDO' || w === 'RESPONDIDO') return false;
	return true;
}

function esCreadorPedido(
	row: PedidoEstudio,
	usuario: { matricula: number | null; valorPersonal: number | null; codOperador: number | null } | null,
) {
	if (!usuario) return false;
	const autor = Number(row.MatriculaSolicitante);
	if (!Number.isFinite(autor) || autor <= 0) return false;
	return (
		(usuario.matricula != null && autor === usuario.matricula) ||
		(usuario.valorPersonal != null && autor === usuario.valorPersonal) ||
		(usuario.codOperador != null && autor === usuario.codOperador)
	);
}

function previewText(value?: string | null, max = 100) {
	const t = String(value || '').trim();
	if (!t) return '—';
	return t.length > max ? `${t.slice(0, max)}…` : t;
}

function buildEstudioFields(row: PedidoEstudio) {
	return [
		{ label: 'Fecha / hora', value: formatFecha(row) },
		{ label: 'Código práctica', value: row.CodigoPractica },
		{ label: 'Tipo de pedido', value: row.TipoPedidoDescripcion || row.PracticaSolicitada },
		{ label: 'Nomenclador', value: row.NomencladorDescripcion, full: true },
		{ label: 'Solicitado por', value: row.MedicoSolicitanteNombre },
		{ label: 'Matrícula', value: row.MatriculaSolicitante },
		{ label: 'Tomado por', value: row.NombreToma || (row.MatriculaToma ? String(row.MatriculaToma) : null) },
		{ label: 'Sector solicitante', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{
			label: 'Destino / servicio',
			value: row.ServicioDescripcion || row.SectorReceptorNombre || row.SectorReceptor,
			full: true,
		},
		{ label: 'Fecha resultado', value: row.FechaResultado },
		{ label: 'Realizado por', value: row.RealizadorNombre },
		{ label: 'Id resultado', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
		{ label: 'Id pedido', value: row.IdPedido },
	];
}

function buildEstudioTextBlocks(row: PedidoEstudio) {
	return [
		{ label: 'Pedido', value: row.NotasObservacion || null },
		{
			label: 'Respuesta',
			value: row.Cumplido
				? row.TextoResultado || '(sin texto de respuesta)'
				: row.TextoResultado || null,
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
	const puedeCrear = puede('INTERNACION.ESTUDIOS.CREAR');
	const puedeEditar =
		puede('INTERNACION.ESTUDIOS.EDITAR') || puedeCrear;
	const puedeEliminar =
		puede('INTERNACION.ESTUDIOS.ELIMINAR') || puedeCrear;
	const [rows, setRows] = useState<PedidoEstudio[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<PedidoEstudio | null>(null);
	const [editing, setEditing] = useState<PedidoEstudio | null>(null);
	const [deleting, setDeleting] = useState<PedidoEstudio | null>(null);
	const [deletingBusy, setDeletingBusy] = useState(false);
	const [showSolicitar, setShowSolicitar] = useState(false);
	const [query, setQuery] = useState('');

	const loadVisita = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			setRows(await estudiosService.listarPorVisita(numeroVisita));
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
		return rows.filter((r) => {
			const hay = (v?: string | number | null) =>
				v != null && String(v).toLowerCase().includes(q);
			return (
				hay(r.PracticaSolicitada) ||
				hay(r.CodigoPractica) ||
				hay(r.NotasObservacion) ||
				hay(r.TextoResultado) ||
				hay(r.MedicoSolicitanteNombre) ||
				hay(r.ServicioDescripcion) ||
				hay(r.EstadoWorkflow)
			);
		});
	}, [rows, query]);

	const handleRowClick = (row: PedidoEstudio) => {
		setSelected(row);
	};

	const puedeGestionarPedido = (row: PedidoEstudio) =>
		pedidoPendiente(row) && esCreadorPedido(row, usuarioActual);

	const handleConfirmDelete = async () => {
		if (!deleting) return;
		setDeletingBusy(true);
		setError(null);
		try {
			await estudiosService.eliminar(deleting.IdPedido);
			setDeleting(null);
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
			const parts = rows.map((r, idx) => ({
				title: `Estudio ${idx + 1}`,
				fields: [
					{
						label: 'Estado',
						value: r.Cumplido ? 'Cumplido' : r.Tomado ? 'Tomado' : 'Pendiente',
					},
					{ label: 'Fecha / hora', value: formatFecha(r) },
					{ label: 'Código', value: r.CodigoPractica ?? '—' },
					{ label: 'Práctica', value: r.PracticaSolicitada || '—' },
					{
						label: 'Destino',
						value: r.ServicioDescripcion || r.SectorReceptorNombre || '—',
					},
					{ label: 'Fecha resultado', value: r.FechaResultado || '—' },
					{ label: 'Realizado por', value: r.RealizadorNombre || '—' },
				],
				textBlocks: [
					{ label: 'Pedido', value: r.NotasObservacion || '—' },
					{
						label: 'Respuesta',
						value: r.TextoResultado || (r.Cumplido ? '(sin texto)' : 'Sin respuesta cargada'),
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

	return (
		<>
			<BedSectionLayout
				title="Estudios"
				subtitle="Pedidos de este paciente · el servicio destino los atiende en la bandeja"
				addLabel={puedeCrear ? 'Estudio' : undefined}
				onAdd={puedeCrear ? () => setShowSolicitar(true) : undefined}
				addDisabled={!sectorSolicitante}
				addTitle={!sectorSolicitante ? 'Sin sector de la cama' : undefined}
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
			>
				{error && <div className={styles.error}>{error}</div>}
				{filtered.length === 0 ? (
					<EmptyState
						variant="estudios"
						text={rows.length === 0 ? 'Sin pedidos de estudios' : 'Sin resultados'}
						description={
							rows.length === 0
								? 'Solicitá un estudio con el botón + Estudio.'
								: 'Probá con otro criterio de búsqueda.'
						}
						actionLabel={puedeCrear && rows.length === 0 ? 'Estudio' : undefined}
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
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody className={tableStyles.tbody}>
								{filtered.map((r) => (
									<tr key={r.IdPedido} className={tableStyles.row}>
										<td>
											<span
												className={`${tableStyles.urgencia} ${urgenciaClass(r.EstadoUrgencia)}`}
												title={r.EstadoUrgencia || 'Sin urgencia'}
											/>
										</td>
										<td className={tableStyles.meta}>
											{r.Cumplido
												? 'Cumplido'
												: r.Tomado
													? `Tomado${r.NombreToma ? ` · ${r.NombreToma}` : ''}`
													: 'Pendiente'}
										</td>
										<td className={tableStyles.meta}>{formatFecha(r)}</td>
										<td className={tableStyles.codigo}>{r.CodigoPractica ?? '—'}</td>
										<td>
											<div className={tableStyles.practica}>{r.PracticaSolicitada}</div>
											{(r.ServicioDescripcion || r.SectorReceptorNombre) && (
												<div className={tableStyles.meta}>
													Destino: {r.ServicioDescripcion || r.SectorReceptorNombre}
												</div>
											)}
										</td>
										<td className={tableStyles.notas}>{previewText(r.NotasObservacion)}</td>
										<td className={tableStyles.notas}>
											{r.TextoResultado
												? previewText(r.TextoResultado)
												: r.Cumplido
													? '(sin texto)'
													: '—'}
										</td>
										<td className={tableStyles.meta}>{r.MedicoSolicitanteNombre || '—'}</td>
										<td>
											<div className={tableStyles.actionBtns}>
											<button
												type="button"
												className={tableStyles.btnAction}
												title="Ver detalle"
												onClick={() => handleRowClick(r)}
											>
												<IoEyeOutline color="#5BC0DE" size={18} />
											</button>
											{puedeEditar && puedeGestionarPedido(r) && (
												<button
													type="button"
													className={tableStyles.btnAction}
													title="Editar"
													onClick={() => setEditing(r)}
												>
													<IoPencilOutline color="#5BC0DE" size={18} />
												</button>
											)}
											{puedeEliminar && puedeGestionarPedido(r) && (
												<button
													type="button"
													className={tableStyles.btnAction}
													title="Eliminar"
													onClick={() => setDeleting(r)}
												>
													<IoTrashOutline color="#5BC0DE" size={18} />
												</button>
											)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
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
				/>
			)}

			{showSolicitar && sectorSolicitante && (
				<SolicitarEstudioModal
					open={showSolicitar}
					idVisita={numeroVisita}
					sectorSolicitante={sectorSolicitante}
					onClose={() => setShowSolicitar(false)}
					onCreated={() => {
						void loadVisita();
					}}
				/>
			)}

			{editing && (
				<SolicitarEstudioModal
					open={Boolean(editing)}
					idVisita={numeroVisita}
					sectorSolicitante={sectorSolicitante || editing.SectorSolicitante || ''}
					pedido={editing}
					onClose={() => setEditing(null)}
					onCreated={() => {
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
				title="Eliminar pedido"
				message={
					deleting
						? `¿Eliminar el pedido “${deleting.PracticaSolicitada || deleting.IdPedido}”? Solo se puede mientras está pendiente.`
						: ''
				}
				confirmText={deletingBusy ? 'Eliminando…' : 'Eliminar'}
				cancelText="Cancelar"
			/>
		</>
	);
}
