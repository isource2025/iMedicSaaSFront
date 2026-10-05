'use client';

import React, { useMemo, useState } from 'react';
import type { DietaControl } from '../../../types/dietaControl';
import {
	eliminarDieta,
	estaSuministrada,
	fechaEfectiva,
	formatearFecha,
	formatearHora,
	horaEfectiva,
} from '../../../services/dietaControlService';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import styles from '../indicaciones/IndicacionesSection.module.css';
import tableStyles from '../medicacion/MedicacionSuministradaSection.module.css';
import ds from './DietaSection.module.css';
import BedSectionLoading from '../shared/BedSectionLoading';
import EmptyState from '../shared/EmptyState';
import ConfirmationModal from '../shared/ConfirmationModal';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import PeriodFilter, { Periodo } from '../shared/PeriodFilter';
import { exportToPDF } from '../../../utils/pdfExportLazy';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import { IoEyeOutline, IoTrashOutline, IoPencilOutline } from 'react-icons/io5';
import ModalBasePaciente from '../../modals/ModalBasePaciente';
import NuevaDietaModal from './NuevaDietaModal';
import { useUsuarioActual, esRegistroPropio, esAdminClinico } from '../../../hooks/useUsuarioActual';
import { usePermiso } from '../../../hooks/usePermiso';

interface Props {
	numeroVisita: number | null;
	patientName?: string;
	patientLocation?: string;
	documentoPaciente?: string;
	fechaIngreso?: string;
	horaIngreso?: string;
}

const FORM_ID = 'nueva-dieta-form';

const PERIODOS_ALCANCE: Record<Periodo, string> = {
	'0': 'Día seleccionado',
	'7': 'Última semana',
	'30': 'Último mes',
	all: 'Toda la internación',
};

