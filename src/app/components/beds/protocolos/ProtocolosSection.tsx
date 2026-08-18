'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import protocolosService from '@/app/services/protocolosService';
import type { ProtocoloClinico } from '@/app/types/protocolos';
import { usePermiso } from '@/app/hooks/usePermiso';
import BedSectionLoading from '../shared/BedSectionLoading';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import CargarProtocoloModal from './CargarProtocoloModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import styles from '../estudios/EstudiosSection.module.css';
import tableStyles from '../shared/BedTable.module.css';

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
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<ProtocoloClinico | null>(null);
	const [showCargar, setShowCargar] = useState(false);
	const [query, setQuery] = useState('');

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

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => {
			const hay = (v?: string | number | null) =>
				v != null && String(v).toLowerCase().includes(q);
			const prac = r.practicas?.[0];
			return (
				hay(r.tipoDescripcion) ||
				hay(r.tipoProtocolo) ||
				hay(r.numeroProtocolo) ||
				hay(prac?.descripcion) ||
				hay(prac?.codigoPractica) ||
				hay(r.operadorNombre) ||
				hay(resumenEquipo(r))
			);
		});
	}, [rows, query]);

	const handleExport = async (option: ExportOption) => {
		if (option === 'pdf') {
			const empresaInfo = await obtenerInfoEmpresa();
			const parts = filtered.map((r, idx) => {
				const prac = r.practicas?.[0];
				return {
					title: `Protocolo ${idx + 1}${r.numeroProtocolo ? ` · N° ${r.numeroProtocolo}` : ''}`,
					fields: [
						{ label: 'Fecha', value: formatFecha(r.fecha) },
						{ label: 'Tipo', value: r.tipoDescripcion || r.tipoProtocolo || '—' },
						{ label: 'Práctica', value: prac?.descripcion || prac?.codigoPractica || '—' },
						{ label: 'Equipo', value: resumenEquipo(r) },
						{ label: 'Técnica', value: r.tecnica || '—' },
						{ label: 'Estado', value: r.estado || '—' },
					],
					profesional: {
						nombre: r.operadorNombre || 'PROFESIONAL',
						matricula: r.operadorMatricula ?? r.idOperador ?? undefined,
					},
				};
			});

			await exportToPDF({
				title: 'Protocolos',
				subtitle: `Visita: ${numeroVisita}`,
				parts,
				fileName: `protocolos_${numeroVisita}.pdf`,
				orientation: 'portrait',
				empresaInfo,
				patientInfo: { numeroVisita: numeroVisita || undefined },
			});
		}
	};

	if (!numeroVisita) {
		return (
			<EmptyState
				variant="protocolos"
				text="No hay visita seleccionada"
				description="Abrí una internación para ver los protocolos."
			/>
		);
	}

	if (loading) {
		return <BedSectionLoading />;
	}

	return (
		<>
			<BedSectionLayout
				title="Protocolos"
				subtitle="Post-práctica / cirugía · equipo por rol y descripción clínica"
				addLabel={puedeCrear ? 'Protocolo' : undefined}
				onAdd={puedeCrear ? () => setShowCargar(true) : undefined}
				exportSlot={
					<ExportButton
						data={filtered}
						fileName={`protocolos_${numeroVisita}.pdf`}
						onExport={handleExport}
						options={['pdf']}
					/>
				}
				search={{
					value: query,
					onChange: setQuery,
					placeholder: 'Buscar por tipo, práctica, equipo, operador…',
				}}
			>
				{error && <div className={styles.error}>{error}</div>}
				{filtered.length === 0 ? (
					<EmptyState
						variant="protocolos"
						text={rows.length === 0 ? 'Sin protocolos' : 'Sin resultados'}
						description={
							rows.length === 0
								? 'Cargá un protocolo con el botón + Protocolo.'
								: 'Probá con otro criterio de búsqueda.'
						}
						actionLabel={puedeCrear && rows.length === 0 ? 'Protocolo' : undefined}
						onAction={puedeCrear && rows.length === 0 ? () => setShowCargar(true) : undefined}
					/>
				) : (
					<div className={tableStyles.tableWrap}>
						<div className={tableStyles.scrollArea}>
						<table className={tableStyles.table}>
							<thead className={tableStyles.thead}>
								<tr>
									<th>Fecha</th>
									<th>Tipo</th>
									<th>Práctica</th>
									<th>Equipo</th>
									<th>Cargado por</th>
								</tr>
							</thead>
							<tbody className={tableStyles.tbody}>
								{filtered.map((r) => {
									const prac = r.practicas?.[0];
									return (
										<tr
											key={r.idProtocolo}
											className={`${tableStyles.row} ${styles.clickableRow}`}
											onClick={() => setSelected(r)}
										>
											<td className={tableStyles.meta}>{formatFecha(r.fecha)}</td>
											<td>
												<div className={tableStyles.practica}>
													{r.tipoDescripcion || r.tipoProtocolo || '—'}
												</div>
												{r.numeroProtocolo ? (
													<div className={tableStyles.meta}>#{r.numeroProtocolo}</div>
												) : null}
											</td>
											<td className={tableStyles.practica}>
												{prac?.descripcion || prac?.codigoPractica || '—'}
											</td>
											<td className={tableStyles.meta}>{resumenEquipo(r)}</td>
											<td className={tableStyles.meta}>{r.operadorNombre || '—'}</td>
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
		</>
	);
}
