'use client';

import { useCallback, useEffect, useState } from 'react';
import { interconsultasService, InterconsultaRow } from '@/app/services/interconsultasService';
import { usePermiso } from '@/app/hooks/usePermiso';
import Loader from '../../Loader/Loader';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import styles from './InterconsultaSection.module.css';

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

function formatFecha(row: InterconsultaRow) {
	return [row.FechaSolicitud, row.HoraSolicitud].filter(Boolean).join(' ');
}

function buildInterconsultaFields(row: InterconsultaRow) {
	if (row.Origen === 'WEB') {
		return [
			{ label: 'Fecha / hora', value: formatFecha(row) },
			{ label: 'Especialidad solicitada', value: row.Especialidad },
			{ label: 'Estado', value: row.Estado },
			{ label: 'Médico solicitante', value: row.MedicoSolicitanteNombre },
			{ label: 'Matrícula', value: row.MedicoSolicitante },
			{ label: 'Origen', value: 'Registro web' },
		];
	}

	return [
		{ label: 'Fecha / hora', value: formatFecha(row) },
		{ label: 'Especialidad / destino', value: row.Especialidad || row.SectorReceptorNombre || row.ServicioDescripcion },
		{ label: 'Urgencia', value: row.EstadoUrgencia || row.Estado },
		{ label: 'Médico solicitante', value: row.MedicoSolicitanteNombre },
		{ label: 'Matrícula', value: row.MedicoSolicitante },
		{ label: 'Sector solicitante', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{ label: 'Servicio destino', value: row.ServicioDescripcion || row.SectorReceptorNombre },
		{ label: 'Código práctica', value: row.CodigoPractica },
		{ label: 'Nomenclador', value: row.NomencladorDescripcion },
		{ label: 'Tipo pedido', value: row.TipoPedidoDescripcion || row.PracticaSolicitada },
		{ label: 'Id protocolo', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
		{ label: 'Id pedido', value: row.IdPedido || row.IdInterconsulta },
	];
}

export default function InterconsultaSection({ numeroVisita }: Props) {
	const { puede } = usePermiso();
	const [rows, setRows] = useState<InterconsultaRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [especialidad, setEspecialidad] = useState('');
	const [motivo, setMotivo] = useState('');
	const [saving, setSaving] = useState(false);
	const [selected, setSelected] = useState<InterconsultaRow | null>(null);

	const canCreate = puede('INTERNACION.INTERCONSULTAS.CREAR');

	const load = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			const data = await interconsultasService.listarPorVisita(numeroVisita);
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!numeroVisita || !motivo.trim()) return;
		const now = new Date();
		const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
		setSaving(true);
		try {
			await interconsultasService.crear({
				IdVisita: numeroVisita,
				FechaSolicitud: fecha,
				HoraSolicitud: hora,
				Especialidad: especialidad.trim(),
				Motivo: motivo.trim(),
			});
			setMotivo('');
			setEspecialidad('');
			setShowForm(false);
			await load();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	const handleRowClick = async (row: InterconsultaRow) => {
		const id = row.Origen === 'WEB' ? row.IdInterconsulta : (row.IdPedido || row.IdInterconsulta);
		const detail = await interconsultasService.obtenerPorId(id, row.Origen || 'LEGACY');
		setSelected(detail || row);
	};

	if (!numeroVisita) {
		return <div className={styles.empty}>No hay visita seleccionada</div>;
	}

	const selectedTextBlocks = selected
		? [
				{ label: 'Motivo / consulta', value: selected.Motivo },
				...(selected.Respuesta ? [{ label: 'Respuesta', value: selected.Respuesta }] : []),
			]
		: [];

	return (
		<div className={styles.wrap}>
			<div className={styles.header}>
				<div>
					<h2 className={styles.title}>Interconsultas</h2>
					<p className={styles.subtitle}>
						Solicitudes de interconsulta (imPedidosEstudios, tipo 33) — distinto de estudios de imagen y de laboratorio
					</p>
				</div>
				{canCreate && (
					<button type="button" className={styles.primaryBtn} onClick={() => setShowForm((v) => !v)}>
						{showForm ? 'Cancelar' : 'Nueva solicitud'}
					</button>
				)}
			</div>

			{showForm && canCreate && (
				<form className={styles.form} onSubmit={handleSubmit}>
					<label>
						Especialidad solicitada
						<input value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} placeholder="Ej. Cardiología" />
					</label>
					<label>
						Motivo / consulta
						<textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} required />
					</label>
					<button type="submit" className={styles.primaryBtn} disabled={saving}>
						{saving ? 'Guardando…' : 'Registrar interconsulta'}
					</button>
				</form>
			)}

			{error && <div className={styles.error}>{error}</div>}
			{loading ? (
				<div style={{ position: 'relative', minHeight: 200 }}><Loader /></div>
			) : rows.length === 0 ? (
				<div className={styles.empty}>No hay interconsultas registradas para esta internación.</div>
			) : (
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Urg.</th>
								<th>Fecha / hora</th>
								<th>Especialidad / destino</th>
								<th>Motivo / consulta</th>
								<th>Solicitado por</th>
								<th>Protocolo</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr
									key={`${r.Origen || 'LEGACY'}-${r.IdInterconsulta}`}
									className={styles.clickableRow}
									onClick={() => handleRowClick(r)}
									title="Ver detalle de la interconsulta"
								>
									<td>
										<span
											className={`${styles.urgencia} ${urgenciaClass(r.EstadoUrgencia || r.Estado)}`}
											title={r.EstadoUrgencia || r.Estado || 'Sin urgencia'}
										/>
									</td>
									<td className={styles.meta}>{formatFecha(r)}</td>
									<td>
										<div className={styles.destino}>
											{r.Especialidad || r.SectorReceptorNombre || r.ServicioDescripcion || '—'}
										</div>
										{r.ServicioDescripcion && r.SectorReceptorNombre && (
											<div className={styles.meta}>{r.ServicioDescripcion}</div>
										)}
										{r.Origen === 'WEB' && <div className={styles.meta}>Registro web</div>}
									</td>
									<td className={styles.motivo}>
										{r.Motivo.length > 120 ? `${r.Motivo.slice(0, 120)}…` : r.Motivo}
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
					title={selected.Especialidad || selected.PracticaSolicitada || 'Interconsulta'}
					urgencia={selected.EstadoUrgencia}
					fields={buildInterconsultaFields(selected)}
					textBlocks={selectedTextBlocks}
					onClose={() => setSelected(null)}
				/>
			)}
		</div>
	);
}
