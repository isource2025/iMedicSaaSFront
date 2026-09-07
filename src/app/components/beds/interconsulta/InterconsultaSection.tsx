'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	interconsultasService,
	InterconsultaRow,
} from '@/app/services/interconsultasService';
import { usePermiso } from '@/app/hooks/usePermiso';
import BedSectionLoading from '../shared/BedSectionLoading';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import { buildPacienteFields } from '../shared/pacientePedidoFields';
import { autorRespuesta, esAutorRespuesta, esSolicitante } from '../shared/pedidoResponsable';
import SolicitarInterconsultaModal from './SolicitarInterconsultaModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { generarPDFInterconsulta } from '../../../utils/pdfInterconsulta';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import styles from './InterconsultaSection.module.css';
import tableStyles from '../shared/BedTable.module.css';
import { IoEyeOutline, IoPencilOutline } from 'react-icons/io5';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import CumplirEstudioModal from '../estudios/CumplirEstudioModal';
import type { PedidoEstudio } from '@/app/types/estudios';

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

function formatFecha(row: InterconsultaRow) {
	return [row.FechaSolicitud, row.HoraSolicitud].filter(Boolean).join(' ');
}

function previewText(value?: string | null, max = 100) {
	const t = String(value || '').trim();
	if (!t) return '—';
	return t.length > max ? `${t.slice(0, max)}…` : t;
}

function esCumplida(row: InterconsultaRow) {
	return !!row.Cumplido || (row.IdProtocolo != null && row.IdProtocolo > 0) || !!row.Respuesta;
}

