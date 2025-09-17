'use client';

import React, { useState } from 'react';
import { Bed } from '../../types/beds';
import styles from './BedDetailView.module.css';

/** Si ya tienes estos componentes, usa los tuyos */
import PatientMiniHeader from './patient/PatientMiniHeader';
import CalendarPanel from './sidebar/CalendarPanel';
import SidebarFilters from './sidebar/SidebarFilters';
import IndicacionesTable from './indicaciones/IndicacionesTable';
import IndicacionesToolbar from './indicaciones/IndicacionesToolbar';
import { useIndicaciones } from './hooks/useIndicaciones';
import { useBedDetail } from './contexts/BedDetailContext';
import EmptyState from './shared/EmptyState';

interface BedDetailViewProps {
	bed: Bed;
}

const BedDetailView: React.FC<BedDetailViewProps> = ({ bed }) => {
	// Drawer (sidebar) en mobile
	const [drawerOpen, setDrawerOpen] = useState(false);

	// Estado para selección de fila
	const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

	// Usar el context para filtros y navegación
	const { activeSection, selectedDate, setSelectedDate, navigateToSection } = useBedDetail();

	// Obtener indicaciones usando el hook personalizado
	const {
		indicaciones,
		loading: loadingIndicaciones,
		error: errorIndicaciones,
	} = useIndicaciones(bed.NumeroVisita);

	// Handlers para la tabla de indicaciones
	const handleSelectRow = (id: string) => {
		setSelectedRowId(id === selectedRowId ? null : id);
	};

	// Handlers para la toolbar de indicaciones
	const handleVisualizar = () => {
		if (selectedRowId) {
			console.log('Visualizar indicación:', selectedRowId);
			// TODO: Implementar modal de visualización
		} else {
			alert('Selecciona una indicación para visualizar');
		}
	};

	const handleAplicar = () => {
		if (selectedRowId) {
			console.log('Aplicar indicación:', selectedRowId);
			// TODO: Implementar lógica de aplicación
		} else {
			alert('Selecciona una indicación para aplicar');
		}
	};

	const handleDejarSinEfecto = () => {
		if (selectedRowId) {
			console.log('Dejar sin efecto indicación:', selectedRowId);
			// TODO: Implementar lógica de dejar sin efecto
		} else {
			alert('Selecciona una indicación para dejar sin efecto');
		}
	};

	const handleImprimir = () => {
		console.log('Imprimir indicaciones');
		// TODO: Implementar impresión
	};

	const handleRecetario = () => {
		console.log('Abrir recetario');
		// TODO: Implementar recetario
	};

	console.log('Cama Encontrada', bed);

	return (
		<div className={styles.root}>
			{/* ====== LEFT (calendar + sidebar) ====== */}
			<aside className={`${styles.left} ${drawerOpen ? styles.leftOpen : ''}`}>
				<div className={styles.leftInner}>
					<button className={styles.closeBtn} onClick={() => setDrawerOpen(false)}>
						✕
					</button>
					<CalendarPanel selected={selectedDate ?? undefined} />
					<SidebarFilters />
				</div>
			</aside>

			{/* ====== RIGHT (header + body + footer) ====== */}
			<section className={styles.right}>
				{/* Header con datos del paciente + botón ☰ en mobile */}
				<header className={styles.header}>
					<PatientMiniHeader
						nombre={bed?.NombrePaciente ?? ''}
						nroVisita={bed?.NumeroVisita}
						ubicacion={bed?.ubicacionPaciente}
						burgerButton={
							<button
								className={styles.burger}
								onClick={() => setDrawerOpen(true)}
								aria-label='Abrir menú'
							>
								☰
							</button>
						}
					/>
				</header>

				{/* Cuerpo */}
				<div className={styles.body}>
					{activeSection === 'indicaciones' ? (
						<>
							{loadingIndicaciones ? (
								<div className={styles.placeholderCard}>
									<div style={{ textAlign: 'center', padding: '2rem' }}>
										<div
											style={{
												fontSize: '1.2rem',
												marginBottom: '0.5rem',
											}}
										>
											Cargando indicaciones...
										</div>
										<div style={{ color: '#666' }}>
											Obteniendo datos del servidor
										</div>
									</div>
								</div>
							) : errorIndicaciones ? (
								<div className={styles.placeholderCard}>
									<div
										style={{
											textAlign: 'center',
											padding: '2rem',
											color: '#dc3545',
										}}
									>
										<div
											style={{
												fontSize: '1.2rem',
												marginBottom: '0.5rem',
											}}
										>
											⚠️ Error al cargar indicaciones
										</div>
										<div
											style={{
												fontSize: '0.9rem',
												marginBottom: '1rem',
											}}
										>
											{errorIndicaciones}
										</div>
										<button
											onClick={() => window.location.reload()}
											style={{
												padding: '0.5rem 1rem',
												backgroundColor: '#007bff',
												color: 'white',
												border: 'none',
												borderRadius: '4px',
												cursor: 'pointer',
											}}
										>
											Reintentar
										</button>
									</div>
								</div>
							) : indicaciones.length === 0 ? (
								<EmptyState text='No hay indicaciones registradas para esta visita.' />
							) : (
								<IndicacionesTable
									rows={indicaciones}
									onSelectRow={handleSelectRow}
									selectedId={selectedRowId}
								/>
							)}
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

				{/* Barra inferior (acciones) */}
				<div className={styles.footer}>
					{activeSection === 'indicaciones' ? (
						<IndicacionesToolbar
							total={indicaciones.length}
							onVisualizar={handleVisualizar}
							onAplicar={handleAplicar}
							onDejarSinEfecto={handleDejarSinEfecto}
							onImprimir={handleImprimir}
							onRecetario={handleRecetario}
							disabled={indicaciones.length === 0 || loadingIndicaciones}
						/>
					) : null}
				</div>
			</section>

			{/* Backdrop del drawer */}
			{drawerOpen && (
				<div className={styles.backdrop} onClick={() => setDrawerOpen(false)} />
			)}
		</div>
	);
};

export default BedDetailView;
