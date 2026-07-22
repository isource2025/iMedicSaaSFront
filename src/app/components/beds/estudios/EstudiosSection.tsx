'use client';

import { useCallback, useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { PedidoEstudio } from '@/app/types/estudios';
import { usePermiso } from '@/app/hooks/usePermiso';
import Loader from '../../Loader/Loader';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import SolicitarEstudioModal from './SolicitarEstudioModal';
import styles from './EstudiosSection.module.css';
import formStyles from './PedidoEstudioForms.module.css';

type Props = {
	numeroVisita: number | null;
	sectorSolicitante?: string | null;
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

export default function EstudiosSection({ numeroVisita, sectorSolicitante }: Props) {
	const { puede } = usePermiso();
	const puedeCrear = puede('INTERNACION.ESTUDIOS.CREAR');
	const [rows, setRows] = useState<PedidoEstudio[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<PedidoEstudio | null>(null);
	const [showSolicitar, setShowSolicitar] = useState(false);

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

	const handleRowClick = async (row: PedidoEstudio) => {
		const detail = await estudiosService.obtenerPorId(row.IdPedido);
		setSelected(detail || row);
	};

	if (!numeroVisita) {
		return <div className={styles.empty}>No hay visita seleccionada</div>;
	}

	return (
		<div className={styles.wrap}>
			<div className={styles.header}>
				<div>
					<h2 className={styles.title}>Pedidos de estudios</h2>
					<p className={styles.subtitle}>
						Estudios solicitados para este paciente. El cumplimiento se gestiona desde la
						bandeja de pedidos del servicio receptor.
					</p>
				</div>
				<div className={styles.headerActions}>
					{puedeCrear && (
						<button
							type="button"
							className={formStyles.btnPrimary}
							onClick={() => setShowSolicitar(true)}
							disabled={!sectorSolicitante}
							title={!sectorSolicitante ? 'Sin sector de la cama' : undefined}
						>
							Solicitar estudio
						</button>
					)}
				</div>
			</div>

			{error && <div className={styles.error}>{error}</div>}
			{loading ? (
				<div style={{ position: 'relative', minHeight: 200 }}>
					<Loader />
				</div>
			) : rows.length === 0 ? (
				<div className={styles.empty}>No hay pedidos de estudios para esta internación.</div>
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
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr
									key={r.IdPedido}
									className={styles.clickableRow}
									onClick={() => void handleRowClick(r)}
									title="Ver detalle"
								>
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
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

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
		</div>
	);
}
