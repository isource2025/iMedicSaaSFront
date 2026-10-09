'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import protocolosService from '@/app/services/protocolosService';
import type { PracticaEnProtocolo, ProtocoloClinico } from '@/app/types/protocolos';
import { usePermiso } from '@/app/hooks/usePermiso';
import { cargarVisita, peekVisita, tomarVisita, visitaCacheKey } from '@/app/utils/bedVisitaCache';
import { useUsuarioActual, esRegistroPropio, esAdminClinico } from '@/app/hooks/useUsuarioActual';
import { IoEyeOutline, IoTrashOutline, IoPencilOutline } from 'react-icons/io5';
import ConfirmationModal from '../shared/ConfirmationModal';
import BedSectionLoading from '../shared/BedSectionLoading';
import PedidoDetalleModal from '../shared/PedidoDetalleModal';
import CargarProtocoloModal from './CargarProtocoloModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { Periodo, filtrarPorPeriodo } from '../shared/PeriodFilter';
import { exportToPDF } from '../../../utils/pdfExportLazy';
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

function equipoDe(prac: PracticaEnProtocolo) {
	const profs = prac.profesionales || [];
	if (!profs.length) return '—';
	return profs
		.map((x) => `${x.funcionNombre}: ${x.apellidoNombre || 'Sin identificar'}`)
		.join(' · ');
}

/** Equipo de todo el protocolo sin repetir (para la grilla y la búsqueda). */
function resumenEquipo(p: ProtocoloClinico) {
	const vistos = new Set<string>();
	const partes: string[] = [];
	for (const prac of p.practicas || []) {
		for (const x of prac.profesionales || []) {
			const k = `${x.funcionNombre}: ${x.apellidoNombre || 'Sin identificar'}`;
			if (vistos.has(k)) continue;
			vistos.add(k);
			partes.push(k);
		}
	}
	return partes.length ? partes.join(' · ') : '—';
}

function resumenPracticas(p: ProtocoloClinico) {
	const list = p.practicas || [];
	if (!list.length) return '—';
	return list
		.map((x) => `${x.descripcion || x.codigoPractica}${x.cantidad > 1 ? ` ×${x.cantidad}` : ''}`)
		.join(' · ');
}

function resumenMedicamentos(p: ProtocoloClinico) {
	const list = p.medicamentos || [];
	if (!list.length) return '—';
	return list
		.map((m) => {
			const cant = m.cantidad != null && m.cantidad > 0 ? ` ×${m.cantidad}${m.unidad ? ` ${m.unidad}` : ''}` : '';
			return `${m.descripcion}${cant}`;
		})
		.join(' · ');
}

function buildFields(p: ProtocoloClinico) {
	const practicas = p.practicas || [];
	const porPractica = practicas.flatMap((prac, i) => [
		{
			label: practicas.length > 1 ? `Práctica ${i + 1}` : 'Práctica',
			value: `${prac.descripcion || prac.codigoPractica} (${prac.codigoPractica} · ${prac.tipoPractica}${
				prac.cantidad > 1 ? ` · ×${prac.cantidad}` : ''
			})${prac.facturada ? ' · facturada' : ''}`,
			full: true,
		},
		{ label: practicas.length > 1 ? `Equipo ${i + 1}` : 'Equipo', value: equipoDe(prac), full: true },
	]);
	return [
		{ label: 'Fecha carga', value: formatFecha(p.fecha) },
		{ label: 'Nº protocolo', value: p.numeroProtocolo },
		{ label: 'Tipo', value: p.tipoDescripcion || p.tipoProtocolo || '—' },
		{ label: 'Cargado por', value: p.operadorNombre },
		{ label: 'Inicio', value: formatFecha(p.fechaHoraInicio) },
		{ label: 'Fin', value: formatFecha(p.fechaHoraFin) },
		...porPractica,
		{ label: 'Medicamentos', value: resumenMedicamentos(p), full: true },
		{ label: 'Técnica', value: p.tecnica },
		{ label: 'Estado', value: p.estado },
		{ label: 'Id', value: p.idProtocolo },
	];
}

