'use client';
import { useRouter } from 'next/navigation';
import { CSSTransition } from 'react-transition-group';
import { useMemo, useRef } from 'react';
import styles from './SidebarFilters.module.css';
import { useBedDetail } from '../contexts/BedDetailContext';
import { usePermiso } from '@/app/hooks/usePermiso';

type Props = {
	bedId?: string;
	onCloseDrawer?: () => void;
};

/**
 * Mapeo entre cada `activeSection` del sidebar y su submódulo de permisos
 * dentro del módulo INTERNACION.
 *
 * Si una sección no aparece en este mapa, se considera siempre visible
 * (caso de "informe_evo" o utilitarios).
 */
const SECTION_TO_PERM: Record<string, string> = {
	hcIngreso: 'HISTORIA_CLINICA',
	indicaciones: 'INDICACIONES',
	evoluciones: 'EVOLUCIONES',
	'evolucion-enfermeria': 'EVOLUCION_ENFERMERIA',
	'controles-frecuentes': 'SIGNOS_VITALES',
	'medicacion-suministrada': 'MEDICACION',
	dieta: 'DIETA',
	'balance-hidrico': 'BALANCE_HIDRICO',
	insumos: 'INSUMOS',
	solicitudEstudios: 'ESTUDIOS',
	laboratorios: 'ESTUDIOS',
	protocolos: 'PROTOCOLOS',
	procedimientos: 'PROCEDIMIENTOS',
	movimientos: 'MOVIMIENTOS',
	adjuntos: 'ADJUNTOS',
	epicrisis: 'EPICRISIS',
};

// --- Componente de colapso con altura automática animada (enter/exit distintos) ---
function Collapse({
	in: inProp,
	children,
	durationEnter = 360,
	durationExit = 520,
	ease = 'cubic-bezier(0.2, 0.8, 0.2, 1)',
	className = '',
}: {
	in: boolean;
	children: React.ReactNode;
	/** Duración de apertura (ms) */
	durationEnter?: number;
	/** Duración de cierre (ms) */
	durationExit?: number;
	/** Función de easing CSS */
	ease?: string;
	className?: string;
}) {
	const nodeRef = useRef<HTMLDivElement>(null);

	const setTransition = (ms: number) => {
		const node = nodeRef.current;
		if (!node) return;
		node.style.transition = `height ${ms}ms ${ease}, opacity ${ms}ms ${ease}`;
	};

	const onEnter = () => {
		const node = nodeRef.current;
		if (!node) return;
		setTransition(durationEnter);
		node.style.height = '0px';
		node.style.opacity = '0';
	};

	const onEntering = () => {
		const node = nodeRef.current;
		if (!node) return;
		const h = node.scrollHeight;
		node.style.height = `${h}px`;
		node.style.opacity = '1';
	};

	const onEntered = () => {
		const node = nodeRef.current;
		if (!node) return;
		node.style.height = 'auto';
		node.style.opacity = '1';
	};

	const onExit = () => {
		const node = nodeRef.current;
		if (!node) return;
		setTransition(durationExit);
		// altura actual como punto de partida
		const h = node.scrollHeight;
		node.style.height = `${h}px`;
		node.style.opacity = '1';
		// reflow
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		node.offsetHeight;
	};

	const onExiting = () => {
		const node = nodeRef.current;
		if (!node) return;
		node.style.height = '0px';
		node.style.opacity = '0';
	};

	return (
		<CSSTransition
			in={inProp}
			timeout={{ enter: durationEnter, exit: durationExit }}
			unmountOnExit
			nodeRef={nodeRef}
			onEnter={onEnter}
			onEntering={onEntering}
			onEntered={onEntered}
			onExit={onExit}
			onExiting={onExiting}
		>
			<div
				ref={nodeRef}
				className={`${styles.collapse} ${className}`}
				style={{
					transition: `height ${durationEnter}ms ${ease}, opacity ${durationEnter}ms ${ease}`,
					willChange: 'height, opacity',
					overflow: 'hidden',
				}}
			>
				{children}
			</div>
		</CSSTransition>
	);
}