function buildInterconsultaFields(row: InterconsultaRow) {
	if (row.Origen === 'WEB') {
		return [
			...buildPacienteFields(row),
			{ label: 'Especialidad', value: row.Especialidad, full: true },
			{ label: 'Matrícula', value: row.MedicoSolicitante },
			{ label: 'Origen', value: 'Registro web' },
		];
	}

	const cumplido = esCumplida(row);
	return [
		...buildPacienteFields(row),
		{
			label: 'Servicio destino',
			value: row.ServicioDescripcion || row.SectorReceptorNombre || row.Especialidad,
			full: true,
		},
		{ label: 'Solicitado por', value: row.MedicoSolicitanteNombre },
		{ label: 'Matrícula', value: row.MedicoSolicitante },
		{ label: 'Tomado por', value: row.NombreToma || (row.MatriculaToma ? String(row.MatriculaToma) : null) },
		{ label: 'Respondido por', value: cumplido ? autorRespuesta(row) : null },
		{ label: 'Sector origen', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{ label: 'Cód. práctica', value: row.CodigoPractica },
		{ label: 'Id pedido', value: row.IdPedido || row.IdInterconsulta },
		{ label: 'Id resultado', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
	];
}

function buildInterconsultaTextBlocks(row: InterconsultaRow) {
	const cumplido = esCumplida(row);
	return [
		{
			label: 'Pedido',
			value: row.Motivo || null,
			autor: row.MedicoSolicitanteNombre || null,
			fecha: row.FechaSolicitud || null,
			hora: row.HoraSolicitud || null,
		},
		{
			label: 'Respuesta',
			value: cumplido ? row.Respuesta || '(sin texto de respuesta)' : row.Respuesta || null,
			autor: cumplido ? autorRespuesta(row) : null,
			fecha: row.FechaRespuesta || null,
		},
	];
}

function interconsultaComoPedido(row: InterconsultaRow): PedidoEstudio {
	return {
		IdPedido: Number(row.IdPedido || row.IdInterconsulta) || 0,
		IdVisita: row.IdVisita,
		FechaPedidoISO: row.FechaSolicitud,
		HoraPedido: row.HoraSolicitud,
		PracticaSolicitada:
			row.PracticaSolicitada ||
			row.ServicioDescripcion ||
			row.Especialidad ||
			'Interconsulta',
		NotasObservacion: row.Motivo,
		MedicoSolicitanteNombre: row.MedicoSolicitanteNombre,
		MatriculaSolicitante: row.MedicoSolicitante,
		TextoResultado: row.Respuesta || null,
		SectorSolicitante: row.SectorSolicitante,
		SectorSolicitanteNombre: row.SectorSolicitanteNombre,
		SectorReceptor: row.SectorReceptor,
		SectorReceptorNombre: row.SectorReceptorNombre,
		ServicioDescripcion: row.ServicioDescripcion,
		Cumplido: true,
		MatriculaRealizador: row.MatriculaRealizador,
		RealizadorNombre: row.RealizadorNombre,
		MatriculaToma: row.MatriculaToma,
		NombreToma: row.NombreToma,
		CodOperadorResultado: row.CodOperadorResultado,
		CodOperadorToma: row.CodOperadorToma,
		PacienteNombre: row.PacienteNombre,
		PacienteDocumento: row.PacienteDocumento,
		PacienteTipoDocumento: row.PacienteTipoDocumento,
		PacienteSexo: row.PacienteSexo,
		PacienteSexoDescripcion: row.PacienteSexoDescripcion,
		PacienteFechaNacimiento: row.PacienteFechaNacimiento,
		PacienteEdad: row.PacienteEdad,
		ObraSocial: row.ObraSocial,
		Ubicacion: row.Ubicacion,
		TipoAtencion: row.TipoAtencion,
		IdPaciente: row.IdPaciente,
	};
}

export default function InterconsultaSection({
	numeroVisita,
	sectorSolicitante,
	patientName,
	documentoPaciente,
	patientLocation,
}: Props) {
	const { puede } = usePermiso();
	const usuarioActual = useUsuarioActual();
	const canCreate = puede('INTERNACION.INTERCONSULTAS.CREAR');
	const canEdit = puede('INTERNACION.INTERCONSULTAS.EDITAR') || canCreate;

	const [rows, setRows] = useState<InterconsultaRow[]>([]);
	const [showSolicitar, setShowSolicitar] = useState(false);
	const [loading, setLoading] = useState(true);
	const [exportingDetail, setExportingDetail] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<InterconsultaRow | null>(null);
	const [editingPedido, setEditingPedido] = useState<InterconsultaRow | null>(null);
	const [editingRespuesta, setEditingRespuesta] = useState<InterconsultaRow | null>(null);
	const [query, setQuery] = useState('');

	const loadVisita = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			setRows(await interconsultasService.listarPorVisita(numeroVisita));
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
				hay(r.Motivo) ||
				hay(r.Respuesta) ||
				hay(r.ServicioDescripcion) ||
				hay(r.SectorReceptorNombre) ||
				hay(r.Especialidad) ||
				hay(r.MedicoSolicitanteNombre) ||
				hay(r.EstadoWorkflow) ||
				hay(r.Estado)
			);
		});
	}, [rows, query]);

	const handleRowClick = (row: InterconsultaRow) => {
		setSelected(row);
	};

	const puedeEditarPedido = (row: InterconsultaRow) =>
		canEdit && row.Origen !== 'WEB' && esSolicitante(row, usuarioActual);

	const puedeEditarRespuesta = (row: InterconsultaRow) =>
		row.Origen !== 'WEB' && esCumplida(row) && esAutorRespuesta(row, usuarioActual);

	const abrirEdicionPedido = (row: InterconsultaRow) => {
		setSelected(null);
		setEditingPedido(row);
	};

	const abrirEdicionRespuesta = (row: InterconsultaRow) => {
		setSelected(null);
		setEditingRespuesta(row);
	};

	const selectedTextBlocks = selected ? buildInterconsultaTextBlocks(selected) : [];

	const patientInfo = {
		numeroVisita: numeroVisita || undefined,
		nombre: patientName,
		numeroDocumento: documentoPaciente,
		documento: documentoPaciente,
		ubicacion: patientLocation,
	};

	const handleExport = async (option: ExportOption, _data?: InterconsultaRow[]) => {
		if (option === 'pdf') {
			const empresaInfo = await obtenerInfoEmpresa();
			const parts = filtered.map((r, idx) => {
				const tomado = !!r.Tomado;
				const cumplido = esCumplida(r);
				return {
					title: `Interconsulta ${idx + 1}`,
					fields: [
						{ label: 'Fecha / hora', value: formatFecha(r) },
						{
							label: 'Servicio destino',
							value: r.ServicioDescripcion || r.SectorReceptorNombre || r.Especialidad || '—',
						},
						{
							label: 'Estado',
							value:
								r.EstadoWorkflow ||
								(cumplido ? 'Cumplido' : tomado ? 'Tomado' : 'Pendiente'),
						},
						{ label: 'Fecha respuesta', value: r.FechaRespuesta || '—' },
						{
							label: 'Respondido por',
							value: (cumplido && autorRespuesta(r)) || '—',
						},
					],
					textBlocks: [
						{ label: 'Pedido', value: r.Motivo || '—' },
						{
							label: 'Respuesta',
							value: r.Respuesta || (cumplido ? '(sin texto)' : 'Sin respuesta cargada'),
						},
					],
					profesional: {
						nombre: r.MedicoSolicitanteNombre || 'PROFESIONAL',
						matricula: r.MedicoSolicitante ?? undefined,
					},
				};
			});

			await exportToPDF({
				title: 'Interconsultas',
				subtitle: `Visita: ${numeroVisita}`,
				parts,
				fileName: `interconsultas_${numeroVisita}.pdf`,
				orientation: 'portrait',
				empresaInfo,
				patientInfo,
			});
		}
	};

	const handleExportDetail = async () => {
		if (!selected) return;
		setExportingDetail(true);
		try {
			const empresaInfo = await obtenerInfoEmpresa();
			const title =
				selected.ServicioDescripcion ||
				selected.Especialidad ||
				selected.PracticaSolicitada ||
				'Interconsulta';
			await generarPDFInterconsulta({
				title,
				fields: buildInterconsultaFields(selected),
				textBlocks: selectedTextBlocks,
				urgencia: selected.EstadoUrgencia,
				patient: patientInfo,
				empresaInfo,
				fileName: `interconsulta_${numeroVisita}_${selected.IdPedido || selected.IdInterconsulta || 'detalle'}.pdf`,
			});
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : 'No se pudo generar el PDF');
		} finally {
			setExportingDetail(false);
		}
	};

	if (!numeroVisita) {
		return (
			<EmptyState
				variant="interconsulta"
				text="No hay visita seleccionada"
				description="Abrí una internación para ver las interconsultas."
			/>
		);
	}

	if (loading) {
		return <BedSectionLoading />;
	}

	return (
		<>
			<BedSectionLayout
				title="Interconsultas"
				subtitle="El servicio destino las atiende desde la bandeja de pedidos"
				addLabel={canCreate ? 'Interconsulta' : undefined}
				onAdd={canCreate ? () => setShowSolicitar(true) : undefined}
				exportSlot={
					<ExportButton
						data={filtered}
						fileName={`interconsultas_${numeroVisita}.pdf`}
						onExport={handleExport}
						options={['pdf']}
					/>
				}
				search={{
					value: query,
					onChange: setQuery,
					placeholder: 'Buscar por destino, motivo, profesional, estado…',
				}}
			>
				{error && <div className={styles.error}>{error}</div>}
				{filtered.length === 0 ? (
					<EmptyState
						variant="interconsulta"
						text={rows.length === 0 ? 'Sin interconsultas' : 'Sin resultados'}
						description={
							rows.length === 0
								? 'Solicitá una interconsulta con el botón + Interconsulta.'
								: 'Probá con otro criterio de búsqueda.'
						}
						actionLabel={canCreate && rows.length === 0 ? 'Interconsulta' : undefined}
						onAction={canCreate && rows.length === 0 ? () => setShowSolicitar(true) : undefined}
					/>
				) : (
					<div className={tableStyles.tableWrap}>
						<div className={tableStyles.scrollArea}>
						<table className={tableStyles.table}>
							<thead className={tableStyles.thead}>
								<tr>
									<th>Urg.</th>
									<th>Fecha / hora</th>
									<th>Servicio destino</th>
									<th>Pedido</th>
									<th>Respuesta</th>
									<th>Solicitado por</th>
									<th>Estado</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody className={tableStyles.tbody}>
								{filtered.map((r) => {
									const id = r.IdPedido || r.IdInterconsulta;
									const tomado = !!r.Tomado;
									const cumplido = esCumplida(r);
									const responsable = cumplido
										? autorRespuesta(r)
										: tomado
											? r.NombreToma || null
											: null;
									return (
										<tr key={`${r.Origen || 'LEGACY'}-${id}`} className={tableStyles.row}>
											<td>
												<span
													className={`${tableStyles.urgencia} ${urgenciaClass(r.EstadoUrgencia || r.Estado)}`}
													title={r.EstadoUrgencia || r.Estado || 'Sin urgencia'}
												/>
											</td>
											<td className={tableStyles.meta}>{formatFecha(r)}</td>
											<td>
												<div className={tableStyles.destino}>
													{r.ServicioDescripcion ||
														r.SectorReceptorNombre ||
														r.Especialidad ||
														'—'}
												</div>
												{r.Origen === 'WEB' && (
													<div className={tableStyles.meta}>Registro web (legado)</div>
												)}
											</td>
											<td className={tableStyles.motivo}>{previewText(r.Motivo)}</td>
											<td className={tableStyles.motivo}>
												{r.Respuesta
													? previewText(r.Respuesta)
													: cumplido
														? '(sin texto)'
														: '—'}
											</td>
											<td className={tableStyles.meta}>{r.MedicoSolicitanteNombre || '—'}</td>
											<td className={tableStyles.meta}>
												{r.EstadoWorkflow ||
													(cumplido ? 'Cumplido' : tomado ? 'Tomado' : 'Pendiente')}
												{responsable ? ` · ${responsable}` : ''}
											</td>
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
												</div>
											</td>
										</tr>
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
					kicker="Interconsulta"
					title={
						selected.ServicioDescripcion ||
						selected.Especialidad ||
						selected.PracticaSolicitada ||
						'Interconsulta'
					}
					urgencia={selected.EstadoUrgencia}
					estado={selected.EstadoWorkflow || selected.Estado}
					fields={buildInterconsultaFields(selected)}
					textBlocks={selectedTextBlocks}
					onClose={() => setSelected(null)}
					onExportPdf={handleExportDetail}
					exporting={exportingDetail}
					onEditarPedido={
						puedeEditarPedido(selected) ? () => abrirEdicionPedido(selected) : undefined
					}
					onEditarRespuesta={
						puedeEditarRespuesta(selected)
							? () => abrirEdicionRespuesta(selected)
							: undefined
					}
				/>
			)}

			{editingPedido ? (
				<SolicitarInterconsultaModal
					open={Boolean(editingPedido)}
					idVisita={numeroVisita}
					sectorSolicitante={sectorSolicitante}
					pedido={editingPedido}
					onClose={() => setEditingPedido(null)}
					onCreated={() => {
						setEditingPedido(null);
						void loadVisita();
					}}
				/>
			) : null}

			{editingRespuesta ? (
				<CumplirEstudioModal
					open={Boolean(editingRespuesta)}
					pedido={interconsultaComoPedido(editingRespuesta)}
					modoEdicion
					guardarInforme={async (texto) => {
						const id = Number(
							editingRespuesta.IdPedido || editingRespuesta.IdInterconsulta,
						);
						if (!Number.isFinite(id) || id <= 0) {
							throw new Error('Interconsulta inválida');
						}
						await interconsultasService.actualizarRespuesta(id, texto);
					}}
					onClose={() => setEditingRespuesta(null)}
					onCumplido={() => {
						setEditingRespuesta(null);
						void loadVisita();
					}}
				/>
			) : null}

			{showSolicitar ? (
				<SolicitarInterconsultaModal
					open={showSolicitar}
					idVisita={numeroVisita}
					sectorSolicitante={sectorSolicitante}
					onClose={() => setShowSolicitar(false)}
					onCreated={() => {
						void loadVisita();
					}}
				/>
			) : null}
		</>
	);
}
