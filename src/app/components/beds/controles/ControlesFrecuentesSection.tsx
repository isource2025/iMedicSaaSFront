'use client';

import React, { useState, useMemo } from 'react';
import { ControlFrecuente } from '../../../types/controlesFrecuentes';
import {
	formatearFecha,
	formatearHora,
	obtenerNombreCompleto,
	eliminarControl,
} from '../../../services/controlesFrecuentesService';
import { formatIMC } from '@/app/utils/antropometria';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import styles from '../indicaciones/IndicacionesSection.module.css';
import tableStyles from './ControlesFrecuentesSection.module.css';
import Loader from '../../Loader/Loader';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import EmptyState from '../shared/EmptyState';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import { IoEyeOutline, IoTrashOutline } from 'react-icons/io5';
import NuevoControlModal from './NuevoControlModal';
import ModalBasePaciente from '../../modals/ModalBasePaciente';

interface Props {
	numeroVisita: number | null;
	patientName?: string;
	patientLocation?: string;
	documentoPaciente?: string;
	fechaIngreso?: string;
	horaIngreso?: string;
}

function toISODate(d: Date | null | undefined): string | null {
	if (!d) return null;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ControlesFrecuentesSection: React.FC<Props> = ({
	numeroVisita,
	patientName,
	patientLocation,
	documentoPaciente,
	fechaIngreso,
	horaIngreso,
}) => {
	const { activeSection, selectedDate } = useBedDetail();
	const [selectedControl, setSelectedControl] = useState<ControlFrecuente | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [query, setQuery] = useState('');

	const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

	const controlesPath = useMemo(
		() => (numeroVisita ? `/controles-frecuentes/${numeroVisita}/byDate` : undefined),
		[numeroVisita],
	);

	const { data, isLoading, error, refetch } = useBedSectionFetch<any>({
		enabled: !!controlesPath && activeSection === 'controles-frecuentes',
		endpointOverride: controlesPath ? { 'controles-frecuentes': controlesPath } : undefined,
		cacheTimeMs: 15000,
	});

	const controles: ControlFrecuente[] = useMemo(() => {
		const list: ControlFrecuente[] = Array.isArray(data)
			? data
			: data && Array.isArray((data as any).data)
			  ? (data as any).data
			  : [];
		return list;
	}, [data]);

	const controlsFiltrados = useMemo(() => {
		if (!query.trim()) return controles;
		const q = query.toLowerCase();
		return controles.filter((c) => {
			const op = `${c.OperadorApellido || ''} ${c.OperadorNombres || ''}`.toLowerCase();
			const obs = (c.Observaciones || '').toLowerCase();
			return op.includes(q) || obs.includes(q);
		});
	}, [controles, query]);

	const formatSelectedDate = () => {
		if (!selectedDate) return null;
		const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
		const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
		return {
			diaSemana: dias[selectedDate.getDay()],
			diaMes: selectedDate.getDate(),
			mes: meses[selectedDate.getMonth()],
		};
	};
	const fechaFormateada = formatSelectedDate();

	const handleEliminar = async (control: ControlFrecuente) => {
		if (!confirm(`¿Eliminar este control?\n\nFecha: ${formatearFecha(control.FechaControl)}\nHora: ${formatearHora(control.HoraControl)}`)) return;
		try {
			await eliminarControl(control.Valor);
			refetch();
		} catch {
			alert('Error al eliminar el control');
		}
	};

	const handleExport = async (option: ExportOption) => {
		if (option === 'pdf') {
			const empresaInfo = await obtenerInfoEmpresa();
			exportToPDF({
				title: 'Controles Frecuentes',
				subtitle: `Fecha: ${fechaISO}`,
				headers: ['Fecha', 'Hora', 'Pulso', 'Presión', 'Temperatura', 'Frec. Resp.', 'Saturación'],
				data: controlsFiltrados.map((r) => [
					formatearFecha(r.FechaControl),
					formatearHora(r.HoraControl),
					r.Pulso || '-',
					`${r.Maximo || '-'}/${r.Minimo || '-'}`,
					r.Axilar ? `${Number(r.Axilar).toFixed(1)}°C` : '-',
					r.FrecuenciaRespiratoria || '-',
					r.Saturometria ? `${r.Saturometria}%` : '-',
				]),
				fileName: `controles_${fechaISO}.pdf`,
				orientation: 'landscape',
				empresaInfo,
				patientInfo: { numeroVisita: numeroVisita || undefined, nombre: patientName, numeroDocumento: documentoPaciente, ubicacion: patientLocation, fechaIngreso, horaIngreso },
			});
		}
	};

	if (activeSection !== 'controles-frecuentes') return null;

	return (
		<div className={styles.root}>
			{/* Header */}
			{fechaFormateada && (
				<div className={styles.dateHeader}>
					<h2 className={styles.sectionTitle}>Controles</h2>
					<span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
					<span className={styles.dateText}>
						{fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
					</span>
					<div className={styles.dateActions}>
						<button
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
							onClick={() => setModalOpen(true)}
						>
							<span className={styles.addIcon} aria-hidden>+</span>
							Control
						</button>
						<ExportButton
							data={controlsFiltrados}
							fileName={`controles_${fechaISO}.pdf`}
							onExport={handleExport}
							options={['pdf']}
						/>
					</div>
				</div>
			)}

			{/* Buscador */}
			<div className={styles.toolbar}>
				<div className={styles.searchWrap}>
					<span className={styles.searchIcon} aria-hidden>🔎</span>
					<input
						className={styles.searchInput}
						type="text"
						placeholder="Buscar por operador, observaciones…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</div>

			{/* Contenido */}
			<div className={styles.content}>
				<div className={styles.tableHolder}>
					{isLoading && (
						<div style={{ position: 'relative', minHeight: 200 }}>
							<Loader />
						</div>
					)}
					{error && <div className={styles.errorBox}>Error al cargar: {error.message}</div>}
					{!isLoading && !error && controlsFiltrados.length === 0 ? (
						<EmptyState
							variant="controles"
							text="No hay controles registrados"
							description="Aún no se han cargado controles frecuentes para esta fecha. Agregá uno haciendo clic en el botón de arriba."
							actionLabel="Nuevo Control"
							onAction={() => setModalOpen(true)}
						/>
					) : !isLoading && !error ? (
						<div className={tableStyles.tableContainer}>
							<table className={tableStyles.table}>
								<thead>
									<tr>
										<th>Fecha</th>
										<th>Hora</th>
										<th>Pulso</th>
										<th>TA Máx</th>
										<th>TA Mín</th>
										<th>FR</th>
										<th>T° Ax</th>
										<th>Sat.</th>
										<th>Origen</th>
										<th>Operador</th>
										<th>Observaciones</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{controlsFiltrados.map((c) => (
										<tr key={c.Valor}>
											<td>{formatearFecha(c.FechaControl)}</td>
											<td>{formatearHora(c.HoraControl)}</td>
											<td>{c.Pulso || '-'}</td>
											<td>{c.Maximo || '-'}</td>
											<td>{c.Minimo || '-'}</td>
											<td>{c.FrecuenciaRespiratoria || '-'}</td>
											<td>{c.Axilar ? `${Number(c.Axilar).toFixed(1)}°C` : '-'}</td>
											<td>{c.Saturometria ? `${c.Saturometria}%` : '-'}</td>
											<td>
												<span className={c.IdHci && c.IdHci > 0 ? tableStyles.badgeHC : tableStyles.badgeENF}>
													{c.IdHci && c.IdHci > 0 ? 'HC' : 'ENF'}
												</span>
											</td>
											<td>{obtenerNombreCompleto(c.OperadorApellido, c.OperadorNombres)}</td>
											<td className={tableStyles.observaciones}>{c.Observaciones || '-'}</td>
											<td className={tableStyles.cellAccion}>
												<div className={tableStyles.actionBtns}>
													<button className={tableStyles.btnAction} onClick={() => setSelectedControl(c)} title="Ver detalle">
														<IoEyeOutline color="#5BC0DE" size={18} />
													</button>
													<button className={tableStyles.btnAction} onClick={() => handleEliminar(c)} title="Eliminar">
														<IoTrashOutline color="#5BC0DE" size={18} />
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}
				</div>
			</div>

			{/* Modal detalle */}
			{selectedControl && (
				<div className={tableStyles.modalOverlay} onClick={() => setSelectedControl(null)}>
					<div className={tableStyles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={tableStyles.modalHeader}>
							<h3>Detalle del Control</h3>
							<button className={tableStyles.btnCerrar} onClick={() => setSelectedControl(null)}>×</button>
						</div>
						<div className={tableStyles.modalBody}>
							<div className={tableStyles.detailGrid}>
								{[
									['Fecha', formatearFecha(selectedControl.FechaControl)],
									['Hora', formatearHora(selectedControl.HoraControl)],
									['Pulso', selectedControl.Pulso || '-'],
									['TA Máxima', selectedControl.Maximo || '-'],
									['TA Mínima', selectedControl.Minimo || '-'],
									['PA Media', selectedControl.PAMedia || '-'],
									['Frec. Resp.', selectedControl.FrecuenciaRespiratoria || '-'],
									['T° Axilar', selectedControl.Axilar ? `${Number(selectedControl.Axilar).toFixed(1)}°C` : '-'],
									['T° Rectal', selectedControl.Rectal ? `${selectedControl.Rectal}°C` : '-'],
									['Saturación', selectedControl.Saturometria ? `${selectedControl.Saturometria}%` : '-'],
									['HGT', selectedControl.Hgt || '-'],
									['Peso', selectedControl.Peso ? `${selectedControl.Peso} kg` : '-'],
									['Talla', selectedControl.Talla ? `${selectedControl.Talla} cm` : '-'],
									['IMC', selectedControl.IMC
										? `${selectedControl.IMC} kg/m²`
										: (selectedControl.Peso && selectedControl.Talla
											? `${formatIMC(selectedControl.Peso, selectedControl.Talla)} kg/m²`
											: '-')],
									['Operador', obtenerNombreCompleto(selectedControl.OperadorApellido, selectedControl.OperadorNombres)],
									['Profesional', obtenerNombreCompleto(selectedControl.ProfesionalApellido, selectedControl.ProfesionalNombres)],
								].map(([label, value]) => (
									<div className={tableStyles.detailItem} key={label}>
										<span className={tableStyles.detailLabel}>{label}:</span>
										<span className={tableStyles.detailValue}>{value}</span>
									</div>
								))}
								<div className={tableStyles.detailItem} style={{ gridColumn: '1 / -1' }}>
									<span className={tableStyles.detailLabel}>Observaciones:</span>
									<span className={tableStyles.detailValue}>{selectedControl.Observaciones || '-'}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Modal nuevo control */}
			<ModalBasePaciente
				numeroVisita={numeroVisita ? String(numeroVisita) : ''}
				onClose={() => setModalOpen(false)}
				isOpen={modalOpen}
				titulo="Agregar Control Frecuente"
				footerButtons={
					<button type="submit" form="nuevo-control-form" className={`${styles.btn} ${styles.btnPrimary}`}>
						Guardar
					</button>
				}
			>
				<NuevoControlModal
					defaultNumeroVisita={numeroVisita}
					refetch={refetch}
					onClose={() => setModalOpen(false)}
				/>
			</ModalBasePaciente>
		</div>
	);
};

export default ControlesFrecuentesSection;
