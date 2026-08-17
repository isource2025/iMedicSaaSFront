'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { PedidoEstudio } from '@/app/types/estudios';
import { usePermiso } from '@/app/hooks/usePermiso';
import Loader from '../../Loader/Loader';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import SolicitarEstudioModal from './SolicitarEstudioModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import styles from './EstudiosSection.module.css';
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
	if (v.includes('urgent')) return styles.urgenciaUrgente;
	if (v.includes('medio')) return styles.urgenciaMedio;
	if (v.includes('bajo') || v.includes('normal')) return styles.urgenciaBajo;
	return styles.urgenciaNone;
}

function formatFecha(row: PedidoEstudio) {
	const f = row.FechaPedidoISO || '';
	const h = row.HoraPedido || '';
	return [f, h].filter(Boolean).join(' ');
}

function buildEstudioFields(row: PedidoEstudio) {
	return [
		{ label: 'Fecha / hora', value: formatFecha(row) },
		{
			label: 'Estado',
			value:
				row.EstadoWorkflow ||
				(row.Cumplido ? 'Cumplido' : row.Tomado ? 'Tomado' : 'Pendiente'),
		},
		{ label: 'Código práctica', value: row.CodigoPractica },
		{ label: 'Tipo de pedido', value: row.TipoPedidoDescripcion || row.PracticaSolicitada },
		{ label: 'Nomenclador', value: row.NomencladorDescripcion },
		{ label: 'Solicitado por', value: row.MedicoSolicitanteNombre },
		{ label: 'Matrícula', value: row.MatriculaSolicitante },
		{ label: 'Tomado por', value: row.NombreToma || (row.MatriculaToma ? String(row.MatriculaToma) : null) },
		{ label: 'Sector solicitante', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{
			label: 'Destino / servicio',
			value: row.ServicioDescripcion || row.SectorReceptorNombre || row.SectorReceptor,
		},
		{ label: 'Id resultado', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
		{ label: 'Id pedido', value: row.IdPedido },
		{ label: 'Realizado por', value: row.RealizadorNombre },
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
	const puedeCrear = puede('INTERNACION.ESTUDIOS.CREAR');
	const [rows, setRows] = useState<PedidoEstudio[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<PedidoEstudio | null>(null);
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
				hay(r.MedicoSolicitanteNombre) ||
				hay(r.ServicioDescripcion) ||
				hay(r.EstadoWorkflow)
			);
		});
	}, [rows, query]);

	const handleRowClick = async (row: PedidoEstudio) => {
		const detail = await estudiosService.obtenerPorId(row.IdPedido);
		setSelected(detail || row);
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
					{ label: 'Notas', value: r.NotasObservacion || '—' },
					{
						label: 'Destino',
						value: r.ServicioDescripcion || r.SectorReceptorNombre || '—',
					},
				],
				profesional: {
					nombre: r.MedicoSolicitanteNombre || 'PROFESIONAL',
					matricula: r.MatriculaSolicitante ?? undefined,
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
				{loading ? (
					<div style={{ position: 'relative', minHeight: 200 }}>
						<Loader />
					</div>
				) : filtered.length === 0 ? (
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
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Urg.</th>
									<th>Estado</th>
									<th>Fecha / hora</th>
									<th>Cód.</th>
									<th>Práctica solicitada</th>
									<th>Notas</th>
									<th>Solicitado por</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((r) => (
									<tr key={r.IdPedido}>
										<td>
											<span
												className={`${styles.urgencia} ${urgenciaClass(r.EstadoUrgencia)}`}
												title={r.EstadoUrgencia || 'Sin urgencia'}
											/>
										</td>
										<td className={styles.meta}>
											{r.Cumplido
												? 'Cumplido'
												: r.Tomado
													? `Tomado${r.NombreToma ? ` · ${r.NombreToma}` : ''}`
													: 'Pendiente'}
										</td>
										<td className={styles.meta}>{formatFecha(r)}</td>
										<td className={styles.codigo}>{r.CodigoPractica ?? '—'}</td>
										<td>
											<div className={styles.practica}>{r.PracticaSolicitada}</div>
											{(r.ServicioDescripcion || r.SectorReceptorNombre) && (
												<div className={styles.meta}>
													Destino: {r.ServicioDescripcion || r.SectorReceptorNombre}
												</div>
											)}
										</td>
										<td className={styles.notas}>
											{r.NotasObservacion
												? r.NotasObservacion.length > 120
													? `${r.NotasObservacion.slice(0, 120)}…`
													: r.NotasObservacion
												: '—'}
										</td>
										<td className={styles.meta}>{r.MedicoSolicitanteNombre || '—'}</td>
										<td>
											<button
												type="button"
												className={styles.btnAction}
												title="Ver detalle"
												onClick={() => void handleRowClick(r)}
											>
												<IoEyeOutline color="#5BC0DE" size={18} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</BedSectionLayout>

			{selected && (
				<PedidoDetalleModal
					title={selected.PracticaSolicitada || 'Pedido de estudio'}
					urgencia={selected.EstadoUrgencia}
					fields={buildEstudioFields(selected)}
					textBlocks={[
						{ label: 'Notas / observación', value: selected.NotasObservacion },
						...(selected.Cumplido
							? [{ label: 'Resultado', value: selected.TextoResultado || '(sin texto)' }]
							: []),
					]}
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
		</>
	);
}
