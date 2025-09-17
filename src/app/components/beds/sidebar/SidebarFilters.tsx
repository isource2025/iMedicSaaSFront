'use client';
import { useRouter } from 'next/navigation';
import styles from './SidebarFilters.module.css';
import { useBedDetail } from '../contexts/BedDetailContext';

type Props = {
	bedId?: string; // Opcional ya que no se usa para navegación
};
export default function SidebarFilters({ bedId }: Props = {}) {
	const { openSections, activeSection, navigateToSection, toggleSection } = useBedDetail();
	const router = useRouter();

	const clickItem = (section: typeof activeSection) => {
		navigateToSection(section);
		// Solo cambia la sección activa, sin navegación
	};

	const isActive = (section: string) => activeSection === section;

	return (
		<div className={styles.wrapper}>
			<details open={openSections.medica}>
				<summary
					onClick={(e) => {
						e.preventDefault();
						toggleSection('medica', openSections.medica);
					}}
				>
					Gestión Médica
				</summary>
				<nav>
					<button
						className={`${styles.navButton} ${
							isActive('hcIngreso') ? styles.active : ''
						}`}
						onClick={() => clickItem('hcIngreso')}
					>
						H.C. de Ingreso
					</button>
					<button
						className={`${styles.navButton} ${
							isActive('indicaciones') ? styles.active : ''
						}`}
						onClick={() => clickItem('indicaciones')}
					>
						Indicaciones
					</button>
					<button
						className={`${styles.navButton} ${
							isActive('evoluciones') ? styles.active : ''
						}`}
						onClick={() => clickItem('evoluciones')}
					>
						Evoluciones
					</button>
					<button
						className={`${styles.navButton} ${
							isActive('solicitudEstudios') ? styles.active : ''
						}`}
						onClick={() => clickItem('solicitudEstudios')}
					>
						Solicitud de Estudios
					</button>
					<button
						className={`${styles.navButton} ${
							isActive('protocolos') ? styles.active : ''
						}`}
						onClick={() => clickItem('protocolos')}
					>
						Protocolos
					</button>
					<button
						className={`${styles.navButton} ${
							isActive('procedimientos') ? styles.active : ''
						}`}
						onClick={() => clickItem('procedimientos')}
					>
						Procedimientos
					</button>
					<button
						className={`${styles.navButton} ${
							isActive('movimientos') ? styles.active : ''
						}`}
						onClick={() => clickItem('movimientos')}
					>
						Movimientos
					</button>
				</nav>
			</details>

			<details open={openSections.enfermeria}>
				<summary
					onClick={(e) => {
						e.preventDefault();
						toggleSection('enfermeria', openSections.enfermeria);
					}}
				>
					Gestión Enfermería
				</summary>
				<nav></nav>
			</details>

			<div className={styles.fixedPanel}>
				<div className={styles.panelHeader}>
					<span>Otras Funciones</span>
				</div>
				<nav>
					<button
						className={`${styles.navButton} ${
							isActive('informe_evo') ? styles.active : ''
						}`}
						onClick={() => clickItem('informe_evo')}
					>
						Informe de Evolución
					</button>
					<button
						className={`${styles.navButton} ${
							isActive('adjuntos') ? styles.active : ''
						}`}
						onClick={() => clickItem('adjuntos')}
					>
						Archivos Adjuntos
					</button>
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