function toISODate(d: Date | null | undefined): string | null {
	if (!d) return null;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const profesional = (d: DietaControl) => d.ProfesionalFullName || d.OperadorFullName || '—';

const DietaSection: React.FC<Props> = ({
	numeroVisita,
	patientName,
	patientLocation,
	documentoPaciente,
	fechaIngreso,
	horaIngreso,
}) => {
	const { activeSection, selectedDate } = useBedDetail();
	const [selected, setSelected] = useState<DietaControl | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<DietaControl | null>(null);
	const [aEliminar, setAEliminar] = useState<DietaControl | null>(null);
	const [query, setQuery] = useState('');
	const [periodo, setPeriodo] = useState<Periodo>('0');
	const usuarioActual = useUsuarioActual();
	const { puede } = usePermiso();
	const puedeCrear = puede('INTERNACION.DIETA.CREAR');
	const puedeEditar = puede('INTERNACION.DIETA.EDITAR');
	const puedeEliminar = puede('INTERNACION.DIETA.ELIMINAR');

	const puedeGestionarFila = (d: DietaControl) => {
		if (esAdminClinico()) return true;
		return (
			esRegistroPropio(
				{ OperadorCarga: d.OperadorCarga, CargadoPor: d.OperadorCarga } as Record<string, unknown>,
				usuarioActual,
			) === true
		);
	};

	const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);
	const path = useMemo(
		() => (numeroVisita ? `/dieta-control/${numeroVisita}/byDate` : undefined),
		[numeroVisita],
	);
	const paramsPeriodo = useMemo(() => (periodo === '0' ? undefined : { days: periodo }), [periodo]);

	const { data, isLoading, error, refetch } = useBedSectionFetch<{
		success?: boolean;
		data?: DietaControl[];
	}>({
		enabled: !!path && activeSection === 'dieta',
		endpointOverride: path ? { dieta: path } : undefined,
		params: paramsPeriodo,
		cacheTimeMs: 15000,
	});

	const registros: DietaControl[] = useMemo(
		() =>
			Array.isArray(data)
				? (data as DietaControl[])
				: data && Array.isArray(data.data)
					? data.data
					: [],
		[data],
	);

	const filtrados = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return registros;
		return registros.filter((d) =>
			[d.DescripcionDieta, d.Observaciones, d.ProfesionalFullName, d.OperadorFullName]
				.map((s) => String(s || '').toLowerCase())
				.join(' ')
				.includes(q),
		);
	}, [registros, query]);

	const soloDia = periodo === '0';
	const alcance = PERIODOS_ALCANCE[periodo];

	const formatSelectedDate = () => {
		if (!selectedDate) return null;
		const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
		const meses = [
			'Enero',
			'Febrero',
			'Marzo',
			'Abril',
			'Mayo',
			'Junio',
			'Julio',
			'Agosto',
			'Septiembre',
			'Octubre',
			'Noviembre',
			'Diciembre',
		];
		return {
			diaSemana: dias[selectedDate.getDay()],
			diaMes: selectedDate.getDate(),
			mes: meses[selectedDate.getMonth()],
		};
	};
	const fechaFormateada = formatSelectedDate();

	const abrirNuevo = () => {
		setEditing(null);
		setModalOpen(true);
	};
	const abrirEditar = (d: DietaControl) => {
		setEditing(d);
		setModalOpen(true);
	};
	const cerrarModal = () => {
		setModalOpen(false);
		setEditing(null);
	};

	const confirmarEliminar = async () => {
		if (!aEliminar) return;
		const d = aEliminar;
		setAEliminar(null);
		try {
			await eliminarDieta(d.IdCtrlDieta);
			refetch();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Error al eliminar el registro');
		}
	};

	const handleExport = async (option: ExportOption) => {
		if (option !== 'pdf') return;
		const empresaInfo = await obtenerInfoEmpresa();
		const parts = filtrados.map((d, idx) => ({
			title: `Dieta ${idx + 1}`,
			fields: [
				{ label: 'Fecha', value: formatearFecha(fechaEfectiva(d)) },
				{ label: 'Hora', value: formatearHora(horaEfectiva(d)) },
				{ label: 'Tipo de dieta', value: d.DescripcionDieta || '—' },
				{ label: 'Estado', value: estaSuministrada(d) ? 'Suministrada' : 'Indicada' },
				{ label: 'Nro. indicación', value: d.NroIndicacion ? String(d.NroIndicacion) : '—' },
				{ label: 'Observaciones', value: d.Observaciones || '—' },
			],
			profesional: {
				nombre: profesional(d),
				matricula: d.Matricula ?? undefined,
				especialidad: 'Enfermería',
			},
		}));

		await exportToPDF({
			title: 'Dietas',
			subtitle: soloDia ? `Fecha: ${fechaISO}` : alcance,
			parts,
			fileName: `dietas_${soloDia ? fechaISO : periodo === 'all' ? 'internacion' : `${periodo}d_${fechaISO}`}.pdf`,
			orientation: 'portrait',
			empresaInfo,
			patientInfo: {
				numeroVisita: numeroVisita || undefined,
				nombre: patientName,
				numeroDocumento: documentoPaciente,
				ubicacion: patientLocation,
				fechaIngreso,
				horaIngreso,
			},
		});
	};

	if (activeSection !== 'dieta') return null;
	if (isLoading) return <BedSectionLoading />;

	const estadoBadge = (d: DietaControl) =>
		estaSuministrada(d) ? (
			<span className={`${ds.estado} ${ds.estadoSuministrada}`}>Suministrada</span>
		) : (
			<span className={`${ds.estado} ${ds.estadoIndicada}`}>Indicada</span>
		);

	const acciones = (d: DietaControl) => (
		<div className={tableStyles.actionBtns}>
			<button className={tableStyles.btnAction} onClick={() => setSelected(d)} title="Ver detalle">
				<IoEyeOutline color="#5BC0DE" size="18px" />
			</button>
			{puedeEditar && puedeGestionarFila(d) && (
				<button className={tableStyles.btnAction} onClick={() => abrirEditar(d)} title="Cambiar">
					<IoPencilOutline color="#5BC0DE" size="18px" />
				</button>
			)}
			{puedeEliminar && puedeGestionarFila(d) && (
				<button className={tableStyles.btnAction} onClick={() => setAEliminar(d)} title="Borrar">
					<IoTrashOutline color="#5BC0DE" size="18px" />
				</button>
			)}
		</div>
	);

	return (
		<div className={styles.root}>
			{fechaFormateada && (
				<div className={styles.dateHeader}>
					<h2 className={styles.sectionTitle}>Dietas</h2>
					<span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
					<span className={styles.dateText}>
						{fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
					</span>
					<div className={styles.dateActions}>
						{puedeCrear && (
							<button
								className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
								onClick={abrirNuevo}
							>
								<span className={styles.addIcon} aria-hidden>
									+
								</span>
								Agregar dieta
							</button>
						)}
						<ExportButton
							data={filtrados}
							fileName={`dietas_${fechaISO}.pdf`}
							onExport={handleExport}
							options={['pdf']}
						/>
					</div>
				</div>
			)}

			<div className={styles.toolbar}>
				<div className={styles.searchWrap}>
					<span className={styles.searchIcon} aria-hidden>
						🔎
					</span>
					<input
						className={styles.searchInput}
						type="text"
						placeholder="Buscar por tipo de dieta, observaciones, profesional…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				<PeriodFilter value={periodo} onChange={setPeriodo} />
			</div>

			<div className={styles.content}>
				<div className={styles.tableHolder}>
					{error && <div className={styles.errorBox}>Error al cargar: {error.message}</div>}
					{!error && filtrados.length === 0 ? (
						<EmptyState
							variant="dieta"
							text={
								registros.length
									? 'Sin resultados'
									: soloDia
										? 'No hay dietas registradas para esta fecha'
										: `No hay dietas registradas (${alcance.toLowerCase()})`
							}
							description={
								registros.length
									? 'Probá con otro criterio de búsqueda o período.'
									: 'Las dietas se registran al indicarlas o cumplirlas, o con el botón Agregar.'
							}
							actionLabel={puedeCrear && !registros.length ? 'Agregar dieta' : undefined}
							onAction={puedeCrear && !registros.length ? abrirNuevo : undefined}
						/>
					) : !error ? (
						<>
							<div className={tableStyles.tableContainer}>
								<table className={tableStyles.table}>
									<thead>
										<tr>
											<th>Fecha</th>
											<th>Hora</th>
											<th>Tipo de dieta</th>
											<th>Estado</th>
											<th>Observaciones</th>
											<th>Profesional</th>
											<th>Acciones</th>
										</tr>
									</thead>
									<tbody>
										{filtrados.map((d) => (
											<tr key={d.IdCtrlDieta}>
												<td>{formatearFecha(fechaEfectiva(d))}</td>
												<td>{formatearHora(horaEfectiva(d))}</td>
												<td>
													<span className={tableStyles.medicamentoPrincipal}>
														{d.DescripcionDieta || '—'}
													</span>
													{d.NroIndicacion ? (
														<span className={ds.nroIndicacion}>
															Indicación #{d.NroIndicacion}
														</span>
													) : null}
												</td>
												<td>{estadoBadge(d)}</td>
												<td className={tableStyles.observaciones} title={d.Observaciones || ''}>
													{d.Observaciones || '—'}
												</td>
												<td>
													<span className={tableStyles.profesionalPrimary}>{profesional(d)}</span>
												</td>
												<td className={tableStyles.cellAccion}>{acciones(d)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className={tableStyles.mobileCards}>
								{filtrados.map((d) => (
									<article key={`dieta-m-${d.IdCtrlDieta}`} className={tableStyles.mobileCard}>
										<div className={tableStyles.mobileCardHeader}>
											<span>
												{formatearFecha(fechaEfectiva(d))} {formatearHora(horaEfectiva(d))}
											</span>
											{estadoBadge(d)}
										</div>
										<p className={tableStyles.mobileTitle}>{d.DescripcionDieta || '—'}</p>
										{d.Observaciones && <p className={tableStyles.mobileMeta}>{d.Observaciones}</p>}
										<p className={tableStyles.mobileProfesional}>{profesional(d)}</p>
										{acciones(d)}
									</article>
								))}
							</div>
						</>
					) : null}
				</div>
			</div>

			{selected && (
				<div className={tableStyles.modalOverlay} onClick={() => setSelected(null)}>
					<div className={tableStyles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={tableStyles.modalHeader}>
							<h3 className="modal-title">Detalle de dieta</h3>
							<button className={tableStyles.btnCerrar} onClick={() => setSelected(null)}>
								×
							</button>
						</div>
						<div className={tableStyles.modalBody}>
							<div className={tableStyles.detailGrid}>
								{[
									['Tipo de dieta', selected.DescripcionDieta || '—'],
									['Estado', estaSuministrada(selected) ? 'Suministrada' : 'Indicada'],
									['Fecha dieta', formatearFecha(selected.FechaDieta)],
									['Hora dieta', formatearHora(selected.HoraDieta)],
									['Fecha carga', formatearFecha(selected.FechaCarga)],
									['Hora carga', formatearHora(selected.HoraCarga)],
									['Nro. indicación', selected.NroIndicacion ? String(selected.NroIndicacion) : '—'],
									['Profesional', selected.ProfesionalFullName || '—'],
									['Operador', selected.OperadorFullName || '—'],
									['Observaciones', selected.Observaciones || '—'],
								].map(([label, value]) => (
									<div key={label} className={tableStyles.detailItem}>
										<span className={tableStyles.detailLabel}>{label}:</span>
										<span className={tableStyles.detailValue}>{value}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			<ConfirmationModal
				isOpen={!!aEliminar}
				onClose={() => setAEliminar(null)}
				onConfirm={confirmarEliminar}
				title="Borrar registro de dieta"
				message={
					aEliminar
						? `${formatearFecha(fechaEfectiva(aEliminar))} ${formatearHora(horaEfectiva(aEliminar))}\n${
								aEliminar.DescripcionDieta || 'Sin tipo de dieta'
							}\n\nEsta acción no se puede deshacer.`
						: ''
				}
				confirmText="Borrar"
				cancelText="Cancelar"
			/>

			<ModalBasePaciente
				numeroVisita={numeroVisita ? String(numeroVisita) : ''}
				onClose={cerrarModal}
				isOpen={modalOpen}
				titulo={editing ? 'Cambiar registro de dieta' : 'Agregar dieta'}
				footerButtons={
					<button type="submit" form={FORM_ID} className={`${styles.btn} ${styles.btnPrimary}`}>
						Guardar
					</button>
				}
			>
				<NuevaDietaModal
					formId={FORM_ID}
					numeroVisita={numeroVisita}
					defaultFecha={fechaISO}
					registroToEdit={editing}
					refetch={refetch}
					onClose={cerrarModal}
				/>
			</ModalBasePaciente>
		</div>
	);
};

export default DietaSection;
