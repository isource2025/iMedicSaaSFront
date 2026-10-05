'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Bed } from '../../types/beds';
import styles from './BedDetailView.module.css';
import Loader from '../Loader/Loader';

/** Si ya tienes estos componentes, usa los tuyos */
import PatientMiniHeader from './patient/PatientMiniHeader';
import CalendarPanel from './sidebar/CalendarPanel';
import SidebarFilters from './sidebar/SidebarFilters';
import { useBedDetail } from './contexts/BedDetailContext';
import { getIdSectorFromToken } from '../../utils/jwtSession';
import { useMarcarIndicacionesVistasAlSalir } from '../../hooks/useMarcarIndicacionesVistasAlSalir';
// Secciones iniciales (indicaciones para todos, adjuntos para CARGA_HC): estáticas,
// así el primer render de la ficha no espera un chunk extra.
import IndicacionesSection from './indicaciones/IndicacionesSection';
import AdjuntosSection from './adjuntos/AdjuntosSection';
import AdjuntosModal from './adjuntos/AdjuntosModal';
import BedFloatingActions from './BedFloatingActions';
import BedSectionsPrefetcher from './BedSectionsPrefetcher';
import NursingReportModal from '../nursing/NursingReportModal';
import LabResultsModal from './laboratorios/LabResultsModal';
import { bedToHeaderSnapshot } from '../../utils/bedHeader';
import AdmissionVisitExportModal from '../admission/AdmissionVisitExportModal';

/**
 * El resto de las secciones se renderiza de a una (según `activeSection`), así
 * que cada una va en su propio chunk y se descarga la primera vez que se abre.
 * Antes las 18 venían en el bundle de /beds/[id] (≈550 KB de First Load JS).
 */
const SeccionCargando = () => (
	<div style={{ position: 'relative', minHeight: '220px' }}>
		<Loader />
	</div>
);
// next/dynamic exige el objeto de opciones como literal en cada llamada.
const MedicacionSuministradaSection = dynamic(() => import('./medicacion/MedicacionSuministradaSection'), { loading: SeccionCargando });
const ControlesFrecuentesSection = dynamic(() => import('./controles/ControlesFrecuentesSection'), { loading: SeccionCargando });
const EvolucionEnfermeriaSection = dynamic(() => import('./evolucion/EvolucionEnfermeriaSection'), { loading: SeccionCargando });
const InsumosSection = dynamic(() => import('./insumos/InsumosSection'), { loading: SeccionCargando });
const MovimientosSection = dynamic(() => import('./movimientos/MovimientosSection'), { loading: SeccionCargando });
const EvolucionesSection = dynamic(() => import('./evoluciones/EvolucionesSection'), { loading: SeccionCargando });
const HCIngresoSection = dynamic(() => import('./hc-ingreso/HCIngresoSection'), { loading: SeccionCargando });
const LabResultsSection = dynamic(() => import('./laboratorios/LabResultsSection'), { loading: SeccionCargando });
const EstudiosSection = dynamic(() => import('./estudios/EstudiosSection'), { loading: SeccionCargando });
const ProtocolosSection = dynamic(() => import('./protocolos/ProtocolosSection'), { loading: SeccionCargando });
const InterconsultaSection = dynamic(() => import('./interconsulta/InterconsultaSection'), { loading: SeccionCargando });
const EpicrisisSection = dynamic(() => import('./epicrisis/EpicrisisSection'), { loading: SeccionCargando });
const ProcedimientosSection = dynamic(() => import('./procedimientos/ProcedimientosSection'), { loading: SeccionCargando });
const BalanceHidricoSection = dynamic(() => import('./balance-hidrico/BalanceHidricoSection'), { loading: SeccionCargando });
const DietaSection = dynamic(() => import('./dieta/DietaSection'), { loading: SeccionCargando });

interface BedDetailViewProps {
	bed: Bed;
}