export default function ProtocolosSection({ numeroVisita, sector }: Props) {
	const { puede } = usePermiso();
	const puedeCrear = puede('INTERNACION.PROTOCOLOS.CREAR');
	const puedeEditar = puede('INTERNACION.PROTOCOLOS.EDITAR');
	const puedeEliminar = puede('INTERNACION.PROTOCOLOS.ELIMINAR');
	const usuarioActual = useUsuarioActual();
	const [rows, setRows] = useState<ProtocoloClinico[]>(
		() => peekVisita<ProtocoloClinico[]>(visitaCacheKey('protocolos', numeroVisita)) ?? [],
	);
	const [loading, setLoading] = useState(
		() => peekVisita(visitaCacheKey('protocolos', numeroVisita)) === undefined,
	);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<ProtocoloClinico | null>(null);
	const [showCargar, setShowCargar] = useState(false);
	const [editing, setEditing] = useState<ProtocoloClinico | null>(null);
	const [aEliminar, setAEliminar] = useState<ProtocoloClinico | null>(null);
	const [query, setQuery] = useState('');
	const [periodo, setPeriodo] = useState<Periodo>('all');

	const puedeGestionarFila = (p: ProtocoloClinico) => {
		if (esAdminClinico()) return true;
		return esRegistroPropio({ IdOperador: p.idOperador }, usuarioActual) === true;
	};

	const abrirNuevo = () => {
		setEditing(null);
		setShowCargar(true);
	};
	const abrirEditar = (p: ProtocoloClinico) => {
		setEditing(p);
		setShowCargar(true);
	};

	const pedirEliminar = (p: ProtocoloClinico) => {
		if (p.tieneFacturadas) {
			setError(
				'No se puede borrar: tiene prácticas que ya pasaron a facturación. Pedí a facturación que las libere.',
			);
			return;
		}
		setError(null);
		setAEliminar(p);
	};

	const confirmarEliminar = async () => {
		if (!aEliminar) return;
		const p = aEliminar;
		setAEliminar(null);
		try {
			await protocolosService.eliminar(p.idProtocolo);
			setRows((prev) => prev.filter((r) => r.idProtocolo !== p.idProtocolo));
			void load();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo borrar el protocolo. Intentá de nuevo.');
		}
	};

	const load = useCallback(async (modo?: unknown) => {
		if (!numeroVisita) return;
		const key = visitaCacheKey('protocolos', numeroVisita);
		const inicial = modo === 'inicial';
		const cached = inicial ? tomarVisita<ProtocoloClinico[]>(key) : undefined;
		if (cached) {
			setRows(cached.data);
			setLoading(false);
			if (!cached.refrescar) return;
		} else {
			setLoading(true);
		}
		setError(null);
		try {
			setRows(await cargarVisita(key, () => protocolosService.listarPorVisita(numeroVisita), !inicial));
		} catch (e) {
			if (!cached) setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, [numeroVisita]);

	useEffect(() => {
		void load('inicial');
	}, [load]);

	const filtered = useMemo(() => {
		const enPeriodo = filtrarPorPeriodo(rows, periodo, (r) => r.fecha);
		const q = query.trim().toLowerCase();
		if (!q) return enPeriodo;
		return enPeriodo.filter((r) => {
			const hay = (v?: string | number | null) =>
				v != null && String(v).toLowerCase().includes(q);
			return (
				hay(r.tipoDescripcion) ||
				hay(r.tipoProtocolo) ||
				hay(r.numeroProtocolo) ||
				(r.practicas || []).some((prac) => hay(prac.descripcion) || hay(prac.codigoPractica)) ||
				hay(r.operadorNombre) ||
				hay(resumenEquipo(r)) ||
				hay(resumenMedicamentos(r))
			);
		});
	}, [rows, query, periodo]);

	const handleExport = async (option: ExportOption) => {
		if (option === 'pdf') {
			const empresaInfo = await obtenerInfoEmpresa();
			const parts = filtered.map((r, idx) => {
				const practicas = r.practicas || [];
				return {
					title: `Protocolo ${idx + 1}${r.numeroProtocolo ? ` · N° ${r.numeroProtocolo}` : ''}`,
					fields: [
						{ label: 'Fecha', value: formatFecha(r.fecha) },
						{ label: 'Tipo', value: r.tipoDescripcion || r.tipoProtocolo || '—' },
						{ label: 'Inicio', value: formatFecha(r.fechaHoraInicio) },
						{ label: 'Fin', value: formatFecha(r.fechaHoraFin) },
						...practicas.flatMap((prac, i) => [
							{
								label: practicas.length > 1 ? `Práctica ${i + 1}` : 'Práctica',
								value: `${prac.descripcion || prac.codigoPractica} (${prac.codigoPractica}${
									prac.cantidad > 1 ? ` ×${prac.cantidad}` : ''
								})`,
							},
							{ label: practicas.length > 1 ? `Equipo ${i + 1}` : 'Equipo', value: equipoDe(prac) },
						]),
						{ label: 'Medicamentos', value: resumenMedicamentos(r) },
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
				addLabel={puedeCrear ? 'Agregar protocolo' : undefined}
				onAdd={puedeCrear ? abrirNuevo : undefined}
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
				period={{ value: periodo, onChange: setPeriodo }}
			>
				{error && <div className={styles.error}>{error}</div>}
				{filtered.length === 0 ? (
					<EmptyState
						variant="protocolos"
						text={rows.length === 0 ? 'Sin protocolos' : 'Sin resultados'}
						description={
							rows.length === 0
								? 'Cargá un protocolo con el botón Agregar protocolo.'
								: 'Probá con otro criterio de búsqueda o período.'
						}
						actionLabel={puedeCrear && rows.length === 0 ? 'Agregar protocolo' : undefined}
						onAction={puedeCrear && rows.length === 0 ? abrirNuevo : undefined}
					/>
				) : (
					<div className={tableStyles.tableWrap}>
						<div className={tableStyles.scrollArea}>
						<table className={tableStyles.table}>
							<thead className={tableStyles.thead}>
								<tr>
									<th>Fecha</th>
									<th>Tipo</th>
									<th>Prácticas</th>
									<th>Equipo</th>
									<th>Cargado por</th>
									<th className={tableStyles.colAccion}>Acciones</th>
								</tr>
							</thead>
							<tbody className={tableStyles.tbody}>
								{filtered.map((r) => {
									const nPrac = r.practicas?.length || 0;
									return (
										<tr
											key={r.idProtocolo}
											className={`${tableStyles.row} ${styles.clickableRow}`}
											onClick={() => setSelected(r)}
										>
											<td className={tableStyles.meta}>{formatFecha(r.fechaHoraFin || r.fecha)}</td>
											<td>
												<div className={tableStyles.practica}>
													{r.tipoDescripcion || r.tipoProtocolo || '—'}
												</div>
												{r.numeroProtocolo ? (
													<div className={tableStyles.meta}>#{r.numeroProtocolo}</div>
												) : null}
											</td>
											<td className={tableStyles.practica}>
												{resumenPracticas(r)}
												{nPrac > 1 ? (
													<div className={tableStyles.meta}>
														{nPrac} prácticas{r.tieneFacturadas ? ' · con facturadas' : ''}
													</div>
												) : r.tieneFacturadas ? (
													<div className={tableStyles.meta}>facturada</div>
												) : null}
											</td>
											<td className={tableStyles.meta}>{resumenEquipo(r)}</td>
											<td className={tableStyles.meta}>{r.operadorNombre || '—'}</td>
											<td
												className={tableStyles.cellAccion}
												onClick={(e) => e.stopPropagation()}
											>
												<div className={tableStyles.actionBtns}>
													<button
														type="button"
														className={tableStyles.btnAction}
														onClick={() => setSelected(r)}
														title="Ver detalle"
													>
														<IoEyeOutline color="#5BC0DE" size={18} />
													</button>
													{puedeEditar && puedeGestionarFila(r) && (
														<button
															type="button"
															className={tableStyles.btnAction}
															onClick={() => abrirEditar(r)}
															title="Editar"
														>
															<IoPencilOutline color="#5BC0DE" size={18} />
														</button>
													)}
													{puedeEliminar && puedeGestionarFila(r) && (
														<button
															type="button"
															className={tableStyles.btnAction}
															onClick={() => pedirEliminar(r)}
															title="Borrar"
														>
															<IoTrashOutline color="#5BC0DE" size={18} />
														</button>
													)}
												</div>
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

			<ConfirmationModal
				isOpen={!!aEliminar}
				onClose={() => setAEliminar(null)}
				onConfirm={() => void confirmarEliminar()}
				title="Borrar protocolo"
				message={
					aEliminar
						? `${aEliminar.tipoDescripcion || aEliminar.tipoProtocolo || 'Protocolo'}${
								aEliminar.numeroProtocolo ? ` #${aEliminar.numeroProtocolo}` : ''
							} · ${formatFecha(aEliminar.fechaHoraFin || aEliminar.fecha)}\n${resumenPracticas(
								aEliminar,
							)}\n\nSe borran también las prácticas, los equipos y los medicamentos asociados. Esta acción no se puede deshacer.`
						: ''
				}
				confirmText="Borrar"
				cancelText="Cancelar"
			/>

			<CargarProtocoloModal
				open={showCargar}
				numeroVisita={numeroVisita}
				sector={sector}
				protocoloToEdit={editing}
				onClose={() => {
					setShowCargar(false);
					setEditing(null);
				}}
				onCreated={() => void load()}
			/>
		</>
	);
}
