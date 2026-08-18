'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	interconsultasService,
	InterconsultaRow,
} from '@/app/services/interconsultasService';
import { usePermiso } from '@/app/hooks/usePermiso';
import BedSectionLoading from '../shared/BedSectionLoading';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import SolicitarInterconsultaModal from './SolicitarInterconsultaModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { generarPDFInterconsulta } from '../../../utils/pdfInterconsulta';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import styles from './InterconsultaSection.module.css';
import tableStyles from '../shared/BedTable.module.css';
import { IoEyeOutline } from 'react-icons/io5';

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

function buildInterconsultaFields(row: InterconsultaRow) {
	if (row.Origen === 'WEB') {
		return [
			{ label: 'Fecha / hora', value: formatFecha(row) },
			{ label: 'Especialidad solicitada', value: row.Especialidad, full: true },
			{ label: 'Médico solicitante', value: row.MedicoSolicitanteNombre },
			{ label: 'Matrícula', value: row.MedicoSolicitante },
			{ label: 'Origen', value: 'Registro web (legado)' },
		];
	}

	return [
		{ label: 'Fecha / hora', value: formatFecha(row) },
		{
			label: 'Servicio destino',
			value: row.ServicioDescripcion || row.SectorReceptorNombre || row.Especialidad,
			full: true,
		},
		{ label: 'Médico solicitante', value: row.MedicoSolicitanteNombre },
		{ label: 'Matrícula', value: row.MedicoSolicitante },
		{ label: 'Tomado por', value: row.NombreToma || (row.MatriculaToma ? String(row.MatriculaToma) : null) },
		{ label: 'Sector solicitante', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{ label: 'Código práctica', value: row.CodigoPractica },
		{ label: 'Id pedido', value: row.IdPedido || row.IdInterconsulta },
		{ label: 'Id resultado', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
	];
}

export default function InterconsultaSection({
	numeroVisita,
	sectorSolicitante,
	patientName,
	documentoPaciente,
	patientLocation,
}: Props) {
	const { puede } = usePermiso();
	const canCreate = puede('INTERNACION.INTERCONSULTAS.CREAR');

	const [rows, setRows] = useState<InterconsultaRow[]>([]);
	const [showSolicitar, setShowSolicitar] = useState(false);
	const [loading, setLoading] = useState(true);
	const [exportingDetail, setExportingDetail] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<InterconsultaRow | null>(null);
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

	const selectedTextBlocks = selected
		? [
				{ label: 'Motivo / consulta', value: selected.Motivo },
				...(selected.Respuesta ? [{ label: 'Respuesta', value: selected.Respuesta }] : []),
			]
		: [];

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
				const cumplido = !!r.Cumplido || (r.IdProtocolo != null && r.IdProtocolo > 0);
				return {
					title: `Interconsulta ${idx + 1}`,
					fields: [
						{ label: 'Fecha / hora', value: formatFecha(r) },
						{
							label: 'Destino',
							value: r.ServicioDescripcion || r.SectorReceptorNombre || r.Especialidad || '—',
						},
						{
							label: 'Estado',
							value:
								r.EstadoWorkflow ||
								(cumplido ? 'Cumplido' : tomado ? 'Tomado' : 'Pendiente'),
						},
					],
					textLabel: 'Motivo',
					text: r.Motivo || '—',
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
									<th>Destino</th>
									<th>Motivo</th>
									<th>Solicitado por</th>
									<th>Estado</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody className={tableStyles.tbody}>
								{filtered.map((r) => {
									const id = r.IdPedido || r.IdInterconsulta;
									const tomado = !!r.Tomado;
									const cumplido = !!r.Cumplido || (r.IdProtocolo != null && r.IdProtocolo > 0);
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
											<td className={tableStyles.motivo}>
												{(r.Motivo || '').length > 120
													? `${r.Motivo.slice(0, 120)}…`
													: r.Motivo || '—'}
											</td>
											<td className={tableStyles.meta}>{r.MedicoSolicitanteNombre || '—'}</td>
											<td className={tableStyles.meta}>
												{r.EstadoWorkflow ||
													(cumplido ? 'Cumplido' : tomado ? 'Tomado' : 'Pendiente')}
												{tomado && r.NombreToma ? ` · ${r.NombreToma}` : ''}
											</td>
											<td>
												<button
													type="button"
													className={tableStyles.btnAction}
													title="Ver detalle"
													onClick={() => handleRowClick(r)}
												>
													<IoEyeOutline color="#5BC0DE" size={18} />
												</button>
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
				/>
			)}

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