const BedDetailView: React.FC<BedDetailViewProps> = ({ bed }) => {
	// Drawer (sidebar) en mobile
	const [drawerOpen, setDrawerOpen] = useState(false);
	// Modal de archivos adjuntos
	const [showAdjuntosModal, setShowAdjuntosModal] = useState(false);
	const [showNursingModal, setShowNursingModal] = useState(false);
	const [showLabModal, setShowLabModal] = useState(false);
	const [showExportAll, setShowExportAll] = useState(false);

	// Usar el context para filtros y navegación
	const { activeSection, selectedDate, setSelectedDate, navigateToSection } = useBedDetail();
	const headerSnapshot = bedToHeaderSnapshot(bed);
	const numeroVisita = bed?.NumeroVisita ?? bed?.numeroVisita ?? null;
	const sectorOrigen = getIdSectorFromToken() || bed?.sector || null;
	useMarcarIndicacionesVistasAlSalir(numeroVisita);

	return (
		<div className={styles.root}>
			<BedSectionsPrefetcher numeroVisita={bed?.NumeroVisita || null} />
			{/* ====== HEADER (arriba de todo) ====== */}
			<header className={styles.header}>
				<PatientMiniHeader
					numeroVisita={numeroVisita ?? ''}
					header={headerSnapshot}
					burgerButton={
						<button
							className={styles.burger}
							onClick={() => setDrawerOpen(true)}
							aria-label='Abrir menú'
						>
							<span className={styles.chevronIcon}>›</span>
						</button>
					}
				/>
			</header>

			{/* ====== MAIN CONTENT (sidebar + body) ====== */}
			<div className={styles.mainContent}>
				{/* LEFT (calendar + sidebar) */}
				<aside className={`${styles.left} ${drawerOpen ? styles.leftOpen : ''}`}>
					<div className={styles.leftInner}>
						<button className={styles.closeBtn} onClick={() => setDrawerOpen(false)}>
							✕
						</button>
						<CalendarPanel
							selected={selectedDate ?? undefined}
							fechaIngreso={bed?.fechaIngresoSQL}
							fechaEgreso={bed?.fechaEgresoSQL}
							egresada={Boolean(bed?.egresada)}
						/>
						<SidebarFilters
							onCloseDrawer={() => setDrawerOpen(false)}
							onExportDetalle={numeroVisita ? () => setShowExportAll(true) : undefined}
						/>
					</div>
				</aside>

				{/* RIGHT (body) */}
				<section className={styles.right}>
					<div className={styles.body}>
					{activeSection === 'indicaciones' ? (
						<>
							<IndicacionesSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
							/>
						</>
					) : activeSection === 'control' ? (
						<>
							<ControlesFrecuentesSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
							/>
						</>
					) : activeSection === 'medicacion-suministrada' ? (
						<>
							<MedicacionSuministradaSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
							/>
						</>
					) : activeSection === 'controles-frecuentes' ? (
						<>
							<ControlesFrecuentesSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
							/>
						</>
					) : activeSection === 'evolucion-enfermeria' ? (
						<>
							<EvolucionEnfermeriaSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
							/>
						</>
					) : activeSection === 'dieta' ? (
						<DietaSection
							numeroVisita={bed?.NumeroVisita || null}
							patientName={bed?.NombrePaciente}
							patientLocation={bed?.ubicacionPaciente}
							documentoPaciente={bed?.documentoPaciente}
							fechaIngreso={bed?.fechaIngresoSQL}
							horaIngreso={bed?.horaIngresoSQL}
						/>
					) : activeSection === 'balance-hidrico' ? (
						<>
							<BalanceHidricoSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
								bedSector={bed?.sector}
							/>
						</>
					) : activeSection === 'insumos' ? (
						<>
							<InsumosSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
							/>
						</>
					) : activeSection === 'hcIngreso' ? (
						<HCIngresoSection
							numeroVisita={bed?.NumeroVisita || null}
							patientName={bed?.NombrePaciente}
							patientLocation={bed?.ubicacionPaciente}
							documentoPaciente={bed?.documentoPaciente}
							bedSector={bed?.sector}
						/>
					) : activeSection === 'evoluciones' ? (
						<>
							<EvolucionesSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
							/>
						</>
					) : activeSection === 'interconsulta' ? (
						<InterconsultaSection
							numeroVisita={bed?.NumeroVisita || null}
							sectorSolicitante={sectorOrigen}
							patientName={bed?.NombrePaciente}
							documentoPaciente={bed?.documentoPaciente}
							patientLocation={bed?.ubicacionPaciente}
						/>
					) : activeSection === 'solicitudEstudios' ? (
						<EstudiosSection
							numeroVisita={bed?.NumeroVisita || null}
							sectorSolicitante={sectorOrigen}
							patientName={bed?.NombrePaciente}
							documentoPaciente={bed?.documentoPaciente}
							patientLocation={bed?.ubicacionPaciente}
						/>
					) : activeSection === 'laboratorios' ? (
						<LabResultsSection
							numeroVisita={bed?.NumeroVisita || null}
							patientName={bed?.NombrePaciente}
							patientLocation={bed?.ubicacionPaciente}
							documentoPaciente={bed?.documentoPaciente}
							fechaIngreso={bed?.fechaIngresoSQL}
							horaIngreso={bed?.horaIngresoSQL}
						/>
					) : activeSection === 'protocolos' ? (
						<ProtocolosSection
							numeroVisita={bed?.NumeroVisita || null}
							sector={bed?.sector || null}
						/>
					) : activeSection === 'epicrisis' ? (
						<EpicrisisSection
							numeroVisita={bed?.NumeroVisita || null}
							patientName={bed?.NombrePaciente}
							documentoPaciente={bed?.documentoPaciente}
							bedSector={bed?.sector || undefined}
							patientLocation={bed?.ubicacionPaciente}
						/>
					) : activeSection === 'procedimientos' ? (
						<ProcedimientosSection
							numeroVisita={bed?.NumeroVisita || null}
							patientName={bed?.NombrePaciente}
							documentoPaciente={bed?.documentoPaciente}
							patientLocation={bed?.ubicacionPaciente}
						/>
					) : activeSection === 'movimientos' ? (
						<MovimientosSection
							numeroVisita={bed?.NumeroVisita || null}
							patientName={bed?.NombrePaciente}
							patientLocation={bed?.ubicacionPaciente}
							documentoPaciente={bed?.documentoPaciente}
							fechaIngreso={bed?.fechaIngresoSQL}
							horaIngreso={bed?.horaIngresoSQL}
							header={headerSnapshot}
							internado={bed?.estado === 'ocupada' && !bed?.egresada}
						/>
					) : activeSection === 'adjuntos' ? (
						<>
							<AdjuntosSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
								documentoPaciente={bed?.documentoPaciente}
								fechaIngreso={bed?.fechaIngresoSQL}
								horaIngreso={bed?.horaIngresoSQL}
							/>
						</>
					) : (
						<div className={styles.placeholderCard}>
							<div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
								<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
									📄
								</div>
								<h3 style={{ margin: '0 0 0.5rem 0', color: '#0083A9' }}>
									{String(activeSection).charAt(0).toUpperCase() +
										String(activeSection).slice(1)}
								</h3>
								<p style={{ color: '#666', margin: '0' }}>
									Sección en desarrollo.
									<br />
									<em>Próximamente disponible</em>
								</p>
							</div>
						</div>
					)}
					</div>
				</section>
			</div>

			{bed?.NumeroVisita ? (
				<BedFloatingActions
					onOpenAdjuntos={() => setShowAdjuntosModal(true)}
					onOpenNursing={() => setShowNursingModal(true)}
					onOpenLaboratorios={() => setShowLabModal(true)}
				/>
			) : null}

			{/* Modal de archivos adjuntos */}
			{bed?.NumeroVisita && (
				<AdjuntosModal
					numeroVisita={bed.NumeroVisita}
					isOpen={showAdjuntosModal}
					onClose={() => setShowAdjuntosModal(false)}
				/>
			)}

			{bed?.NumeroVisita || bed?.numeroVisita ? (
				<NursingReportModal
					isOpen={showNursingModal}
					onClose={() => setShowNursingModal(false)}
					numeroVisita={Number(bed.NumeroVisita || bed.numeroVisita)}
					nombrePaciente={bed.NombrePaciente || 'Paciente'}
					header={headerSnapshot}
					bedSector={bed.sector}
				/>
			) : null}

			{bed?.NumeroVisita || bed?.numeroVisita ? (
				<LabResultsModal
					isOpen={showLabModal}
					onClose={() => setShowLabModal(false)}
					numeroVisita={Number(bed.NumeroVisita || bed.numeroVisita)}
					header={headerSnapshot}
				/>
			) : null}

			{numeroVisita ? (
				<AdmissionVisitExportModal
					isOpen={showExportAll}
					onClose={() => setShowExportAll(false)}
					numeroVisita={numeroVisita}
				/>
			) : null}

			{/* Backdrop del drawer */}
			{drawerOpen && (
				<div className={styles.backdrop} onClick={() => setDrawerOpen(false)} />
			)}
		</div>
	);
};

export default BedDetailView;