export default function SidebarFilters({ onCloseDrawer }: Props = {}) {
	const {
		openSections,
		activeSection,
		navigateToSection,
		toggleSection,
		adjuntosTotalCount,
		adjuntosRecientesCount,
	} = useBedDetail();
	const router = useRouter();
	const { puedeSubmodulo, puede, rol, loaded } = usePermiso();

	const clickItem = (section: typeof activeSection) => {
		navigateToSection(section);
		onCloseDrawer?.();
	};

	const isActive = (section: string) => activeSection === section;

	/**
	 * Visibilidad de un item DENTRO de su grupo.
	 * Un item se muestra si el usuario tiene CUALQUIER acción sobre el submódulo.
	 */
	const puedeVerSeccion = useMemo(
		() => (section: string) => {
			if (!loaded) return true;
			const sub = SECTION_TO_PERM[section];
			if (!sub) return true;
			if (!rol) return false;
			return puedeSubmodulo('INTERNACION', sub);
		},
		[puedeSubmodulo, rol, loaded],
	);

	/**
	 * Visibilidad del GRUPO entero.
	 *
	 * Un grupo se muestra si el usuario puede ESCRIBIR (CREAR/EDITAR) en al
	 * menos una de sus secciones propietarias. Así:
	 *   - El enfermero ve SOLO "Gestión Enfermería" (puede crear evoluciones
	 *     de enfermería, controles, etc.) y NO "Gestión Médica" (no puede
	 *     crear HC, evoluciones médicas, etc.).
	 *   - El médico ve SOLO "Gestión Médica" y NO "Gestión Enfermería".
	 *   - ADMIN ve ambas.
	 */
	const puedeGestionMedica = !loaded
		? true
		: puede('INTERNACION.HISTORIA_CLINICA.CREAR') ||
		  puede('INTERNACION.EVOLUCIONES.CREAR') ||
		  puede('INTERNACION.INDICACIONES.CREAR');

	const puedeGestionEnfermeria = !loaded
		? true
		: puede('INTERNACION.EVOLUCION_ENFERMERIA.CREAR') ||
		  puede('INTERNACION.SIGNOS_VITALES.CREAR') ||
		  puede('INTERNACION.MEDICACION.CREAR');

	return (
		<div className={styles.wrapper}>
			{/* ======= Gestión Médica ======= */}
			{puedeGestionMedica && (
			<div className={styles.section}>
				<button
					type='button'
					className={`${styles.summary} ${openSections.medica ? styles.summaryOpen : ''
						}`}
					onClick={() => toggleSection('medica', openSections.medica)}
					aria-expanded={openSections.medica}
					aria-controls='panel-medica'
				>
					<span>Gestión Médica</span>
					<span
						className={`${styles.chevron} ${openSections.medica ? styles.chevronOpen : ''
							}`}
						aria-hidden
					/>
				</button>

				<Collapse
					in={openSections.medica}
					durationEnter={560}
					durationExit={560} // un poco más lenta para que se note
					ease='cubic-bezier(0.25, 0.8, 0.25, 1)'
					className={styles.collapseBody}
				>
					<nav id='panel-medica' className={styles.nav}>
						{puedeVerSeccion('hcIngreso') && (
						<button
							className={`${styles.navButton} ${isActive('hcIngreso') ? styles.active : ''
								}`}
							onClick={() => clickItem('hcIngreso')}
						>
							H.C. de Ingreso
						</button>)}
						{puedeVerSeccion('indicaciones') && (
						<button
							className={`${styles.navButton} ${isActive('indicaciones') ? styles.active : ''
								}`}
							onClick={() => clickItem('indicaciones')}
						>
							Indicaciones
						</button>)}
						{puedeVerSeccion('evoluciones') && (
						<button
							className={`${styles.navButton} ${isActive('evoluciones') ? styles.active : ''
								}`}
							onClick={() => clickItem('evoluciones')}
						>
							Evoluciones
						</button>)}
						{puedeVerSeccion('solicitudEstudios') && (
						<button
							className={`${styles.navButton} ${isActive('solicitudEstudios') ? styles.active : ''
								}`}
							onClick={() => clickItem('solicitudEstudios')}
						>
							Estudios
						</button>)}
						{puedeVerSeccion('protocolos') && (
						<button
							className={`${styles.navButton} ${isActive('protocolos') ? styles.active : ''
								}`}
							onClick={() => clickItem('protocolos')}
						>
							Protocolos
						</button>)}
						{puedeVerSeccion('procedimientos') && (
						<button
							className={`${styles.navButton} ${isActive('procedimientos') ? styles.active : ''
								}`}
							onClick={() => clickItem('procedimientos')}
						>
							Procedimientos
						</button>)}
						{puedeVerSeccion('movimientos') && (
						<button
							className={`${styles.navButton} ${isActive('movimientos') ? styles.active : ''
								}`}
							onClick={() => clickItem('movimientos')}
						>
							Movimientos
						</button>)}
					</nav>
				</Collapse>
			</div>
			)}

			{/* ======= Gestión Enfermería ======= */}
			{puedeGestionEnfermeria && (
			<div className={styles.section}>
				<button
					type='button'
					className={`${styles.summary} ${openSections.enfermeria ? styles.summaryOpen : ''
						}`}
					onClick={() => toggleSection('enfermeria', openSections.enfermeria)}
					aria-expanded={openSections.enfermeria}
					aria-controls='panel-enfermeria'
				>
					<span>Gestión Enfermería</span>
					<span
						className={`${styles.chevron} ${openSections.enfermeria ? styles.chevronOpen : ''
							}`}
						aria-hidden
					/>
				</button>

				<Collapse
					in={openSections.enfermeria}
					durationEnter={560}
					durationExit={560}
					ease='cubic-bezier(0.25, 0.8, 0.25, 1)'
					className={styles.collapseBody}
				>
					<nav id='panel-enfermeria' className={styles.nav}>
						{puedeVerSeccion('indicaciones') && (
						<button
							className={`${styles.navButton} ${isActive('indicaciones') ? styles.active : ''
								}`}
							onClick={() => clickItem('indicaciones')}
						>
							Indicaciones
						</button>)}

						{puedeVerSeccion('controles-frecuentes') && (
						<button
							className={`${styles.navButton} ${isActive('controles-frecuentes') ? styles.active : ''
								}`}
							onClick={() => clickItem('controles-frecuentes')}
						>
							Controles
						</button>)}

						{puedeVerSeccion('medicacion-suministrada') && (
						<button
							className={`${styles.navButton} ${isActive('medicacion-suministrada') ? styles.active : ''
								}`}
							onClick={() => clickItem('medicacion-suministrada')}
						>
							Medicación Suministrada
						</button>)}

						{puedeVerSeccion('dieta') && (
						<button
							className={`${styles.navButton} ${isActive('dieta') ? styles.active : ''
								}`}
							onClick={() => clickItem('dieta')}
						>
							Dietas
						</button>)}

						{puedeVerSeccion('balance-hidrico') && (
						<button
							className={`${styles.navButton} ${isActive('balance-hidrico') ? styles.active : ''
								}`}
							onClick={() => clickItem('balance-hidrico')}
						>
							Balance Hídrico
						</button>)}

						{puedeVerSeccion('evolucion-enfermeria') && (
						<button
							className={`${styles.navButton} ${isActive('evolucion-enfermeria') ? styles.active : ''
								}`}
							onClick={() => clickItem('evolucion-enfermeria')}
						>
							Evolución de Enfermería
						</button>)}

						{puedeVerSeccion('insumos') && (
						<button
							className={`${styles.navButton} ${isActive('insumos') ? styles.active : ''
								}`}
							onClick={() => clickItem('insumos')}
						>
							Insumos
						</button>)}

						{puedeVerSeccion('movimientos') && (
						<button
							className={`${styles.navButton} ${isActive('movimientos') ? styles.active : ''
								}`}
							onClick={() => clickItem('movimientos')}
						>
							Movimientos
						</button>)}
					</nav>
				</Collapse>
			</div>
			)}

			{/* ======= Panel fijo ======= */}
			<div className={styles.fixedPanel}>
				<div className={styles.panelHeader}>
					<span>Otras Funciones</span>
				</div>
				<nav className={styles.fixedNav}>
					<button
						className={`${styles.navButton} ${isActive('informe_evo') ? styles.active : ''
							}`}
						onClick={() => clickItem('informe_evo')}
					>
						Informe de Evolución
					</button>
					<button
						type="button"
						className={styles.navButton}
						onClick={() => window.dispatchEvent(new Event('imedic:notifications-open'))}
					>
						Notificaciones
					</button>
					{puedeVerSeccion('laboratorios') && (
					<button
						className={`${styles.navButton} ${isActive('laboratorios') ? styles.active : ''
							}`}
						onClick={() => clickItem('laboratorios')}
					>
						Laboratorios
					</button>)}
					{puedeVerSeccion('adjuntos') && (
					<button
						className={`${styles.navButton} ${adjuntosTotalCount > 0 ? styles.navButtonFlex : ''} ${isActive('adjuntos') ? styles.active : ''
							} ${!isActive('adjuntos') && adjuntosRecientesCount > 0 ? styles.navButtonAdjuntosRecientes : ''
							}`}
						onClick={() => clickItem('adjuntos')}
						type="button"
					>
						<span className={styles.adjuntosNavLabel}>Archivos Adjuntos</span>
						{adjuntosTotalCount > 0 && (
							<span
								className={styles.adjuntosMenuBadge}
								aria-label={`${adjuntosTotalCount} archivo(s) en la visita`}
							>
								{adjuntosTotalCount}
							</span>
						)}
					</button>)}
					<button
						className={styles.closeButton}
						onClick={() => router.replace('/dashboard/beds')}
					>
						Cerrar
					</button>
				</nav>
			</div>
		</div>
	);
}
