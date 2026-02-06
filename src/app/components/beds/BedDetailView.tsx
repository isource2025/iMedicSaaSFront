'use client';

import React, { useState } from 'react';
import { Bed } from '../../types/beds';
import styles from './BedDetailView.module.css';

/** Si ya tienes estos componentes, usa los tuyos */
import PatientMiniHeader from './patient/PatientMiniHeader';
import CalendarPanel from './sidebar/CalendarPanel';
import SidebarFilters from './sidebar/SidebarFilters';
import { useBedDetail } from './contexts/BedDetailContext';
import IndicacionesSection from './indicaciones/IndicacionesSection';
import MedicacionSuministradaSection from './medicacion/MedicacionSuministradaSection';
import ControlesFrecuentesSection from './controles/ControlesFrecuentesSection';
import EvolucionEnfermeriaSection from './evolucion/EvolucionEnfermeriaSection';
import InsumosSection from './insumos/InsumosSection';

interface BedDetailViewProps {
	bed: Bed;
}

const BedDetailView: React.FC<BedDetailViewProps> = ({ bed }) => {
	// Drawer (sidebar) en mobile
	const [drawerOpen, setDrawerOpen] = useState(false);

	// Usar el context para filtros y navegación
	const { activeSection, selectedDate, setSelectedDate, navigateToSection } = useBedDetail();

	return (
		<div className={styles.root}>
			{/* ====== HEADER (arriba de todo) ====== */}
			<header className={styles.header}>
				<PatientMiniHeader
					numeroVisita={bed?.NumeroVisita ?? bed?.numeroVisita ?? ''}
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
						<CalendarPanel selected={selectedDate ?? undefined} />
						<SidebarFilters />
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
							/>
						</>
					) : activeSection === 'control' ? (
						<>
							<ControlesFrecuentesSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
							/>
						</>
					) : activeSection === 'medicacion-suministrada' ? (
						<>
							<MedicacionSuministradaSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
							/>
						</>
					) : activeSection === 'controles-frecuentes' ? (
						<>
							<ControlesFrecuentesSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
							/>
						</>
					) : activeSection === 'evolucion-enfermeria' ? (
						<>
							<EvolucionEnfermeriaSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
							/>
						</>
					) : activeSection === 'insumos' ? (
						<>
							<InsumosSection
								numeroVisita={bed?.NumeroVisita || null}
								patientName={bed?.NombrePaciente}
								patientLocation={bed?.ubicacionPaciente}
							/>
						</>
					) : activeSection === 'hcIngreso' ? (
						<div className={styles.placeholderCard}>
							<div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
								<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
									📋
								</div>
								<h3 style={{ margin: '0 0 0.5rem 0', color: '#0083A9' }}>
									Historia Clínica de Ingreso
								</h3>
								<p style={{ color: '#666', margin: '0' }}>
									Información completa del ingreso del paciente.
									<br />
									<strong>Paciente:</strong> {bed.NombrePaciente}
									<br />
									<strong>Documento:</strong> {bed.documentoPaciente}
									<br />
									<strong>Servicio:</strong> {bed.servicioMedicoDescripcion}
								</p>
							</div>
						</div>
					) : activeSection === 'evoluciones' ? (
						<div className={styles.placeholderCard}>
							<div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
								<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
									📝
								</div>
								<h3 style={{ margin: '0 0 0.5rem 0', color: '#0083A9' }}>
									Evoluciones Médicas
								</h3>
								<p style={{ color: '#666', margin: '0' }}>
									Registro de evoluciones y notas médicas del paciente.
									<br />
									<strong>Paciente:</strong> {bed.NombrePaciente}
									<br />
									<strong>Diagnóstico:</strong>{' '}
									{bed.diagnosticoDescripcion || 'No especificado'}
								</p>
							</div>
						</div>
					) : activeSection === 'solicitudEstudios' ? (
						<div className={styles.placeholderCard}>
							<div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
								<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
									🧪
								</div>
								<h3 style={{ margin: '0 0 0.5rem 0', color: '#0083A9' }}>
									Estudios y Laboratorios
								</h3>
								<p style={{ color: '#666', margin: '0' }}>
									Resultados de análisis clínicos y estudios diagnósticos
									para el paciente.
									<br />
									<strong>Paciente:</strong> {bed.NombrePaciente}
									<br />
									<strong>Fecha de ingreso:</strong>{' '}
									{bed.fechaIngresoFormateada || 'No disponible'}
								</p>
							</div>
						</div>
					) : activeSection === 'protocolos' ? (
						<div className={styles.placeholderCard}>
							<div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
								<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
									📋
								</div>
								<h3 style={{ margin: '0 0 0.5rem 0', color: '#0083A9' }}>
									Protocolos
								</h3>
								<p style={{ color: '#666', margin: '0' }}>
									Protocolos médicos aplicables al paciente.
									<br />
									<strong>Servicio:</strong> {bed.servicioMedicoDescripcion}
									<br />
									<strong>Estado:</strong> {bed.estadoDescripcion}
								</p>
							</div>
						</div>
					) : activeSection === 'epicrisis' ? (
						<div className={styles.placeholderCard}>
							<div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
								<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
									📄
								</div>
								<h3 style={{ margin: '0 0 0.5rem 0', color: '#0083A9' }}>
									Epicrisis
								</h3>
								<p style={{ color: '#666', margin: '0' }}>
									Resumen médico del episodio de hospitalización.
									<br />
									<strong>Paciente:</strong> {bed.NombrePaciente}
									<br />
									<strong>Fecha de ingreso:</strong>{' '}
									{bed.fechaIngresoFormateada || 'No disponible'}
								</p>
							</div>
						</div>
					) : activeSection === 'procedimientos' ? (
						<div className={styles.placeholderCard}>
							<div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
								<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
									⚕️
								</div>
								<h3 style={{ margin: '0 0 0.5rem 0', color: '#0083A9' }}>
									Procedimientos
								</h3>
								<p style={{ color: '#666', margin: '0' }}>
									Procedimientos médicos realizados al paciente.
									<br />
									<strong>Paciente:</strong> {bed.NombrePaciente}
									<br />
									<strong>Servicio:</strong> {bed.servicioMedicoDescripcion}
								</p>
							</div>
						</div>
					) : activeSection === 'movimientos' ? (
						<div className={styles.placeholderCard}>
							<div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
								<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
									🔄
								</div>
								<h3 style={{ margin: '0 0 0.5rem 0', color: '#0083A9' }}>
									Movimientos
								</h3>
								<p style={{ color: '#666', margin: '0' }}>
									Historial de movimientos y traslados del paciente.
									<br />
									<strong>Cama actual:</strong> {bed.numeroCama}
									<br />
									<strong>Sector:</strong> {bed.sector}
								</p>
							</div>
						</div>
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

			{/* Backdrop del drawer */}
			{drawerOpen && (
				<div className={styles.backdrop} onClick={() => setDrawerOpen(false)} />
			)}
		</div>
	);
};

export default BedDetailView;
