'use client';

import { useCallback, useEffect, useState } from 'react';
import estudiosService from '@/app/services/estudiosService';
import { PedidoEstudio } from '@/app/types/estudios';
import Loader from '../../Loader/Loader';
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

export default function EstudiosSection({ numeroVisita }: Props) {
	const [rows, setRows] = useState<PedidoEstudio[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
								<tr key={r.IdPedido}>
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
										{r.SectorReceptorNombre && (
											<div className={styles.meta}>Destino: {r.SectorReceptorNombre}</div>
										)}
									</td>
									<td className={styles.notas}>{r.NotasObservacion || '—'}</td>
									<td className={styles.meta}>{r.MedicoSolicitanteNombre || '—'}</td>
									<td className={styles.meta}>{r.IdProtocolo && r.IdProtocolo > 0 ? r.IdProtocolo : '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
