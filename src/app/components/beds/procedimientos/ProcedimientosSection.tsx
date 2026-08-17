'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoEyeOutline } from 'react-icons/io5';
import procedimientosService from '@/app/services/procedimientosService';
import type { FacPracticaVisita } from '@/app/types/procedimientos';
import Loader from '../../Loader/Loader';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import styles from '../estudios/EstudiosSection.module.css';

type Props = {
	numeroVisita: number | null;
	patientName?: string;
	documentoPaciente?: string;
	patientLocation?: string;
};

function formatYmd(ymd?: string | null): string {
	const m = String(ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!m) return ymd ? String(ymd) : '';
	return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatFechaHora(row: FacPracticaVisita) {
	const f = formatYmd(row.FechaPractica);
	const h = [row.HoraPracticaInicio, row.HoraPracticaFin].filter(Boolean).join(' – ');
	return [f, h].filter(Boolean).join(' ') || '—';
}

function practicaTitulo(row: FacPracticaVisita) {
	return String(row.PracticaDescripcion || row.Practica || 'Práctica').trim();
}

function buildFields(row: FacPracticaVisita) {
	return [
		{ label: 'Fecha / hora', value: formatFechaHora(row) },
		{ label: 'Código', value: row.Practica },
		{ label: 'Tipo', value: row.TipoPractica },
		{ label: 'Cantidad', value: row.CantidadPractica },
		{ label: 'Sector', value: row.ValorSector },
		{ label: 'Estado', value: row.Estado },
		{ label: 'Factura', value: row.Factura },
		{ label: 'Autorizada', value: row.Autorizada },
		{ label: 'Nº informe', value: row.NroInforme },
		{ label: 'Nº autorización', value: row.NroAutorizacion },
		{ label: 'Protocolo', value: row.IdProtocolo },
		{ label: 'Solicita', value: row.SolicitanteNombre },
		{
			label: 'Realizó',
			value: row.Realizadores?.length ? row.Realizadores.join(', ') : null,
			full: true,
		},
		{ label: 'Profesionales', value: row.Profesionales, full: true },
		{ label: 'Id práctica', value: row.Valor },
	];
}

export default function ProcedimientosSection({
	numeroVisita,
	patientName,
	documentoPaciente,
	patientLocation,
}: Props) {
	const [rows, setRows] = useState<FacPracticaVisita[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<FacPracticaVisita | null>(null);
	const [query, setQuery] = useState('');

	const loadVisita = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			setRows(await procedimientosService.listarPorVisita(numeroVisita));
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
				hay(r.PracticaDescripcion) ||
				hay(r.Practica) ||
				hay(r.TipoPractica) ||
				hay(r.ValorSector) ||
				hay(r.SolicitanteNombre) ||
				hay(r.Profesionales) ||
				(r.Realizadores || []).some((n) => hay(n))
			);
		});
	}, [rows, query]);

	const handleExport = async (option: ExportOption) => {
		if (option !== 'pdf') return;
		const empresaInfo = await obtenerInfoEmpresa();
		const parts = filtered.map((r, idx) => ({
			title: `Práctica ${idx + 1}`,
			fields: [
				{ label: 'Código', value: r.Practica ?? '—' },
				{ label: 'Práctica', value: practicaTitulo(r) },
				{ label: 'Tipo', value: r.TipoPractica || '—' },
				{ label: 'Cantidad', value: r.CantidadPractica ?? '—' },
				{ label: 'Fecha / hora', value: formatFechaHora(r) },
				{ label: 'Sector', value: r.ValorSector || '—' },
				{ label: 'Estado', value: r.Estado ?? '—' },
				{ label: 'Profesionales', value: r.Profesionales || '—' },
			],
		}));

		await exportToPDF({
			title: 'Prácticas de la visita',
			subtitle: `Visita: ${numeroVisita}`,
			parts,
			fileName: `procedimientos_${numeroVisita}.pdf`,
			orientation: 'portrait',
			empresaInfo,
			patientInfo: {
				numeroVisita: numeroVisita || undefined,
				nombre: patientName,
				numeroDocumento: documentoPaciente,
				ubicacion: patientLocation,
			},
		});
	};

	if (!numeroVisita) {
		return (
			<EmptyState
				variant="procedimientos"
				text="No hay visita seleccionada"
				description="Abrí una internación para ver las prácticas de imFacPracticas."
			/>
		);
	}

	return (
		<>
			<BedSectionLayout
				title="Procedimientos"
				subtitle="Todas las prácticas de esta visita · más adelante se filtra por tipo"
				exportSlot={
					<ExportButton
						data={filtered}
						fileName={`procedimientos_${numeroVisita}.pdf`}
						onExport={handleExport}
						options={['pdf']}
					/>
				}
				search={{
					value: query,
					onChange: setQuery,
					placeholder: 'Buscar por práctica, código, tipo, sector, profesional…',
				}}
			>
				{error && <div className={styles.error}>{error}</div>}
				{loading ? (
					<div style={{ position: 'relative', minHeight: 200 }}>
						<Loader />
					</div>
				) : filtered.length === 0 ? (
					<EmptyState
						variant="procedimientos"
						text={rows.length === 0 ? 'Sin prácticas en esta visita' : 'Sin resultados'}
						description={
							rows.length === 0
								? 'No hay filas en imFacPracticas para esta internación.'
								: 'Probá con otro criterio de búsqueda.'
						}
					/>
				) : (
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Fecha / hora</th>
									<th>Cód.</th>
									<th>Práctica</th>
									<th>Tipo</th>
									<th>Cant.</th>
									<th>Sector</th>
									<th>Profesionales</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((r) => (
									<tr key={r.Valor}>
										<td className={styles.meta}>{formatFechaHora(r)}</td>
										<td className={styles.codigo}>{r.Practica ?? '—'}</td>
										<td>
											<div className={styles.practica}>{practicaTitulo(r)}</div>
										</td>
										<td className={styles.meta}>{r.TipoPractica || '—'}</td>
										<td className={styles.meta}>{r.CantidadPractica ?? '—'}</td>
										<td className={styles.meta}>{r.ValorSector || '—'}</td>
										<td className={styles.meta}>{r.Profesionales || '—'}</td>
										<td>
											<button
												type="button"
												className={styles.btnAction}
												title="Ver detalle"
												onClick={() => setSelected(r)}
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
					title={practicaTitulo(selected)}
					fields={buildFields(selected)}
					onClose={() => setSelected(null)}
				/>
			)}
		</>
	);
}
