'use client';
import styles from './SidebarFilters.module.css';
import { useIndicacionesFilters } from '../hooks/useIndicacionesFilters';

type Props = {
	onChange: (section: ReturnType<typeof useIndicacionesFilters>['active']) => void;
};
export default function SidebarFilters({ onChange }: Props) {
	const { open, setOpen, active, setActive } = useIndicacionesFilters();

	const clickItem = (key: typeof active) => {
		setActive(key);
		onChange(key);
	};

	return (
		<div className={styles.wrapper}>
			<details
				open={open.medica}
				onToggle={(e) =>
					setOpen((o) => ({ ...o, medica: (e.target as HTMLDetailsElement).open }))
				}
			>
				<summary>Gestión Médica</summary>
				<nav>
					<button
						className={active === 'hcIngreso' ? styles.active : ''}
						onClick={() => clickItem('hcIngreso')}
					>
						H.C. de Ingreso
					</button>
					<button
						className={active === 'indicaciones' ? styles.active : ''}
						onClick={() => clickItem('indicaciones')}
					>
						Indicaciones
					</button>
					<button
						className={active === 'evoluciones' ? styles.active : ''}
						onClick={() => clickItem('evoluciones')}
					>
						Evoluciones
					</button>
					<button
						className={active === 'solicitudEstudios' ? styles.active : ''}
						onClick={() => clickItem('solicitudEstudios')}
					>
						Solicitud de Estudios
					</button>
					<button
						className={active === 'protocolos' ? styles.active : ''}
						onClick={() => clickItem('protocolos')}
					>
						Protocolos
					</button>
					<button
						className={active === 'epicrisis' ? styles.active : ''}
						onClick={() => clickItem('epicrisis')}
					>
						Epicrisis
					</button>
					<button
						className={active === 'procedimientos' ? styles.active : ''}
						onClick={() => clickItem('procedimientos')}
					>
						Procedimientos
					</button>
					<button
						className={active === 'movimientos' ? styles.active : ''}
						onClick={() => clickItem('movimientos')}
					>
						Movimientos
					</button>
				</nav>
			</details>

			<details
				open={open.enfermeria}
				onToggle={(e) =>
					setOpen((o) => ({
						...o,
						enfermeria: (e.target as HTMLDetailsElement).open,
					}))
				}
			>
				<summary>Gestión Enfermería</summary>
				<nav>
					<button onClick={() => clickItem('indicaciones')}>Indicaciones</button>
				</nav>
			</details>

			<details
				open={open.otras}
				onToggle={(e) =>
					setOpen((o) => ({ ...o, otras: (e.target as HTMLDetailsElement).open }))
				}
			>
				<summary>Otras Funciones</summary>
				<nav>
					<button onClick={() => clickItem('evoluciones')}>
						Informe de Evolución
					</button>
					<button onClick={() => clickItem('movimientos')}>Archivos Adjuntos</button>
				</nav>
			</details>
		</div>
	);
}
