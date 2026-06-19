'use client';

import { useCallback, useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { PedidoEstudio } from '@/app/types/estudios';
import Loader from '../../Loader/Loader';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import styles from './EstudiosSection.module.css';

type Props = {
	numeroVisita: number | null;
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
		{ label: 'Código práctica', value: row.CodigoPractica },
		{ label: 'Tipo de pedido', value: row.TipoPedidoDescripcion || row.PracticaSolicitada },
		{ label: 'Nomenclador', value: row.NomencladorDescripcion },
		{ label: 'Solicitado por', value: row.MedicoSolicitanteNombre },
		{ label: 'Matrícula', value: row.MatriculaSolicitante },
		{ label: 'Sector solicitante', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{ label: 'Destino / servicio', value: row.ServicioDescripcion || row.SectorReceptorNombre || row.SectorReceptor },
		{ label: 'Id protocolo', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
		{ label: 'Id pedido', value: row.IdPedido },
	];
}

export default function EstudiosSection({ numeroVisita }: Props) {
	const [rows, setRows] = useState<PedidoEstudio[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<PedidoEstudio | null>(null);

	const load = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			const data = await estudiosService.listarPorVisita(numeroVisita);
			setRows(data);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, [numeroVisita]);

	useEffect(() => {
		load();
	}, [load]);

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
				<h2 className={styles.title}>Pedidos de estudios</h2>
				<p className={styles.subtitle}>
					Solicitudes de imagen y diagnóstico por complementarios (ecografía, tomografía, radiología, etc.)
				</p>
			</div>

			{error && <div className={styles.error}>{error}</div>}
			{loading ? (
				<div style={{ position: 'relative', minHeight: 200 }}><Loader /></div>
			) : rows.length === 0 ? (
				<div className={styles.empty}>No hay pedidos de estudios para esta internación.</div>
			) : (
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Urg.</th>
								<th>Fecha / hora</th>
								<th>Cód.</th>
								<th>Práctica solicitada</th>
								<th>Notas / observación</th>
								<th>Solicitado por</th>
								<th>Id protocolo</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr
									key={r.IdPedido}
									className={styles.clickableRow}
									onClick={() => handleRowClick(r)}
									title="Ver detalle del pedido"
								>
									<td>
										<span
											className={`${styles.urgencia} ${urgenciaClass(r.EstadoUrgencia)}`}
											title={r.EstadoUrgencia || 'Sin urgencia'}
										/>
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
									<td className={styles.meta}>{r.IdProtocolo && r.IdProtocolo > 0 ? r.IdProtocolo : '—'}</td>
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
					textBlocks={[{ label: 'Notas / observación', value: selected.NotasObservacion }]}
					onClose={() => setSelected(null)}
				/>
			)}
		</div>
	);
}
