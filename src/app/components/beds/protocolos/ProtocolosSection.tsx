'use client';

import { useCallback, useEffect, useState } from 'react';
import protocolosService from '@/app/services/protocolosService';
import type { ProtocoloClinico } from '@/app/types/protocolos';
import { usePermiso } from '@/app/hooks/usePermiso';
import Loader from '../../Loader/Loader';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import CargarProtocoloModal from './CargarProtocoloModal';
import styles from '../estudios/EstudiosSection.module.css';
import formStyles from '../estudios/PedidoEstudioForms.module.css';
import localStyles from './ProtocolosSection.module.css';

type Props = {
	numeroVisita: number | null;
	sector?: string | null;
};

function formatFecha(v?: string | null) {
	if (!v) return '—';
	try {
		const d = new Date(v);
		if (Number.isNaN(d.getTime())) return String(v);
		return d.toLocaleString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch {
		return String(v);
	}
}

function resumenEquipo(p: ProtocoloClinico) {
	const profs = p.practicas?.flatMap((x) => x.profesionales || []) || [];
	if (!profs.length) return '—';
	return profs
		.map((x) => `${x.funcionNombre}: ${x.apellidoNombre || x.valorPersonal}`)
		.join(' · ');
}

function buildFields(p: ProtocoloClinico) {
	const prac = p.practicas?.[0];
	return [
		{ label: 'Fecha', value: formatFecha(p.fecha) },
		{ label: 'Nº protocolo', value: p.numeroProtocolo },
		{ label: 'Tipo', value: p.tipoDescripcion || p.tipoProtocolo || '—' },
		{ label: 'Cargado por', value: p.operadorNombre || p.idOperador },
		{ label: 'Práctica', value: prac?.descripcion || prac?.codigoPractica },
		{ label: 'Código', value: prac?.codigoPractica },
		{ label: 'Equipo', value: resumenEquipo(p), full: true },
		{ label: 'Técnica', value: p.tecnica },
		{ label: 'Estado', value: p.estado },
		{ label: 'Id', value: p.idProtocolo },
	];
}

export default function ProtocolosSection({ numeroVisita, sector }: Props) {
	const { puede } = usePermiso();
	const puedeCrear = puede('INTERNACION.PROTOCOLOS.CREAR');
	const [rows, setRows] = useState<ProtocoloClinico[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<ProtocoloClinico | null>(null);
	const [showCargar, setShowCargar] = useState(false);

	const load = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			setRows(await protocolosService.listarPorVisita(numeroVisita));
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, [numeroVisita]);

	useEffect(() => {
		void load();
	}, [load]);

	if (!numeroVisita) {
		return <div className={styles.empty}>No hay visita seleccionada</div>;
	}

	return (
		<div className={styles.wrap}>
			<div className={styles.header}>
				<div>
					<h2 className={styles.title}>Protocolos</h2>
					<p className={styles.subtitle}>
						Protocolos post-práctica / cirugía: quien carga, equipo por rol y descripción clínica.
					</p>
				</div>
				<div className={styles.headerActions}>
					{puedeCrear && (
						<button
							type="button"
							className={formStyles.btnPrimary}
							onClick={() => setShowCargar(true)}
						>
							Cargar protocolo
						</button>
					)}
				</div>
			</div>

			{error && <div className={formStyles.error}>{error}</div>}

			{loading ? (
				<Loader />
			) : rows.length === 0 ? (
				<div className={styles.empty}>No hay protocolos cargados en esta visita.</div>
			) : (
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Fecha</th>
								<th>Tipo</th>
								<th>Práctica</th>
								<th>Equipo</th>
								<th>Cargado por</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => {
								const prac = r.practicas?.[0];
								return (
									<tr
										key={r.idProtocolo}
										className={styles.clickableRow}
										onClick={() => setSelected(r)}
									>
										<td>{formatFecha(r.fecha)}</td>
										<td>
											{r.tipoDescripcion || r.tipoProtocolo || '—'}
											{r.numeroProtocolo ? (
												<span className={localStyles.nro}> #{r.numeroProtocolo}</span>
											) : null}
										</td>
										<td className={styles.practica}>
											{prac?.descripcion || prac?.codigoPractica || '—'}
										</td>
										<td className={localStyles.equipoCell}>{resumenEquipo(r)}</td>
										<td>{r.operadorNombre || '—'}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{selected && (
				<PedidoDetalleModal
					title={`Protocolo ${selected.numeroProtocolo || selected.idProtocolo}`}
					fields={buildFields(selected)}
					textBlocks={[
						{ label: 'Descripción', value: selected.texto },
						...(selected.diagnosticoPre
							? [{ label: 'Dx pre', value: selected.diagnosticoPre }]
							: []),
						...(selected.diagnosticoPos
							? [{ label: 'Dx pos', value: selected.diagnosticoPos }]
							: []),
					]}
					onClose={() => setSelected(null)}
				/>
			)}

			<CargarProtocoloModal
				open={showCargar}
				numeroVisita={numeroVisita}
				sector={sector}
				onClose={() => setShowCargar(false)}
				onCreated={() => void load()}
			/>
		</div>
	);
}
