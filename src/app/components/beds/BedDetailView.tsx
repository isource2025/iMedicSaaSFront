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

interface BedDetailViewProps {
	bed: Bed;
}

const BedDetailView: React.FC<BedDetailViewProps> = ({ bed }) => {
	// Drawer (sidebar) en mobile
	const [drawerOpen, setDrawerOpen] = useState(false);

	// Filtros simples de ejemplo
	const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
	const [activeSection, setActiveSection] = useState<
		| 'indicaciones'
		| 'evoluciones'
		| 'estudios'
		| 'protocolos'
		| 'epicrisis'
		| 'procedimientos'
		| 'movimientos'
	>('indicaciones');

	// Tabla (trae tus datos reales via hooks)
	const rows: any[] = [];

	return (
		<div className={styles.root}>
			{/* ====== LEFT (calendar + sidebar) ====== */}
			<aside className={`${styles.left} ${drawerOpen ? styles.leftOpen : ''}`}>
				<div className={styles.leftInner}>
					<button className={styles.closeBtn} onClick={() => setDrawerOpen(false)}>
						✕
					</button>
					<CalendarPanel
						selected={selectedDate ?? undefined}
						onSelect={setSelectedDate}
					/>
					<SidebarFilters onChange={(k) => setActiveSection(k as any)} />
				</div>
			</aside>

			{/* ====== RIGHT (header + body + footer) ====== */}
			<section className={styles.right}>
				{/* Header con datos del paciente + botón ☰ en mobile */}
				<header className={styles.header}>
					<button
						className={styles.burger}
						onClick={() => setDrawerOpen(true)}
						aria-label='Abrir menú'
					>
						☰
					</button>

					<PatientMiniHeader
						nombre={bed?.nombrePaciente ?? 'PACIENTE'}
						nroVisita={bed?.mostrarNumeroVisita || bed?.numeroVisita}
						ubicacion='Ubicacion del paciente'
					/>
				</header>

				{/* Cuerpo */}
				<div className={styles.body}>
					{activeSection === 'indicaciones' ? (
						<IndicacionesTable rows={rows as any} />
					) : (
						<div className={styles.placeholderCard}>
							Próximamente: {activeSection}
						</div>
					)}
				</div>

				{/* Barra inferior (acciones) */}
				<div className={styles.footer}>
					{activeSection === 'indicaciones' ? (
						<IndicacionesToolbar
							total={rows.length}
							onVisualizar={() => {}}
							onAplicar={() => {}}
							onDejarSinEfecto={() => {}}
							onImprimir={() => {}}
							onRecetario={() => {}}
							disabled={rows.length === 0}
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
