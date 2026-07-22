'use client';

import { useCallback, useEffect, useState } from 'react';
import {
	interconsultasService,
	InterconsultaRow,
	SectorDestinoInterconsulta,
} from '@/app/services/interconsultasService';
import { usePermiso } from '@/app/hooks/usePermiso';
import Loader from '../../Loader/Loader';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import styles from './InterconsultaSection.module.css';

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
			{ label: 'Origen', value: 'Registro web (legado)' },
		];
	}

	return [
		{ label: 'Fecha / hora', value: formatFecha(row) },
		{
			label: 'Servicio destino',
			value: row.ServicioDescripcion || row.SectorReceptorNombre || row.Especialidad,
		},
		{ label: 'Estado', value: row.EstadoWorkflow || row.Estado },
		{ label: 'Urgencia', value: row.EstadoUrgencia },
		{ label: 'Médico solicitante', value: row.MedicoSolicitanteNombre },
		{ label: 'Matrícula', value: row.MedicoSolicitante },
		{ label: 'Tomado por', value: row.NombreToma || (row.MatriculaToma ? String(row.MatriculaToma) : null) },
		{ label: 'Sector solicitante', value: row.SectorSolicitanteNombre || row.SectorSolicitante },
		{ label: 'Código práctica', value: row.CodigoPractica },
		{ label: 'Id pedido', value: row.IdPedido || row.IdInterconsulta },
		{ label: 'Id resultado', value: row.IdProtocolo && row.IdProtocolo > 0 ? row.IdProtocolo : null },
	];
}

export default function InterconsultaSection({ numeroVisita, sectorSolicitante }: Props) {
	const { puede } = usePermiso();
	const canCreate = puede('INTERNACION.INTERCONSULTAS.CREAR');

	const [rows, setRows] = useState<InterconsultaRow[]>([]);
	const [sectores, setSectores] = useState<SectorDestinoInterconsulta[]>([]);
	const [idSectorReceptor, setIdSectorReceptor] = useState('');
	const [motivo, setMotivo] = useState('');
	const [urgencia, setUrgencia] = useState('Normal');
	const [showForm, setShowForm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<InterconsultaRow | null>(null);

	useEffect(() => {
		void interconsultasService
			.listarSectoresDestino()
			.then((list) => {
				setSectores(list);
				setIdSectorReceptor(
					(prev) => prev || list.find((s) => s.valor === 'OFT')?.valor || list[0]?.valor || '',
				);
			})
			.catch(() => setSectores([]));
	}, []);

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!numeroVisita || !motivo.trim() || !idSectorReceptor.trim()) return;
		setSaving(true);
		setError(null);
		try {
			await interconsultasService.crear({
				idVisita: numeroVisita,
				idSectorReceptor: idSectorReceptor.trim(),
				sectorSolicitante: sectorSolicitante || undefined,
				motivo: motivo.trim(),
				estadoUrgencia: urgencia,
			});
			setMotivo('');
			setShowForm(false);
			await loadVisita();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	const handleRowClick = async (row: InterconsultaRow) => {
		const id = row.Origen === 'WEB' ? row.IdInterconsulta : row.IdPedido || row.IdInterconsulta;
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
						Interconsultas de este paciente. El servicio destino las atiende desde la bandeja
						de pedidos.
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
						Servicio destino *
						<select
							value={idSectorReceptor}
							onChange={(e) => setIdSectorReceptor(e.target.value)}
							required
						>
							<option value="">Seleccione…</option>
							{sectores.map((s) => (
								<option key={s.valor} value={s.valor}>
									{s.descripcion} ({s.valor})
								</option>
							))}
						</select>
					</label>
					<label>
						Urgencia
						<select value={urgencia} onChange={(e) => setUrgencia(e.target.value)}>
							<option value="Normal">Normal</option>
							<option value="Medio">Medio</option>
							<option value="Urgente">Urgente</option>
						</select>
					</label>
					<label>
						Motivo / consulta *
						<textarea
							value={motivo}
							onChange={(e) => setMotivo(e.target.value)}
							rows={4}
							required
							placeholder="Motivo de la interconsulta…"
						/>
					</label>
					<button type="submit" className={styles.primaryBtn} disabled={saving || !idSectorReceptor}>
						{saving ? 'Guardando…' : 'Registrar interconsulta'}
					</button>
				</form>
			)}

			{error && <div className={styles.error}>{error}</div>}
			{loading ? (
				<div style={{ position: 'relative', minHeight: 200 }}>
					<Loader />
				</div>
			) : rows.length === 0 ? (
				<div className={styles.empty}>No hay interconsultas registradas para esta internación.</div>
			) : (
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Urg.</th>
								<th>Fecha / hora</th>
								<th>Destino</th>
								<th>Motivo</th>
								<th>Solicitado por</th>
								<th>Estado</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => {
								const id = r.IdPedido || r.IdInterconsulta;
								const tomado = !!r.Tomado;
								const cumplido = !!r.Cumplido || (r.IdProtocolo != null && r.IdProtocolo > 0);
								return (
									<tr
										key={`${r.Origen || 'LEGACY'}-${id}`}
										className={styles.clickableRow}
										onClick={() => void handleRowClick(r)}
										title="Ver detalle"
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
												{r.ServicioDescripcion ||
													r.SectorReceptorNombre ||
													r.Especialidad ||
													'—'}
											</div>
											{r.Origen === 'WEB' && (
												<div className={styles.meta}>Registro web (legado)</div>
											)}
										</td>
										<td className={styles.motivo}>
											{(r.Motivo || '').length > 120
												? `${r.Motivo.slice(0, 120)}…`
												: r.Motivo || '—'}
										</td>
										<td className={styles.meta}>{r.MedicoSolicitanteNombre || '—'}</td>
										<td className={styles.meta}>
											{r.EstadoWorkflow ||
												(cumplido ? 'Cumplido' : tomado ? 'Tomado' : 'Pendiente')}
											{tomado && r.NombreToma ? ` · ${r.NombreToma}` : ''}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{selected && (
				<PedidoDetalleModal
					title={
						selected.ServicioDescripcion ||
						selected.Especialidad ||
						selected.PracticaSolicitada ||
						'Interconsulta'
					}
					urgencia={selected.EstadoUrgencia}
					fields={buildInterconsultaFields(selected)}
					textBlocks={selectedTextBlocks}
					onClose={() => setSelected(null)}
				/>
			)}
		</div>
	);
}
